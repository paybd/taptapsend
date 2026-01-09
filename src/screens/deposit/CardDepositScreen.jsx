import { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faGift,
  faCheckCircle,
  faSpinner,
  faImage,
  faTimes
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../../lib/supabase'
import { getCurrencyForCountry } from '../../lib/currencyMapping'
import '../../index.css'

export default function GiftCardDepositScreen({ onBack, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [giftCardFile, setGiftCardFile] = useState(null)
  const [giftCardPreview, setGiftCardPreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [userCurrency, setUserCurrency] = useState('BDT')
  const [depositCount, setDepositCount] = useState(0)
  const [minimumAmount, setMinimumAmount] = useState(100)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadUserCountry()
    loadDepositCount()
  }, [])

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

      if (!profileError && profileData && profileData.country_code) {
        setUserCurrency(getCurrencyForCountry(profileData.country_code))
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

      // Count approved gift card deposits
      const { count, error: countError } = await supabase
        .from('deposit')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('deposit_type', 'gift_card')
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

      setGiftCardFile(file)
      setError('')
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setGiftCardPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveGiftCard = () => {
    setGiftCardFile(null)
    setGiftCardPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadGiftCardToStorage = async (file, userId) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    const filePath = `gift-cards/${fileName}`

    const { data, error: uploadError } = await supabase.storage
      .from('deposit-receipts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to upload gift card image: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('deposit-receipts')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  const getOrCreateGiftCardAccount = async () => {
    // Check if gift card payment account exists
    const { data: existingAccount, error: fetchError } = await supabase
      .from('paymentaccounts')
      .select('id')
      .eq('account_type', 'gift_card')
      .eq('is_active', true)
      .single()

    if (existingAccount && !fetchError) {
      return existingAccount.id
    }

    // Create a gift card payment account if it doesn't exist
    const { data: newAccount, error: createError } = await supabase
      .from('paymentaccounts')
      .insert({
        account_type: 'gift_card',
        account_name: 'Gift Card Deposit',
        account_number: 'N/A',
        is_active: true
      })
      .select('id')
      .single()

    if (createError) {
      throw new Error(`Failed to create gift card account: ${createError.message}`)
    }

    return newAccount.id
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!giftCardFile) {
      setError('Please upload a gift card image')
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
          const originalRate = parseFloat(rateData.original_rate)
          const companyRate = parseFloat(rateData.company_rate)
          
          if (originalRate > 0) {
            amountToAdd = depositAmount * companyRate
          }
        }
      }

      // Convert to integer (round down)
      const amountToAddInt = Math.floor(amountToAdd)

      // Get or create gift card payment account
      const giftCardAccountId = await getOrCreateGiftCardAccount()

      // Upload gift card image to Supabase storage
      const giftCardUrl = await uploadGiftCardToStorage(giftCardFile, user.id)

      // Store deposit record in database
      const { error: depositError } = await supabase
        .from('deposit')
        .insert({
          user_id: user.id,
          bank_id: giftCardAccountId,
          deposit_type: 'gift_card',
          amount: depositAmount,
          amount_to_add: amountToAddInt,
          receipt_url: giftCardUrl,
          status: 'pending'
        })

      if (depositError) {
        throw new Error(`Failed to save deposit: ${depositError.message}`)
      }

      setSuccess(true)
      
      // Set success message in localStorage for toast notification
      localStorage.setItem('transactionSuccess', 'Gift card deposit request submitted successfully! Your gift card image has been uploaded and is pending review.')
      
      // Navigate to home screen instantly
      if (onSuccess) {
        onSuccess()
      } else {
        onBack()
      }
    } catch (error) {
      console.error('Error processing gift card deposit:', error)
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
        <h1 className="deposit-title">Gift Card Deposit</h1>
        <div style={{ width: '40px' }}></div>
      </div>

      {/* Content */}
      <div className="deposit-content">
        <div className="deposit-icon-large">
          <FontAwesomeIcon icon={faGift} />
        </div>
        
        <form onSubmit={handleSubmit} className="deposit-form">
          {error && (
            <div className="error-message-box">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message-box">
              Gift card deposit request submitted successfully! Your gift card image has been uploaded and is pending review.
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
            <label className="form-label">Upload Gift Card Image</label>
            {!giftCardPreview ? (
              <div className="file-upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="file-input"
                  id="gift-card-upload"
                  disabled={isSubmitting}
                />
                <label htmlFor="gift-card-upload" className="file-upload-label">
                  <FontAwesomeIcon icon={faImage} />
                  <span>Click to upload or drag and drop</span>
                  <span className="file-upload-hint">PNG, JPG up to 5MB</span>
                </label>
              </div>
            ) : (
              <div className="receipt-preview-container">
                <img src={giftCardPreview} alt="Gift card preview" className="receipt-preview" />
                <button
                  type="button"
                  className="remove-receipt-btn"
                  onClick={handleRemoveGiftCard}
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
            disabled={isSubmitting || !giftCardFile}
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
      </div>
    </div>
  )
}
