import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faMobileScreenButton,
  faCheckCircle,
  faSpinner,
  faLock,
  faPhone
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
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
    { id: 'grameenphone', label: 'Grameenphone', shortLabel: 'GP' },
    { id: 'robi', label: 'Robi', shortLabel: 'Robi' },
    { id: 'banglalink', label: 'Banglalink', shortLabel: 'BL' },
    { id: 'teletalk', label: 'Teletalk', shortLabel: 'TT' },
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
    
    setStep(3)
    setError('')
  }

  const handleAmountNext = () => {
    const rechargeAmount = parseFloat(amount)
    if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }
    
    // Minimum recharge amount is typically 10 BDT
    if (rechargeAmount < 10) {
      setError('Minimum recharge amount is 10 BDT')
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
          account_type: cleanedPhone, // Store phone number in account_type field
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
      setStep(step - 1)
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
            Recharge request submitted successfully!
          </div>
        )}

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
                  <FontAwesomeIcon icon={faMobileScreenButton} className="mfs-icon" />
                  <span className="mfs-label">{operator.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Enter Phone Number */}
        {step === 2 && (
          <div className="amount-input-section">
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
                Enter 11-digit Bangladesh mobile number
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
            <p className="step-description">Enter recharge amount</p>
            <div style={{ 
              background: 'var(--card-bg)', 
              padding: '16px', 
              borderRadius: '12px', 
              marginBottom: '16px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Operator
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {getSelectedOperatorLabel()}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '12px', marginBottom: '4px' }}>
                Phone Number
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {phoneNumber.replace(/\D/g, '')}
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
                min="10"
                step="0.01"
                required
                autoFocus
              />
              <small style={{ color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                Minimum recharge amount is 10 {userCurrency}
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

