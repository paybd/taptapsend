import { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faCheckCircle,
  faSpinner,
  faImage,
  faTimes
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../../lib/supabase'
import { getCurrencyForCountry } from '../../lib/currencyMapping'
import '../../index.css'

export default function BankDepositScreen({ onBack, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [selectedBankId, setSelectedBankId] = useState('')
  const [banks, setBanks] = useState([])
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userCountryCode, setUserCountryCode] = useState(null)
  const [userCurrency, setUserCurrency] = useState('BDT')
  const [depositCount, setDepositCount] = useState(0)
  const [minimumAmount, setMinimumAmount] = useState(100)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadUserCountry()
    loadDepositCount()
  }, [])

  useEffect(() => {
    // Load banks - will filter by country if available, otherwise show all
    loadBanks()
  }, [userCountryCode])

  const loadUserCountry = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return
      }

      // Load user profile to get country_code
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', user.id)
        .single()

      if (!profileError && profileData) {
        if (profileData.country_code) {
          setUserCountryCode(profileData.country_code)
          setUserCurrency(getCurrencyForCountry(profileData.country_code))
        } else {
          // Set to empty string if no country_code, so banks still load
          setUserCountryCode('')
          setUserCurrency('BDT')
        }
      }
    } catch (error) {
      console.error('Error loading user country:', error)
    }
  }

  const loadDepositCount = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Count approved bank deposits
      const { count, error: countError } = await supabase
        .from('deposit')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('deposit_type', 'bank')
        .eq('status', 'approved')

      if (countError) {
        console.error('Error loading deposit count:', countError)
        return
      }

      const countValue = count || 0
      setDepositCount(countValue)

      // Calculate minimum amount based on count
      let minAmount = 100 // Default minimum
      if (countValue === 0) {
        minAmount = 100
      } else if (countValue === 1) {
        minAmount = 500
      } else if (countValue === 2) {
        minAmount = 1000
      } else if (countValue >= 3) {
        minAmount = 2000
      }

      setMinimumAmount(minAmount)
    } catch (error) {
      console.error('Error loading deposit count:', error)
    }
  }

  const loadBanks = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      // Build query
      let query = supabase
        .from('paymentaccounts')
        .select('*')
        .eq('account_type', 'bank')
        .eq('is_active', true)
      
      // Filter by user's country_code if available
      if (userCountryCode) {
        // Filter banks where country matches user's country_code
        // Assuming paymentAccounts.country stores country code (e.g., 'SA', 'AE')
        query = query.eq('country', userCountryCode)
      }
      
      const { data, error: fetchError } = await query.order('account_name', { ascending: true })

      if (fetchError) {
        console.error('Error loading banks:', fetchError)
        setError('Failed to load bank information')
      } else if (data && data.length > 0) {
        setBanks(data)
      } else {
        setError('No active bank accounts available for your country')
      }
    } catch (error) {
      console.error('Error loading banks:', error)
      setError('Failed to load bank information')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedBank = banks.find(bank => bank.id === selectedBankId)

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB')
        return
      }

      setReceiptFile(file)
      setError('')
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveReceipt = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadReceiptToStorage = async (file, userId) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    const filePath = `deposit-receipts/${fileName}`

    const { data, error: uploadError } = await supabase.storage
      .from('deposit-receipts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to upload receipt: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('deposit-receipts')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!selectedBank) {
      setError('Please select a bank')
      return
    }

    if (!receiptFile) {
      setError('Please upload a receipt screenshot')
      return
    }

    const depositAmount = parseFloat(amount)
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    // Don't allow float values
    if (depositAmount % 1 !== 0) {
      setError('Amount must be a whole number')
      return
    }

    // Check minimum deposit limit
    if (depositAmount < minimumAmount) {
      setError(`Minimum deposit amount is ${minimumAmount.toLocaleString()} ${userCurrency} based on your previous deposits`)
      return
    }

    setIsSubmitting(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get user profile to fetch country_code and calculate amount_to_add
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error('Failed to fetch user profile')
      }

      // Calculate amount_to_add using rate conversion
      let amountToAdd = depositAmount // Default to deposit amount if no rate found
      
      if (profileData && profileData.country_code) {
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
            amountToAdd = depositAmount * companyRate
          }
        }
      }

      // Convert to integer (round down)
      const amountToAddInt = Math.floor(amountToAdd)

      // Upload receipt image to Supabase storage
      const receiptUrl = await uploadReceiptToStorage(receiptFile, user.id)

      // Store deposit record in database with both original amount and calculated amount_to_add
      const { error: depositError } = await supabase
        .from('deposit')
        .insert({
          user_id: user.id,
          bank_id: selectedBankId,
          deposit_type: 'bank',
          amount: depositAmount, // Original deposit amount in user's currency
          amount_to_add: amountToAddInt, // Calculated amount to add to balance in BDT
          receipt_url: receiptUrl,
          status: 'pending'
        })

      if (depositError) {
        throw new Error(`Failed to save deposit: ${depositError.message}`)
      }

      setSuccess(true)
      
      // Set success message in localStorage for toast notification
      localStorage.setItem('transactionSuccess', 'Bank deposit request submitted successfully! Your receipt has been uploaded and is pending review.')
      
      // Navigate to home screen after 1 second
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        } else {
          onBack()
        }
      }, 1000)
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
        <h1 className="deposit-title">Bank Deposit</h1>
        <div style={{ width: '40px' }}></div>
      </div>

      {/* Content */}
      <div className="deposit-content">
      

        {isLoading ? (
          <div className="loading-container">
            <FontAwesomeIcon icon={faSpinner} className="fa-spin" style={{ fontSize: '24px', color: 'var(--text-secondary)' }} />
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading bank information...</p>
          </div>
        ) : banks.length > 0 ? (
          <>
            <div className="banks-selection">
              <h3 className="section-title" style={{ marginBottom: '16px', fontSize: '18px' }}>Select Bank</h3>
              <div className="banks-grid">
                {banks.map((bank) => (
                  <button
                    key={bank.id}
                    type="button"
                    className={`bank-button ${selectedBankId === bank.id ? 'selected' : ''}`}
                    onClick={() => setSelectedBankId(bank.id)}
                    disabled={isSubmitting}
                  >
                    <div className="bank-button-icon">
                      <img src="/icons/bank.png" alt="Bank" className="bank-icon-img" />
                    </div>
                    <div className="bank-button-content">
                      <div className="bank-button-name">{bank.account_name || bank.account_number}</div>
                     
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedBank && (
              <div className="bank-info-display">
                <div className="bank-info-row">
                  <span className="bank-info-label">Account Holder:</span>
                  <span className="bank-info-value">{selectedBank.holder || 'N/A'}</span>
                </div>
                <div className="bank-info-row">
                  <span className="bank-info-label">Account Number:</span>
                  <span className="bank-info-value">{selectedBank.account_number}</span>
                </div>
                <div className="bank-info-row">
                  <span className="bank-info-label">IBAN:</span>
                  <span className="bank-info-value">{selectedBank.iban || 'N/A'}</span>
                </div>
              
              </div>
            )}

            <form onSubmit={handleSubmit} className="deposit-form">
              {error && (
                <div className="error-message-box">
                  {error}
                </div>
              )}

              {success && (
                <div className="success-message-box">
                  Deposit request submitted successfully! Your receipt has been uploaded and is pending review.
                </div>
              )}

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
                    }
                  }}
                  min={minimumAmount}
                  step="1"
                  required
                  disabled={isSubmitting}
                />
                <div className="form-hint" style={{ 
                  marginTop: '8px', 
                  fontSize: '13px', 
                  color: 'var(--text-secondary)',
                  fontWeight: '500'
                }}>
                  Minimum deposit: {minimumAmount.toLocaleString()} {userCurrency}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Upload Receipt Screenshot</label>
                {!receiptPreview ? (
                  <div className="file-upload-area">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="file-input"
                      id="receipt-upload"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="receipt-upload" className="file-upload-label">
                      <FontAwesomeIcon icon={faImage} />
                      <span>Click to upload or drag and drop</span>
                      <span className="file-upload-hint">PNG, JPG up to 5MB</span>
                    </label>
                  </div>
                ) : (
                  <div className="receipt-preview-container">
                    <img src={receiptPreview} alt="Receipt preview" className="receipt-preview" />
                    <button
                      type="button"
                      className="remove-receipt-btn"
                      onClick={handleRemoveReceipt}
                      disabled={isSubmitting}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="deposit-submit-btn"
                disabled={isSubmitting || !selectedBank || !receiptFile}
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
              {error || 'No bank accounts available. Please contact support.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

