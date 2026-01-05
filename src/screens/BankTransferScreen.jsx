import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faBuildingColumns,
  faCheckCircle,
  faSpinner,
  faLock
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { getCurrencyForCountry } from '../lib/currencyMapping'
import '../index.css'

// List of all Bangladesh banks with bKash support flag
const BANGLADESH_BANKS = [
  // State-Owned Commercial Banks
  { id: 'sonali', name: 'Sonali Bank', code: 'SONALI', supportsBkash: true },
  { id: 'janata', name: 'Janata Bank', code: 'JANATA', supportsBkash: true },
  { id: 'agrani', name: 'Agrani Bank', code: 'AGRANI', supportsBkash: true },
  { id: 'rupali', name: 'Rupali Bank', code: 'RUPALI', supportsBkash: false },
  { id: 'basic', name: 'BASIC Bank', code: 'BASIC', supportsBkash: false },
  { id: 'bdb', name: 'Bangladesh Development Bank', code: 'BDB', supportsBkash: false },
  
  // Private Commercial Banks
  { id: 'brac', name: 'BRAC Bank', code: 'BRAC', supportsBkash: true },
  { id: 'dbbl', name: 'Dutch-Bangla Bank', code: 'DBBL', supportsBkash: true },
  { id: 'city', name: 'City Bank', code: 'CITY', supportsBkash: true },
  { id: 'eastern', name: 'Eastern Bank', code: 'EBL', supportsBkash: true },
  { id: 'prime', name: 'Prime Bank', code: 'PRIME', supportsBkash: true },
  { id: 'mutual', name: 'Mutual Trust Bank', code: 'MTB', supportsBkash: true },
  { id: 'islami', name: 'Islami Bank Bangladesh', code: 'IBBL', supportsBkash: true },
  { id: 'ific', name: 'IFIC Bank', code: 'IFIC', supportsBkash: true },
  { id: 'ucbl', name: 'United Commercial Bank', code: 'UCBL', supportsBkash: true },
  { id: 'pubali', name: 'Pubali Bank', code: 'PUBALI', supportsBkash: true },
  { id: 'uttara', name: 'Uttara Bank', code: 'UTTARA', supportsBkash: false },
  { id: 'dhaka', name: 'Dhaka Bank', code: 'DHAKA', supportsBkash: true },
  { id: 'southeast', name: 'Southeast Bank', code: 'SOUTHEAST', supportsBkash: true },
  { id: 'one', name: 'One Bank', code: 'ONE', supportsBkash: true },
  { id: 'exim', name: 'EXIM Bank', code: 'EXIM', supportsBkash: true },
  { id: 'standard', name: 'Standard Bank', code: 'STANDARD', supportsBkash: false },
  { id: 'premier', name: 'Premier Bank', code: 'PREMIER', supportsBkash: true },
  { id: 'bankasia', name: 'Bank Asia', code: 'BANKASIA', supportsBkash: true },
  { id: 'ncc', name: 'NCC Bank', code: 'NCC', supportsBkash: true },
  { id: 'jamuna', name: 'Jamuna Bank', code: 'JAMUNA', supportsBkash: true },
  { id: 'trust', name: 'Trust Bank', code: 'TRUST', supportsBkash: true },
  { id: 'nrb', name: 'NRB Bank', code: 'NRB', supportsBkash: false },
  { id: 'nrbcommercial', name: 'NRB Commercial Bank', code: 'NRBCOMM', supportsBkash: false },
  { id: 'mercantile', name: 'Mercantile Bank', code: 'MERCANTILE', supportsBkash: true },
  { id: 'modhumoti', name: 'Modhumoti Bank', code: 'MODHUMOTI', supportsBkash: false },
  { id: 'midland', name: 'Midland Bank', code: 'MIDLAND', supportsBkash: false },
  { id: 'meghna', name: 'Meghna Bank', code: 'MEGHNA', supportsBkash: false },
  { id: 'shimanto', name: 'Shimanto Bank', code: 'SHIMANTO', supportsBkash: false },
  { id: 'union', name: 'Union Bank', code: 'UNION', supportsBkash: false },
  { id: 'padma', name: 'Padma Bank', code: 'PADMA', supportsBkash: false },
  { id: 'bengal', name: 'Bengal Commercial Bank', code: 'BENGAL', supportsBkash: false },
  { id: 'citizens', name: 'Citizens Bank', code: 'CITIZENS', supportsBkash: false },
  { id: 'community', name: 'Community Bank Bangladesh', code: 'COMMUNITY', supportsBkash: false },
  { id: 'southbangla', name: 'South Bangla Agriculture and Commerce Bank', code: 'SOUTHBANGLA', supportsBkash: false },
  
  // Islamic Banks
  { id: 'al-arafah', name: 'Al-Arafah Islami Bank', code: 'ALARAFAH', supportsBkash: true },
  { id: 'first-security', name: 'First Security Islami Bank', code: 'FIRSTSECURITY', supportsBkash: true },
  { id: 'shahjalal', name: 'Shahjalal Islami Bank', code: 'SHAHJALAL', supportsBkash: true },
  { id: 'social-islami', name: 'Social Islami Bank', code: 'SOCIALISLAMI', supportsBkash: true },
  { id: 'global-islami', name: 'Global Islami Bank', code: 'GLOBALISLAMI', supportsBkash: false },
  { id: 'icb-islami', name: 'ICB Islamic Bank', code: 'ICBISLAMI', supportsBkash: false },
  
  // Specialized Banks
  { id: 'krishi', name: 'Bangladesh Krishi Bank', code: 'KRISHI', supportsBkash: false },
  { id: 'rajshahi-krishi', name: 'Rajshahi Krishi Unnayan Bank', code: 'RAJSHAHIKRISHI', supportsBkash: false },
  { id: 'probashi', name: 'Probashi Kallyan Bank', code: 'PROBASHI', supportsBkash: false },
  
  // Foreign Banks
  { id: 'hsbc', name: 'HSBC', code: 'HSBC', supportsBkash: false },
  { id: 'standard-chartered', name: 'Standard Chartered Bank', code: 'SCB', supportsBkash: false },
  { id: 'citibank', name: 'Citibank', code: 'CITIBANK', supportsBkash: false },
  { id: 'state-bank-india', name: 'State Bank of India', code: 'SBI', supportsBkash: false },
  { id: 'woori', name: 'Woori Bank', code: 'WOORI', supportsBkash: false },
  { id: 'bank-alfalah', name: 'Bank Al-Falah', code: 'ALFALAH', supportsBkash: false },
  { id: 'habib', name: 'Habib Bank', code: 'HABIB', supportsBkash: false },
  { id: 'national-bank-pakistan', name: 'National Bank of Pakistan', code: 'NBP', supportsBkash: false },
  { id: 'commercial-bank-ceylon', name: 'Commercial Bank of Ceylon', code: 'CBC', supportsBkash: false },
].sort((a, b) => a.name.localeCompare(b.name))

export default function BankTransferScreen({ onBack }) {
  const [step, setStep] = useState(1) // 1: Select Bank, 2: Enter Account Details, 3: Enter Amount, 4: Enter PIN
  const [selectedBankId, setSelectedBankId] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
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
        setUserCurrency(getCurrencyForCountry(profileData.country_code))
      }
    } catch (error) {
      console.error('Error loading user currency:', error)
    }
  }

  const selectedBank = BANGLADESH_BANKS.find(bank => bank.id === selectedBankId)

  const handleBankSelect = (bankId) => {
    setSelectedBankId(bankId)
    setStep(2)
    setError('')
  }

  const handleAccountNext = () => {
    if (!accountNumber.trim()) {
      setError('Please enter recipient account number')
      return
    }
    if (!accountName.trim()) {
      setError('Please enter recipient account name')
      return
    }
    setStep(3)
    setError('')
  }

  const handleAmountNext = () => {
    const transferAmount = parseFloat(amount)
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    // Check minimum transfer amount based on bank's bKash support
    const minimumAmount = selectedBank?.supportsBkash ? 5000 : 25000

    if (transferAmount < minimumAmount) {
      setError(`Minimum transfer amount is ${minimumAmount.toLocaleString()} ${userCurrency} for ${selectedBank?.name || 'this bank'}`)
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
        .select('password, balance')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error('Failed to fetch user information')
      }

      // Verify PIN
      if (profileData.password !== pinValue) {
        setError('Invalid PIN. Please try again.')
        setIsSubmitting(false)
        return
      }

      // PIN matches, check and deduct balance
      const transferAmount = parseFloat(amount)
      
      // Calculate 2.5% commission
      const commission = transferAmount * 0.025
      const totalDeduction = transferAmount + commission
      
      const currentBalance = parseFloat(profileData.balance) || 0

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
          type: 'bank_transfer',
          mfs_service: null,
          account_type: null,
          bank_name: selectedBank.name, // Store bank name
          recipient_account_number: accountNumber.trim(),
          recipient_account_name: accountName.trim(),
          amount: transferAmount,
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
      console.error('Error processing transfer:', error)
      setError(error.message || 'Failed to process transfer. Please try again.')
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
        return 'Select Bank'
      case 2:
        return 'Recipient Details'
      case 3:
        return 'Enter Amount'
      case 4:
        return 'Enter PIN'
      default:
        return 'Bank Transfer'
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
            Transfer completed successfully!
          </div>
        )}

        {/* Step 1: Select Bank */}
        {step === 1 && (
          <div className="bank-selection">
            <p className="step-description">Choose the recipient's bank</p>
            <div className="banks-grid">
              {BANGLADESH_BANKS.map((bank) => (
                <button
                  key={bank.id}
                  className={`bank-button ${selectedBankId === bank.id ? 'selected' : ''}`}
                  onClick={() => handleBankSelect(bank.id)}
                >
                  <div className="bank-button-icon">
                    <FontAwesomeIcon icon={faBuildingColumns} />
                  </div>
                  <div className="bank-button-content">
                    <div className="bank-button-name">{bank.name}</div>
                    <div className="bank-button-country">Bangladesh</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Enter Account Details */}
        {step === 2 && selectedBank && (
          <div className="account-details-section">
            <p className="step-description">Enter recipient account details</p>
            
            <div className="bank-info-display" style={{ marginBottom: '24px' }}>
              <div className="bank-info-row">
                <span className="bank-info-label">Selected Bank:</span>
                <span className="bank-info-value">{selectedBank.name}</span>
              </div>
            </div>

                <div className="form-group">
                  <label className="form-label">Account Number</label>
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

                <div className="form-group">
                  <label className="form-label">Account Holder Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter account holder name"
                    value={accountName}
                    onChange={(e) => {
                      setAccountName(e.target.value)
                      setError('')
                    }}
                    required
                  />
                </div>

                <button className="btn-primary" onClick={handleAccountNext}>
                  Continue
                </button>
              </div>
            )}

        {/* Step 3: Enter Amount */}
        {step === 3 && selectedBank && (
          <div className="amount-input-section">
            <p className="step-description">Enter transfer amount</p>
            <div className="bank-info-display" style={{ marginBottom: '20px' }}>
              <div className="bank-info-row">
                <span className="bank-info-label">Selected Bank:</span>
                <span className="bank-info-value">{selectedBank.name}</span>
              </div>
              <div className="bank-info-row">
                <span className="bank-info-label">Minimum Amount:</span>
                <span className="bank-info-value">
                  {selectedBank.supportsBkash ? '5,000' : '25,000'} {userCurrency}
                </span>
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
                min={selectedBank.supportsBkash ? 5000 : 25000}
                step="0.01"
                required
                autoFocus
              />
              <div className="form-hint">
                Minimum: {selectedBank.supportsBkash ? '5,000' : '25,000'} {userCurrency}
              </div>
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
              <p className="step-description">Enter your 4-digit PIN to confirm</p>
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
                  Confirm Transfer
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

