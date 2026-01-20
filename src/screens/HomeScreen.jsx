import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faPaperPlane, 
  faWallet, 
  faMobileScreenButton, 
  faCreditCard, 
  faBuildingColumns,
  faEye,
  faEyeSlash,
  faChevronLeft,
  faChevronRight,
  faHeadset
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import Toast from '../components/Toast'
import '../index.css'

export default function HomeScreen({ onNavigate, onTabChange }) {
  const [successMessage, setSuccessMessage] = useState(null)
  const [balanceVisible, setBalanceVisible] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [balance, setBalance] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [selfieUrl, setSelfieUrl] = useState(null)
  const [banners, setBanners] = useState([])
  const [isLoadingBanners, setIsLoadingBanners] = useState(true)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)

  useEffect(() => {
    loadUserData()
    loadBanners()
    
    // Check for success message from localStorage
    const successMsg = localStorage.getItem('transactionSuccess')
    if (successMsg) {
      setSuccessMessage(successMsg)
      localStorage.removeItem('transactionSuccess')
    }
  }, [])

  // Auto-hide balance after 3 seconds
  useEffect(() => {
    if (balanceVisible) {
      const timer = setTimeout(() => {
        setBalanceVisible(false)
      }, 3000) // 3 seconds

      return () => clearTimeout(timer)
    }
  }, [balanceVisible])

  const loadUserData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (currentUser) {
        // Load user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (profileError) {
          console.error('Error loading profile:', profileError)
        } else if (profileData) {
          setProfile(profileData)
          setBalance(parseFloat(profileData.balance) || 0)
          setFirstName(profileData.first_name || '')
          setSelfieUrl(profileData.selfie_url || null)
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const loadBanners = async () => {
    try {
      setIsLoadingBanners(true)
      
      // Fetch all banners
      const { data: bannersData, error } = await supabase
        .from('banners')
        .select('id, image_url')

      if (error) {
        console.error('Error loading banners:', error)
        // Set empty array on error
        setBanners([])
      } else if (bannersData && bannersData.length > 0) {
        // Map the data to match the expected format
        const formattedBanners = bannersData.map(banner => ({
          id: banner.id,
          image: banner.image_url
        }))
        setBanners(formattedBanners)
      } else {
        // No banners found, set empty array
        setBanners([])
      }
    } catch (error) {
      console.error('Error loading banners:', error)
      setBanners([])
    } finally {
      setIsLoadingBanners(false)
    }
  }

  const handleBalanceToggle = async () => {
    // If hiding, just hide immediately
    if (balanceVisible) {
      setBalanceVisible(false)
      return
    }
    
    // If showing, fetch latest balance first, then unhide
    setIsRefreshing(true)
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (currentUser) {
        // Load latest balance from profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', currentUser.id)
          .single()

        if (!profileError && profileData) {
          setBalance(parseFloat(profileData.balance) || 0)
        }
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    } finally {
      setIsRefreshing(false)
      // Unhide balance after fetching
      setBalanceVisible(true)
    }
  }

  const getAvatarInitials = () => {
    if (firstName) {
      return firstName.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const getGreetingName = () => {
    if (firstName) {
      return firstName
    }
    if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'User'
  }

  const quickActions = [
    { icon: '/icons/wallet.png', label: 'Add\nMoney', color: '#166534' },
    { icon: '/icons/mobile-payment.png', label: 'Mobile\nBanking', color: '#166534' },
    { icon: '/icons/bank.png', label: 'Bank\nTransfer', color: '#166534' },
    { icon: '/icons/telephone-call.png', label: 'Mobile\nRecharge', color: '#166534' },
    { icon: '/icons/payment-method.png', label: 'Pay\nBill', color: '#166534' },
    { icon: '/icons/support.png', label: 'Customer\nCare', color: '#166534' },
    { icon: '/icons/lottery.png', label: 'Special\nOffers', color: '#166534' },
    { icon: '/icons/profile.png', label: 'My\nProfile', color: '#166534' },
  ]

  // Auto-play carousel (only if banners exist)
  useEffect(() => {
    if (banners.length === 0) return

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length)
    }, 4000) // Change banner every 4 seconds

    return () => clearInterval(interval)
  }, [banners.length])

  const goToBanner = (index) => {
    if (banners.length > 0) {
      setCurrentBannerIndex(index)
    }
  }

  const nextBanner = () => {
    if (banners.length > 0) {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length)
    }
  }

  const prevBanner = () => {
    if (banners.length > 0) {
      setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)
    }
  }

  // Reset banner index when banners change
  useEffect(() => {
    if (banners.length > 0 && currentBannerIndex >= banners.length) {
      setCurrentBannerIndex(0)
    }
  }, [banners.length, currentBannerIndex])

  if (isLoading) {
    return (
      <div className="home-screen">
        <div className="full-screen-loader">
          <div className="loader-spinner"></div>
          <div className="loader-text">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="home-screen">
      <Toast 
        message={successMessage} 
        type="success" 
        onClose={() => setSuccessMessage(null)} 
      />
      {/* Balance Card - Fixed */}
      <div className="balance-card">
        <div className="balance-header">
          <div className="balance-user-info">
            <div className="balance-avatar">
              {selfieUrl ? (
                <img src={selfieUrl} alt="Profile" className="balance-avatar-img" />
              ) : (
                <span>{getAvatarInitials()}</span>
              )}
            </div>
            <div>
              <div className="balance-greeting">Hello, {getGreetingName()}</div>
              <div className="balance-status">Active</div>
            </div>
          </div>
        </div>
        <div className="balance-label-row">
          <span>Available Balance</span>
        </div>
        <div className="balance-amount-wrapper">
          <div className="balance-amount">
            {balanceVisible ? `৳${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '৳••••••'}
          </div>
          <button 
            className="eye-btn"
            onClick={handleBalanceToggle}
            disabled={isRefreshing}
            title={balanceVisible ? 'Hide balance' : 'Show balance'}
          >
            <FontAwesomeIcon 
              icon={balanceVisible ? faEye : faEyeSlash} 
              className={isRefreshing ? 'spinning' : ''}
            />
          </button>
        </div>
        <div className="balance-footer">
          <span className="account-type">Personal Account</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="home-content">
        {/* Quick Actions */}
        <div className="quick-actions">
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <div className="action-item-wrapper">
                <button 
                  key={index} 
                  className="action-btn" 
                  style={{ '--action-color': action.color }}
                  onClick={() => {
                    if (action.label === 'Add\nMoney' && onNavigate) {
                      onNavigate('add-money')
                    } else if (action.label === 'Mobile\nBanking' && onNavigate) {
                      onNavigate('mobile-banking')
                    } else if (action.label === 'Bank\nTransfer' && onNavigate) {
                      onNavigate('bank-transfer')
                    } else if (action.label === 'Mobile\nRecharge' && onNavigate) {
                      onNavigate('mobile-recharge')
                    } else if (action.label === 'Pay\nBill' && onNavigate) {
                      onNavigate('pay-bill')
                    } else if (action.label === 'Customer\nCare' && onNavigate) {
                      onNavigate('customer-care')
                    } else if (action.label === 'Special\nOffers' && onTabChange) {
                      onTabChange('offers')
                    } else if (action.label === 'My\nProfile' && onTabChange) {
                      onTabChange('profile')
                    }
                  }}
                >
                  <img src={action.icon} alt={action.label.replace('\n', ' ')} className="action-icon-img" />
                </button>
                <span className="action-label">{action.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Banner Carousel */}
        {isLoadingBanners ? (
          <div className="banner-carousel-section">
            <div className="banner-carousel-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading banners...</div>
            </div>
          </div>
        ) : banners.length > 0 ? (
          <div className="banner-carousel-section">
            <div className="banner-carousel-container">
              <div 
                className="banner-carousel-track"
                style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
              >
                {banners.map((banner) => (
                  <div key={banner.id} className="banner-slide">
                    <img 
                      src={banner.image} 
                      alt="Banner"
                      className="banner-image"
                      onError={(e) => {
                        // Fallback to a placeholder if image fails to load
                        e.target.src = `https://via.placeholder.com/800x400/166534/ffffff?text=Banner`
                      }}
                    />
                  </div>
                ))}
              </div>
              
              {/* Navigation Arrows - only show if more than 1 banner */}
              {banners.length > 1 && (
                <>
                  <button 
                    className="banner-nav-btn banner-nav-prev"
                    onClick={prevBanner}
                    aria-label="Previous banner"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                  <button 
                    className="banner-nav-btn banner-nav-next"
                    onClick={nextBanner}
                    aria-label="Next banner"
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>

                  {/* Dots Indicator */}
                  <div className="banner-dots">
                    {banners.map((_, index) => (
                      <button
                        key={index}
                        className={`banner-dot ${index === currentBannerIndex ? 'active' : ''}`}
                        onClick={() => goToBanner(index)}
                        aria-label={`Go to banner ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

