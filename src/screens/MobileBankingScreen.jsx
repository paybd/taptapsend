import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faMobileScreenButton,
  faCheckCircle,
  faSpinner,
  faLock
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import '../index.css'

export default function MobileBankingScreen({ onBack }) {
  const [step, setStep] = useState(1) // 1: Select MFS, 2: Select Account Type, 3: Enter Amount, 4: Enter PIN
  const [selectedMfs, setSelectedMfs] = useState('')
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
    { id: 'bkash', label: 'bKash', icon: faMobileScreenButton },
    { id: 'nagad', label: 'Nagad', icon: faMobileScreenButton },
    { id: 'rocket', label: 'Rocket', icon: faMobileScreenButton },
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

  const handleAccountTypeSelect = (accountType) => {
    setSelectedAccountType(accountType)
    setStep(3)
    setError('')
  }

  const handleAmountNext = () => {
    const depositAmount = parseFloat(amount)
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError('Please enter a valid amount')
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
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'mobile_banking',
          mfs_service: selectedMfs,
          account_type: selectedAccountType,
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
        return 'Select MFS Service'
      case 2:
        return 'Select Account Type'
      case 3:
        return 'Enter Amount'
      case 4:
        return 'Enter PIN'
      default:
        return 'Mobile Banking'
    }
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
            Transaction completed successfully!
          </div>
        )}

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
                  <FontAwesomeIcon icon={mfs.icon} className="mfs-icon" />
                  <span className="mfs-label">{mfs.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Account Type */}
        {step === 2 && (
          <div className="account-type-selection">
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

        {/* Step 3: Enter Amount */}
        {step === 3 && (
          <div className="amount-input-section">
            <p className="step-description">Enter the amount</p>
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
                min="1"
                step="0.01"
                required
                autoFocus
              />
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

