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

export default function MobileRechargeScreen({ onBack }) {
  const [step, setStep] = useState(1) // 1: Select Operator, 2: Enter Phone Number, 3: Enter Amount, 4: Enter PIN
  const [selectedOperator, setSelectedOperator] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
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

  const operators = [
    { id: 'grameenphone', label: 'GP', shortLabel: 'GP', icon: '/icons/gp.png', prefixes: ['017', '013'] },
    { id: 'robi', label: 'Robi', shortLabel: 'Robi', icon: '/icons/robi.png', prefixes: ['018', '016'] },
    { id: 'banglalink', label: 'Banglalink', shortLabel: 'BL', icon: '/icons/banglalink.png', prefixes: ['019', '014'] },
    { id: 'teletalk', label: 'Teletalk', shortLabel: 'TT', icon: '/icons/teletalk.png', prefixes: ['015'] },
  ]

  const handleOperatorSelect = (operatorId) => {
    setSelectedOperator(operatorId)
    setStep(2)
    setError('')
  }

  const handlePhoneNext = () => {
    const cleanedPhone = phoneNumber.replace(/\D/g, '')
    
    // Validate Bangladesh phone number (11 digits starting with 01)
    if (cleanedPhone.length !== 11 || !cleanedPhone.startsWith('01')) {
      setError('Please enter a valid 11-digit Bangladesh mobile number (starting with 01)')
      return
    }
    
    // Validate operator-specific prefix
    if (selectedOperator) {
      const selectedOperatorData = operators.find(op => op.id === selectedOperator)
      if (selectedOperatorData && selectedOperatorData.prefixes) {
        const phonePrefix = cleanedPhone.substring(0, 3)
        if (!selectedOperatorData.prefixes.includes(phonePrefix)) {
          const prefixList = selectedOperatorData.prefixes.join(', ')
          setError(`Phone number must start with ${prefixList} for ${selectedOperatorData.label}`)
          return
        }
      }
    }
    
    setStep(3)
    setError('')
  }

  const handleAmountNext = () => {
    const rechargeAmount = parseInt(amount, 10)
    if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }
    
    // Minimum recharge amount is 50
    if (rechargeAmount < 50) {
      setError('Minimum recharge amount is 50')
      return
    }
    
    // Check if amount is a whole number
    if (rechargeAmount !== parseFloat(amount)) {
      setError('Amount must be a whole number')
      return
    }
    
    setStep(4)
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
      const cleanedPhone = phoneNumber.replace(/\D/g, '')
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'mobile_recharge',
          mfs_service: selectedOperator,
          phone: cleanedPhone, // Store phone number in phone field
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
      localStorage.setItem('transactionSuccess', 'Mobile recharge request submitted successfully!')
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
      // Reset to initial step (step 1) from any step
      setStep(1)
      setSelectedOperator('')
      setPhoneNumber('')
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
        return 'Select Operator'
      case 2:
        return 'Enter Phone Number'
      case 3:
        return 'Enter Amount'
      case 4:
        return 'Enter PIN'
      default:
        return 'Mobile Recharge'
    }
  }

  const getSelectedOperatorLabel = () => {
    const operator = operators.find(op => op.id === selectedOperator)
    return operator ? operator.label : ''
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

        {/* Step 1: Select Operator */}
        {step === 1 && (
          <div className="mfs-selection">
            <p className="step-description">Choose your mobile operator</p>
            <div className="mfs-grid">
              {operators.map((operator) => (
                <button
                  key={operator.id}
                  className={`mfs-card ${selectedOperator === operator.id ? 'selected' : ''}`}
                  onClick={() => handleOperatorSelect(operator.id)}
                >
                  <img src={operator.icon} alt={operator.label} className="mfs-icon-img" />
                  <span className="mfs-label">{operator.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Enter Phone Number */}
        {step === 2 && (
          <div className="amount-input-section">
            {/* Show selected Operator */}
            {selectedOperator && (() => {
              const selectedOperatorData = operators.find(op => op.id === selectedOperator)
              return selectedOperatorData ? (
                <div className="selected-mfs-display" style={{ marginBottom: '24px' }}>
                  <img src={selectedOperatorData.icon} alt={selectedOperatorData.label} className="selected-mfs-icon" />
                  <span className="selected-mfs-label">{selectedOperatorData.label}</span>
                </div>
              ) : null
            })()}
            <p className="step-description">Enter the mobile number to recharge</p>
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
                {selectedOperator ? (() => {
                  const selectedOperatorData = operators.find(op => op.id === selectedOperator)
                  if (selectedOperatorData && selectedOperatorData.prefixes) {
                    const prefixList = selectedOperatorData.prefixes.join(', ')
                    return `Enter 11-digit ${selectedOperatorData.label} number (starting with ${prefixList})`
                  }
                  return 'Enter 11-digit Bangladesh mobile number'
                })() : 'Enter 11-digit Bangladesh mobile number'}
              </small>
            </div>
            <button className="btn-primary" onClick={handlePhoneNext}>
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Enter Amount */}
        {step === 3 && (
          <div className="amount-input-section">
            {/* Show selected Operator and Phone Number at the top */}
            {selectedOperator && phoneNumber && (() => {
              const selectedOperatorData = operators.find(op => op.id === selectedOperator)
              return selectedOperatorData ? (
                <div style={{ 
                  background: 'var(--card-bg)', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  marginBottom: '24px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <img src={selectedOperatorData.icon} alt={selectedOperatorData.label} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Operator</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{selectedOperatorData.label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                    <FontAwesomeIcon icon={faPhone} style={{ color: 'var(--text-secondary)', fontSize: '16px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>Phone Number</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{phoneNumber.replace(/\D/g, '')}</div>
                    </div>
                  </div>
                </div>
              ) : null
            })()}
            <p className="step-description">Enter recharge amount</p>
            <div className="form-group">
              <label className="form-label">Amount ({userCurrency})</label>
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
                min="50"
                step="1"
                required
                autoFocus
              />
              <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Minimum recharge amount is 50 {userCurrency}
              </small>
            </div>
            <button className="btn-primary" onClick={handleAmountNext}>
              Continue
            </button>
          </div>
        )}

        {/* Step 4: Enter PIN */}
        {step === 4 && (
          <div className="pin-input-section">
            <div className="pin-header">
              <FontAwesomeIcon icon={faLock} className="pin-icon" />
              <p className="step-description">Enter your 4-digit PIN</p>
            </div>
            <div style={{ 
              background: 'var(--card-bg)', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '24px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Operator:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{getSelectedOperatorLabel()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Phone:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{phoneNumber.replace(/\D/g, '')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Amount:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{parseInt(amount, 10) || 0} {userCurrency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Commission (2.5%):</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{((parseInt(amount, 10) || 0) * 0.025).toFixed(2)} {userCurrency}</span>
              </div>
            </div>
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
                  Confirm Recharge
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

