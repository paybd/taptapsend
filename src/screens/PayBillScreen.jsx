import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faBolt,
  faFire,
  faDroplet,
  faWifi,
  faTv,
  faCheckCircle,
  faSpinner,
  faLock,
  faIdCard
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import '../index.css'

export default function PayBillScreen({ onBack }) {
  const [step, setStep] = useState(1) // 1: Select Bill Type, 2: Select Provider, 3: Enter Account Number, 4: Enter Amount, 5: Enter PIN
  const [selectedBillType, setSelectedBillType] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
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

  const billTypes = [
    { id: 'electricity', label: 'Electricity', icon: faBolt },
    { id: 'gas', label: 'Gas', icon: faFire },
    { id: 'water', label: 'Water', icon: faDroplet },
    { id: 'internet', label: 'Internet', icon: faWifi },
    { id: 'tv', label: 'TV/Cable', icon: faTv },
  ]

  const providers = {
    electricity: [
      { id: 'desco', label: 'DESCO' },
      { id: 'dpdc', label: 'DPDC' },
      { id: 'breb', label: 'BREB' },
      { id: 'west-zone', label: 'West Zone Power' },
      { id: 'north-zone', label: 'North Zone Power' },
    ],
    gas: [
      { id: 'titas', label: 'Titas Gas' },
      { id: 'bakhrabad', label: 'Bakhrabad Gas' },
      { id: 'jalalabad', label: 'Jalalabad Gas' },
      { id: 'pashchimanchal', label: 'Pashchimanchal Gas' },
    ],
    water: [
      { id: 'dwasa', label: 'DWASA' },
      { id: 'cwasa', label: 'CWASA' },
      { id: 'kwasa', label: 'KWASA' },
      { id: 'rwasa', label: 'RWASA' },
    ],
    internet: [
      { id: 'gp', label: 'Grameenphone' },
      { id: 'robi', label: 'Robi' },
      { id: 'banglalink', label: 'Banglalink' },
      { id: 'teletalk', label: 'Teletalk' },
      { id: 'summit', label: 'Summit Communications' },
      { id: 'link3', label: 'Link3' },
    ],
    tv: [
      { id: 'akash', label: 'Akash DTH' },
      { id: 'd2h', label: 'D2H' },
      { id: 'cable', label: 'Cable TV' },
    ],
  }

  const handleBillTypeSelect = (billTypeId) => {
    setSelectedBillType(billTypeId)
    setSelectedProvider('')
    setStep(2)
    setError('')
  }

  const handleProviderSelect = (providerId) => {
    setSelectedProvider(providerId)
    setStep(3)
    setError('')
  }

  const handleAccountNext = () => {
    const cleanedAccount = accountNumber.trim()
    
    if (!cleanedAccount || cleanedAccount.length < 3) {
      setError('Please enter a valid account number')
      return
    }
    
    setStep(4)
    setError('')
  }

  const handleAmountNext = () => {
    const billAmount = parseFloat(amount)
    if (isNaN(billAmount) || billAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }
    
    // Minimum bill amount is typically 100 BDT
    if (billAmount < 100) {
      setError('Minimum bill amount is 100 BDT')
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

      // Get provider label
      const providerList = providers[selectedBillType] || []
      const provider = providerList.find(p => p.id === selectedProvider)
      const providerLabel = provider ? provider.label : selectedProvider

      // Balance updated, create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'pay_bill',
          mfs_service: selectedBillType, // Store bill type in mfs_service field
          account_type: providerLabel, // Store provider in account_type field
          bank_name: accountNumber.trim(), // Store account number in bank_name field
          amount: transactionAmount,
          commission: commission,
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

      setSuccess(true)
      
      // Navigate to home screen after 2 seconds
      setTimeout(() => {
        onBack()
      }, 2000)
    } catch (error) {
      console.error('Error processing transaction:', error)
      setError(error.message || 'Failed to process transaction. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      if (step === 2) {
        // If on provider selection, go back to bill type selection
        setSelectedBillType('')
        setSelectedProvider('')
      } else if (step === 3) {
        // If on account number, go back to provider selection
        setSelectedProvider('')
        setAccountNumber('')
      } else if (step === 4) {
        // If on amount, go back to account number
        setAmount('')
      } else if (step === 5) {
        // If on PIN, go back to amount
        setPin(['', '', '', ''])
      }
      setStep(step - 1)
      setError('')
    } else {
      onBack()
    }
  }

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Select Bill Type'
      case 2:
        return 'Select Provider'
      case 3:
        return 'Enter Account Number'
      case 4:
        return 'Enter Amount'
      case 5:
        return 'Enter PIN'
      default:
        return 'Pay Bill'
    }
  }

  const getSelectedBillTypeLabel = () => {
    const billType = billTypes.find(bt => bt.id === selectedBillType)
    return billType ? billType.label : ''
  }

  const getSelectedProviderLabel = () => {
    if (!selectedBillType || !selectedProvider) return ''
    const providerList = providers[selectedBillType] || []
    const provider = providerList.find(p => p.id === selectedProvider)
    return provider ? provider.label : ''
  }

  return (
    <div className="deposit-screen">
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
        {error && (
          <div className="error-message-box">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message-box">
            Bill payment request submitted successfully!
          </div>
        )}

        {/* Step 1: Select Bill Type */}
        {step === 1 && (
          <div className="mfs-selection">
            <p className="step-description">Choose the type of bill you want to pay</p>
            <div className="mfs-grid">
              {billTypes.map((billType) => (
                <button
                  key={billType.id}
                  className={`mfs-card ${selectedBillType === billType.id ? 'selected' : ''}`}
                  onClick={() => handleBillTypeSelect(billType.id)}
                >
                  <FontAwesomeIcon icon={billType.icon} className="mfs-icon" />
                  <span className="mfs-label">{billType.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Provider */}
        {step === 2 && (
          <div className="mfs-selection">
            <p className="step-description">Select your {getSelectedBillTypeLabel().toLowerCase()} provider</p>
            <div className="mfs-grid">
              {providers[selectedBillType]?.map((provider) => (
                <button
                  key={provider.id}
                  className={`mfs-card ${selectedProvider === provider.id ? 'selected' : ''}`}
                  onClick={() => handleProviderSelect(provider.id)}
                >
                  <span className="mfs-label">{provider.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Enter Account Number */}
        {step === 3 && (
          <div className="amount-input-section">
            <p className="step-description">Enter your account/customer number</p>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FontAwesomeIcon icon={faIdCard} style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value)
                    setError('')
                  }}
                  required
                  autoFocus
                />
              </div>
              <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                {getSelectedBillTypeLabel()} - {getSelectedProviderLabel()}
              </small>
            </div>
            <button className="btn-primary" onClick={handleAccountNext}>
              Continue
            </button>
          </div>
        )}

        {/* Step 4: Enter Amount */}
        {step === 4 && (
          <div className="amount-input-section">
            <p className="step-description">Enter bill amount</p>
            <div style={{ 
              background: 'var(--card-bg)', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '16px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Bill Type
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {getSelectedBillTypeLabel()}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '12px', marginBottom: '4px' }}>
                Provider
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {getSelectedProviderLabel()}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '12px', marginBottom: '4px' }}>
                Account Number
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {accountNumber.trim()}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Amount ({userCurrency})</label>
              <input
                type="number"
                className="form-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setError('')
                }}
                min="100"
                step="0.01"
                required
                autoFocus
              />
              <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Minimum bill amount is 100 {userCurrency}
              </small>
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
            <div style={{ 
              background: 'var(--card-bg)', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '24px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Bill Type:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{getSelectedBillTypeLabel()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Provider:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{getSelectedProviderLabel()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Account:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{accountNumber.trim()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Amount:</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{parseFloat(amount).toFixed(2)} {userCurrency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Commission (2.5%):</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{(parseFloat(amount) * 0.025).toFixed(2)} {userCurrency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>Total:</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)' }}>{(parseFloat(amount) * 1.025).toFixed(2)} {userCurrency}</span>
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
                  Confirm Payment
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

