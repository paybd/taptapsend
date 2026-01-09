import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faCheckCircle,
  faSpinner,
  faLock,
  faPhone
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import Toast from '../components/Toast'
import '../index.css'

export default function MobileBankingScreen({ onBack }) {
  const [step, setStep] = useState(1) // 1: Select MFS, 2: Enter Phone, 3: Select Account Type, 4: Enter Amount, 5: Enter PIN
  const [selectedMfs, setSelectedMfs] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [selectedAccountType, setSelectedAccountType] = useState('')
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState(['', '', '', ''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userCurrency, setUserCurrency] = useState('BDT')

  useEffect(() => {
    loadUserCurrency()
  }, [])

  const loadUserCurrency = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', user.id)
        .single()

      if (profileData && profileData.country_code) {
        // Import currency mapping dynamically
        const { getCurrencyForCountry } = await import('../lib/currencyMapping')
        setUserCurrency(getCurrencyForCountry(profileData.country_code))
      }
    } catch (error) {
      console.error('Error loading user currency:', error)
    }
  }

  const mfsServices = [
    { id: 'bkash', label: 'bKash', icon: '/icons/bkash.png' },
    { id: 'nagad', label: 'Nagad', icon: '/icons/nagad.png' },
    { id: 'rocket', label: 'Rocket', icon: '/icons/rocket.png' },
    { id: 'mcash', label: 'mCash', icon: '/icons/mkash.png' },
    { id: 'ucash', label: 'UCash', icon: '/icons/ucash.png' },
    { id: 'surecash', label: 'SureCash', icon: '/icons/surecash.jpg' },
  ]

  const accountTypes = [
    { id: 'agent', label: 'Agent' },
    { id: 'personal', label: 'Personal' },
  ]

  const handleMfsSelect = (mfsId) => {
    setSelectedMfs(mfsId)
    setStep(2)
    setError('')
  }

  const handlePhoneNext = () => {
    const cleanedPhone = phoneNumber.replace(/\D/g, '')
    if (!cleanedPhone || cleanedPhone.length !== 11) {
      setError('Please enter a valid 11-digit phone number')
      return
    }
    setPhoneNumber(cleanedPhone)
    setStep(3)
    setError('')
  }

  const handleAccountTypeSelect = (accountType) => {
    setSelectedAccountType(accountType)
    setStep(4)
    setError('')
  }

  const handleAmountNext = () => {
    const depositAmount = parseInt(amount, 10)
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (depositAmount < 200) {
      setError('Minimum amount is 200')
      return
    }
    if (depositAmount !== parseFloat(amount)) {
      setError('Amount must be a whole number')
      return
    }
    setStep(5)
    setError('')
  }

  const handlePinChange = (index, value) => {
    if (value.length > 1) return
    
    const newPin = [...pin]
    newPin[index] = value.replace(/\D/g, '') // Only allow digits
    setPin(newPin)
    setError('')

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handlePinPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 4).replace(/\D/g, '')
    const newPin = ['', '', '', '']
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 4) {
        newPin[i] = pastedData[i]
      }
    }
    setPin(newPin)
  }

  const handleSubmit = async () => {
    const pinValue = pin.join('')
    
    if (pinValue.length !== 4) {
      setError('Please enter the complete 4-digit PIN')
      return
    }

    if (!/^\d{4}$/.test(pinValue)) {
      setError('PIN must contain only numbers')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get user's PIN from profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('password')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error('Failed to fetch user PIN')
      }

      // Verify PIN
      if (profileData.password !== pinValue) {
        setError('Invalid PIN. Please try again.')
        setIsSubmitting(false)
        return
      }

      // PIN matches, check and deduct balance
      const transactionAmount = parseFloat(amount)
      
      // Get current balance
      const { data: balanceData, error: balanceError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single()

      if (balanceError) {
        throw new Error('Failed to fetch user balance')
      }

      const currentBalance = parseFloat(balanceData.balance) || 0

      // Calculate 2.5% commission
      const commission = transactionAmount * 0.025
      const totalDeduction = transactionAmount + commission

      // Check if balance is sufficient (including commission)
      if (currentBalance < totalDeduction) {
        setError(`Insufficient balance. Your current balance is ${currentBalance.toFixed(2)} ${userCurrency}. Total required: ${totalDeduction.toFixed(2)} ${userCurrency} (including ${commission.toFixed(2)} ${userCurrency} commission)`)
        setIsSubmitting(false)
        return
      }

      // Calculate new balance (deduct amount + commission)
      const newBalance = currentBalance - totalDeduction

      // Update user balance
      const { error: updateBalanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id)

      if (updateBalanceError) {
        throw new Error('Failed to update balance')
      }

      // Balance updated, create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'mobile_banking',
          mfs_service: selectedMfs,
          account_type: selectedAccountType,
          recipient_account_number: phoneNumber,
          amount: transactionAmount,
          commission: Math.round(commission), // Store commission as integer
          status: 'pending'
        })

      if (transactionError) {
        // If transaction creation fails, revert balance update
        await supabase
          .from('profiles')
          .update({ balance: currentBalance })
          .eq('id', user.id)
        throw new Error(`Failed to create transaction: ${transactionError.message}`)
      }

      // Store success message in localStorage and navigate immediately
      localStorage.setItem('transactionSuccess', 'Transaction request submitted successfully!')
      onBack()
    } catch (error) {
      console.error('Error processing transaction:', error)
      setError(error.message || 'Failed to process transaction. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      // Reset to initial step (step 1)
      setStep(1)
      setSelectedMfs('')
      setPhoneNumber('')
      setSelectedAccountType('')
      setAmount('')
      setPin(['', '', '', ''])
      setError('')
    } else {
      onBack()
    }
  }

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Select MFS Service'
      case 2:
        return 'Enter Phone Number'
      case 3:
        return 'Select Account Type'
      case 4:
        return 'Enter Amount'
      case 5:
        return 'Enter PIN'
      default:
        return 'Mobile Banking'
    }
  }

  return (
    <div className="deposit-screen">
      {/* Full Screen Loader */}
      {isSubmitting && (
        <div className="full-screen-loader">
          <div className="loader-spinner"></div>
          <div className="loader-text">Processing your request...</div>
        </div>
      )}

      {/* Header */}
      <div className="deposit-header">
        <button className="back-btn" onClick={handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="deposit-title">{getStepTitle()}</h1>
        <div style={{ width: '40px' }}></div>
      </div>

      {/* Content */}
      <div className="deposit-content">
        <Toast 
          message={error} 
          type="error" 
          onClose={() => setError('')} 
        />


        {/* Step 1: Select MFS Service */}
        {step === 1 && (
          <div className="mfs-selection">
            <p className="step-description">Choose your mobile financial service</p>
            <div className="mfs-grid">
              {mfsServices.map((mfs) => (
                <button
                  key={mfs.id}
                  className={`mfs-card ${selectedMfs === mfs.id ? 'selected' : ''}`}
                  onClick={() => handleMfsSelect(mfs.id)}
                >
                  <img src={mfs.icon} alt={mfs.label} className="mfs-icon-img" />
                  <span className="mfs-label">{mfs.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Enter Phone Number */}
        {step === 2 && (
          <div className="amount-input-section">
            {/* Show selected MFS */}
            {selectedMfs && (() => {
              const selectedMfsService = mfsServices.find(mfs => mfs.id === selectedMfs)
              return selectedMfsService ? (
                <div className="selected-mfs-display" style={{ marginBottom: '24px' }}>
                  <img src={selectedMfsService.icon} alt={selectedMfsService.label} className="selected-mfs-icon" />
                  <span className="selected-mfs-label">{selectedMfsService.label}</span>
                </div>
              ) : null
            })()}
            <p className="step-description">Enter the mobile number</p>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FontAwesomeIcon icon={faPhone} style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="tel"
                  className="form-input"
                  placeholder="01XXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value)
                    setError('')
                  }}
                  maxLength={11}
                  required
                  autoFocus
                />
              </div>
              <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Enter 11-digit Bangladesh mobile number
              </small>
            </div>
            <button className="btn-primary" onClick={handlePhoneNext}>
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Select Account Type */}
        {step === 3 && (
          <div className="account-type-selection">
            {/* Show selected MFS and Phone Number */}
            {selectedMfs && phoneNumber && (() => {
              const selectedMfsService = mfsServices.find(mfs => mfs.id === selectedMfs)
              return selectedMfsService ? (
                <div style={{ 
                  background: 'var(--card-bg)', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  marginBottom: '24px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <img src={selectedMfsService.icon} alt={selectedMfsService.label} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>MFS Service</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{selectedMfsService.label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                    <FontAwesomeIcon icon={faPhone} style={{ color: 'var(--text-secondary)', fontSize: '16px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Phone Number</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{phoneNumber}</div>
                    </div>
                  </div>
                </div>
              ) : null
            })()}
            <p className="step-description">Select account type</p>
            <div className="account-type-grid">
              {accountTypes.map((type) => (
                <button
                  key={type.id}
                  className={`account-type-card ${selectedAccountType === type.id ? 'selected' : ''}`}
                  onClick={() => handleAccountTypeSelect(type.id)}
                >
                  <span className="account-type-label">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Enter Amount */}
        {step === 4 && (
          <div className="amount-input-section">
            {/* Show selected MFS, Phone Number, and Account Type */}
            {selectedMfs && phoneNumber && selectedAccountType && (() => {
              const selectedMfsService = mfsServices.find(mfs => mfs.id === selectedMfs)
              const selectedAccountTypeLabel = accountTypes.find(type => type.id === selectedAccountType)?.label
              return selectedMfsService && selectedAccountTypeLabel ? (
                <div style={{ 
                  background: 'var(--card-bg)', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  marginBottom: '24px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <img src={selectedMfsService.icon} alt={selectedMfsService.label} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>MFS Service</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{selectedMfsService.label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', marginBottom: '12px' }}>
                    <FontAwesomeIcon icon={faPhone} style={{ color: 'var(--text-secondary)', fontSize: '16px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Phone Number</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{phoneNumber}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Account Type</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{selectedAccountTypeLabel}</div>
                    </div>
                  </div>
                </div>
              ) : null
            })()}
            <p className="step-description">Enter the amount</p>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow whole numbers
                  if (value === '' || /^\d+$/.test(value)) {
                    setAmount(value)
                    setError('')
                  }
                }}
                min="200"
                step="1"
                required
                autoFocus
              />
            </div>
            <button className="btn-primary" onClick={handleAmountNext}>
              Continue
            </button>
          </div>
        )}

        {/* Step 5: Enter PIN */}
        {step === 5 && (
          <div className="pin-input-section">
            <div className="pin-header">
              <FontAwesomeIcon icon={faLock} className="pin-icon" />
              <p className="step-description">Enter your 4-digit PIN</p>
            </div>
            {/* Transaction Summary */}
            {selectedMfs && phoneNumber && selectedAccountType && amount && (() => {
              const selectedMfsService = mfsServices.find(mfs => mfs.id === selectedMfs)
              const selectedAccountTypeLabel = accountTypes.find(type => type.id === selectedAccountType)?.label
              const transactionAmount = parseFloat(amount) || 0
              const commission = transactionAmount * 0.025
              
              return selectedMfsService && selectedAccountTypeLabel ? (
                <div style={{ 
                  background: 'var(--card-bg)', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  marginBottom: '24px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <img src={selectedMfsService.icon} alt={selectedMfsService.label} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '2px' }}>MFS Service</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{selectedMfsService.label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Phone:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{phoneNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Account Type:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{selectedAccountTypeLabel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Amount:</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{transactionAmount.toFixed(2)} Tk</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Commission (2.5%):</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{commission.toFixed(2)} Tk</span>
                  </div>
                </div>
              ) : null
            })()}
            <div className="pin-input-container">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  id={`pin-${index}`}
                  type="text"
                  className="pin-input"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  onPaste={handlePinPaste}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus={index === 0}
                />
              ))}
            </div>
            <button 
              className="btn-primary" 
              onClick={handleSubmit}
              disabled={isSubmitting || pin.join('').length !== 4}
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Confirm Transaction
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

