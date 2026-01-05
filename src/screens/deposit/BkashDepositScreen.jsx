import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faMobileScreenButton,
  faCheckCircle,
  faSpinner
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../../lib/supabase'
import '../../index.css'

export default function BkashDepositScreen({ onBack }) {
  const [amount, setAmount] = useState('')
  const [lastThreeDigits, setLastThreeDigits] = useState('')
  const [bkashAccount, setBkashAccount] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadBkashAccount()
  }, [])

  const loadBkashAccount = async () => {
    try {
      setIsLoading(true)
      setError('')
      const { data, error: fetchError } = await supabase
        .from('paymentaccounts')
        .select('*')
        .eq('account_type', 'bkash')
        .eq('is_active', true)
        .maybeSingle()

      if (fetchError) {
        console.error('Error loading bKash account:', fetchError)
        setError('Failed to load bKash account information')
      } else if (data) {
        setBkashAccount(data)
      } else {
        // Try to get any bkash account regardless of is_active
        const { data: anyData, error: anyError } = await supabase
          .from('paymentaccounts')
          .select('*')
          .eq('account_type', 'bkash')
          .maybeSingle()
        
        if (anyData) {
          setBkashAccount(anyData)
        } else {
          setError('No bKash account found. Please contact support.')
        }
      }
    } catch (error) {
      console.error('Error loading bKash account:', error)
      setError('Failed to load bKash account information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!bkashAccount) {
      setError('bKash account information not available')
      return
    }

    const depositAmount = parseFloat(amount)
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (lastThreeDigits.length !== 3) {
      setError('Please enter the last 3 digits')
      return
    }

    setIsSubmitting(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Check if deposit record exists in autodeposit table
      const { data: depositRecord, error: depositError } = await supabase
        .from('autodeposit')
        .select('*')
        .eq('amount', depositAmount)
        .eq('last_3_digits', lastThreeDigits)
        .eq('is_processed', false)
        .maybeSingle()

      if (depositError) {
        console.error('Error checking deposit record:', depositError)
        throw new Error('Failed to verify deposit information')
      }

      if (!depositRecord) {
        setError('No matching deposit found. Please verify the amount and last 3 digits.')
        setIsSubmitting(false)
        return
      }

      // Deposit record found, now calculate converted amount and update user balance
      // Get current profile with country_code
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('balance, country_code')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error('Failed to fetch user balance')
      }

      // Fetch rates based on user's country_code
      let calculatedAmount = depositAmount // Default to deposit amount if no rate found
      
      if (profileData.country_code) {
        const { data: rateData, error: rateError } = await supabase
          .from('rates')
          .select('original_rate, company_rate')
          .eq('country_code', profileData.country_code)
          .single()

        if (!rateError && rateData) {
          // Calculate: (depositAmount / original_rate) * company_rate
          const originalRate = parseFloat(rateData.original_rate)
          const companyRate = parseFloat(rateData.company_rate)
          
          if (originalRate > 0) {
            calculatedAmount = (depositAmount / originalRate) * companyRate
          }
        }
      }

      // Convert to integer (round down)
      const amountToAdd = Math.floor(calculatedAmount)

      const currentBalance = parseFloat(profileData.balance) || 0
      const newBalance = currentBalance + amountToAdd

      // Update user balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id)

      if (updateError) {
        throw new Error('Failed to update balance')
      }

      // Store deposit record in deposit table with calculated amount
      const { error: depositRecordError } = await supabase
        .from('deposit')
        .insert({
          user_id: user.id,
          bank_id: bkashAccount.id, // bKash account id from paymentAccounts
          deposit_type: 'bkash',
          amount: amountToAdd, // Store the calculated integer amount
          receipt_url: null, // bKash deposits don't have receipts
          status: 'approved' // Auto-approved since verified via autodeposit
        })

      if (depositRecordError) {
        console.error('Error storing deposit record:', depositRecordError)
        // Don't throw error here - balance is already updated
      }

      // Mark the deposit record as processed
      const { error: markProcessedError } = await supabase
        .from('autodeposit')
        .update({ 
          is_processed: true,
          processed_by: user.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', depositRecord.id)

      if (markProcessedError) {
        console.error('Error marking deposit as processed:', markProcessedError)
        // Don't throw error here - balance is already updated
      }

      setSuccess(true)
      
      // Navigate to home screen after 2 seconds
      setTimeout(() => {
        onBack()
      }, 2000)
    } catch (error) {
      console.error('Error processing deposit:', error)
      setError(error.message || 'Failed to process deposit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="deposit-screen">
      {/* Header */}
      <div className="deposit-header">
        <button className="back-btn" onClick={onBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="deposit-title">bKash Deposit</h1>
        <div style={{ width: '40px' }}></div>
      </div>

      {/* Content */}
      <div className="deposit-content">
        <div className="deposit-icon-large">
          <FontAwesomeIcon icon={faMobileScreenButton} />
        </div>

        {isLoading ? (
          <div className="loading-container">
            <FontAwesomeIcon icon={faSpinner} className="fa-spin" style={{ fontSize: '24px', color: 'var(--text-secondary)' }} />
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading account information...</p>
          </div>
        ) : bkashAccount ? (
          <>
            <div className="bkash-account-display">
              <div className="account-label">Send money to this bKash number:</div>
              <div className="account-number">{bkashAccount.account_number}</div>
              <div className="account-name">{bkashAccount.account_name || 'TapTapSend Account'}</div>
            </div>
            
            <form onSubmit={handleSubmit} className="deposit-form">
              {error && (
                <div className="error-message-box">
                  {error}
                </div>
              )}

              {success && (
                <div className="success-message-box">
                  Deposit successful! Your balance has been updated.
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Amount (BDT)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last 3 Digits of bKash Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="XXX"
                  value={lastThreeDigits}
                  onChange={(e) => setLastThreeDigits(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  maxLength={3}
                  required
                  disabled={isSubmitting}
                />
                <div className="form-hint">Enter the last 3 digits of the bKash number you sent money from</div>
              </div>

              <button 
                type="submit" 
                className="deposit-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheckCircle} />
                    Confirm Deposit
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="error-container">
            <p style={{ color: 'var(--danger-color)', textAlign: 'center' }}>
              bKash account information not available. Please contact support.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

