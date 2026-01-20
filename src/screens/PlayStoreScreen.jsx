import { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar, faShare, faBookmark, faChevronRight, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons'
import '../index.css'

export default function PlayStoreScreen({ onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressPhase, setProgressPhase] = useState('downloading') // 'downloading' or 'installing'
  const [isIphone, setIsIphone] = useState(false)
  const [showSearchBar, setShowSearchBar] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const progressIntervalRef = useRef(null)
  const searchInputRef = useRef(null)
  
  const screenshots = [
    '/01.jpg',
    '/02.jpg',
    '/03.jpg',
    '/04.jpg',
    '/05.jpg',
  ]

  const reviews = [
    {
      author: 'Anonymous',
      date: 'January 11, 2023',
      rating: 3,
      text: 'Emergency need Agent & DSD e-KYC, pay Bill, Refer daily achievement. The visiting color changes from red to green even without transaction, making it difficult to find agents not dealt with. Suggest solution with color codes for "Check-in pending" (red), "Visited complete" (yellow), and "B2B Complete" (green), and "MAR".',
      helpful: 135
    },
    {
      author: 'Md. Mahbubur Rahman',
      date: 'September 3, 2022',
      rating: 5,
      text: 'Very usefull app. Have to add some extra feature like - Dso wise daily Transaction Target Vs Achievement, Agent Wise target vs achievement.. Overall it makes our work very simple, easy and friendly. Thanks to bKash.',
      helpful: 673
    },
    {
      author: 'Rabbani Golam',
      date: 'August 9, 2023',
      rating: 5,
      text: 'Very usefull app. Have to add some extra feature like - Dso wise daily Transaction Target Vs Achievement, Agent Wise target vs achievement.. Overall it makes our work very simple, easy and friendly. Thanks to bKash.',
      helpful: 425
    }
  ]

  const similarApps = [
    { 
      name: 'Cellfin', 
      developer: 'Islami Bank Bangladesh PLC', 
      rating: 4.5, 
      icon: '/icons/cellfin.webp',
      playStoreLink: 'https://play.google.com/store/apps/details?id=com.ibbl.cellfin&hl=en'
    },
    { 
      name: 'Remitly', 
      developer: 'Remitly', 
      rating: 4.6, 
      icon: '/icons/remitly.webp',
      playStoreLink: 'https://play.google.com/store/apps/details?id=com.remitly.androidapp&hl=en'
    },
    { 
      name: 'TapTap Send', 
      developer: 'TapTap Send, Inc.', 
      rating: 4.4, 
      icon: '/icons/taptap.webp',
      playStoreLink: 'https://play.google.com/store/apps/details?id=com.taptapsend&hl=en'
    },
    { 
      name: 'Wise', 
      developer: 'Wise Payments Ltd.', 
      rating: 4.7, 
      icon: '/icons/wise.webp',
      playStoreLink: 'https://play.google.com/store/apps/details?id=com.transferwise.android&hl=en'
    }
  ]

  // Check if app is already installed and detect iPhone
  useEffect(() => {
    // Detect iPhone
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIphone(isIOS)

    // Enhanced PWA installation detection
    const checkIfPWAInstalled = () => {
      // Method 1: Check display mode (Android/Chrome/Edge)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      
      // Method 2: Check iOS standalone mode
      const isIOSStandalone = window.navigator.standalone === true
      
      // Method 3: Check fullscreen mode
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches
      
      // Method 4: Check minimal-ui mode (some browsers)
      const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches
      
      // If any indicator is true, PWA is installed
      return isStandalone || isIOSStandalone || isFullscreen || isMinimalUI
    }

    // Check if PWA is already installed
    if (checkIfPWAInstalled()) {
      setIsInstalled(true)
      setIsInstallable(false)
    }

    // Listen for beforeinstallprompt event (not available on iOS)
    // This event only fires if the app is NOT already installed
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the default install prompt
      e.preventDefault()
      // Store the event for later use
      setDeferredPrompt(e)
      setIsInstallable(true)
      // If we get this event, app is not installed yet
      setIsInstalled(false)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setIsInstallable(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const simulateDownload = async () => {
    setShowProgress(true)
    setProgress(0)
    setProgressPhase('downloading')
    
    // Simulate download progress
    let currentProgress = 0
    progressIntervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 15 + 5 // Random increment between 5-20%
      
      if (currentProgress >= 100) {
        currentProgress = 100
        setProgress(100)
        clearInterval(progressIntervalRef.current)
        
        // After download completes, hide progress and show native install prompt
        setTimeout(async () => {
          setShowProgress(false)
          
          // Show the native install prompt
          if (deferredPrompt) {
            deferredPrompt.prompt()
            
            // Wait for the user to respond to the prompt
            const { outcome } = await deferredPrompt.userChoice
            
            if (outcome === 'accepted') {
              // User accepted, now show installation progress
              simulateInstallation()
            } else {
              // User dismissed, reset state
              console.log('User dismissed the install prompt')
              setDeferredPrompt(null)
              setIsInstallable(false)
            }
          } else {
            // No deferred prompt available, just mark as installed
            setIsInstalled(true)
          }
        }, 500)
      } else {
        setProgress(Math.min(currentProgress, 99))
      }
    }, 200) // Update every 200ms
  }

  const simulateInstallation = () => {
    setShowProgress(true)
    setProgress(0)
    setProgressPhase('installing')
    
    // Simulate installation progress
    let currentProgress = 0
    progressIntervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 20 + 10 // Random increment between 10-30%
      
      if (currentProgress >= 100) {
        currentProgress = 100
        setProgress(100)
        clearInterval(progressIntervalRef.current)
        
        // After installation completes, mark as installed
        setTimeout(() => {
          setShowProgress(false)
          setIsInstalled(true)
          setDeferredPrompt(null)
          setIsInstallable(false)
        }, 500)
      } else {
        setProgress(Math.min(currentProgress, 99))
      }
    }, 150) // Update every 150ms
  }

  const handleInstallClick = async () => {
    if (isInstalled) {
      alert('Mcash Remit is already installed on your device!')
      return
    }

    if (!deferredPrompt && !isIphone) {
      // If no deferred prompt but not iPhone, show message
      alert('Installation is not available. Please use your browser\'s install option.')
      return
    }

    // Start the download simulation
    simulateDownload()
  }

  const handleSearchClick = () => {
    setShowSearchBar(true)
    // Focus search input after a short delay to ensure it's rendered
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, 100)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    // Encode the search query
    const encodedQuery = encodeURIComponent(searchQuery.trim())
    
    // Construct Play Store search URL
    const playStoreSearchUrl = `https://play.google.com/store/search?q=${encodedQuery}&c=apps`
    
    // Detect if running on Android device
    const isAndroid = /Android/i.test(navigator.userAgent)
    
    if (isAndroid) {
      // Try market:// protocol first (opens Play Store app on Android)
      const marketUrl = `market://search?q=${encodedQuery}&c=apps`
      
      // Create a hidden iframe to try market:// protocol
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = marketUrl
      document.body.appendChild(iframe)
      
      // Fallback to web if market:// doesn't work (after a short delay)
      setTimeout(() => {
        document.body.removeChild(iframe)
        window.open(playStoreSearchUrl, '_blank')
      }, 1000)
    } else {
      // Desktop/iOS: open Play Store web search
      window.open(playStoreSearchUrl, '_blank')
    }
    
    // Reset search
    setSearchQuery('')
    setShowSearchBar(false)
  }

  const handleCloseSearch = () => {
    setShowSearchBar(false)
    setSearchQuery('')
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FontAwesomeIcon 
        key={i} 
        icon={faStar} 
        style={{ 
          color: i < Math.floor(rating) ? '#FFC107' : '#E0E0E0',
          fontSize: '14px'
        }} 
      />
    ))
  }

  return (
    <div className="playstore-container">
      {/* Header */}
      <div className="playstore-header">
        <div className="playstore-header-top">
          {!showSearchBar ? (
            <>
              <div className="playstore-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/icons/playstore.svg" alt="Google Play" style={{ height: '32px', width: 'auto' }} />
                <span>Google Play</span>
              </div>
              <div className="playstore-header-icons">
                <button className="playstore-icon-btn" onClick={handleSearchClick}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                </button>
                <button className="playstore-icon-btn">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </button>
                <button className="playstore-icon-btn">
                  <div className="playstore-avatar">U</div>
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px', padding: '0 16px' }}>
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  style={{ position: 'absolute', left: '12px', color: '#666' }}
                >
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for apps & games"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    border: '1px solid #ddd',
                    borderRadius: '24px',
                    fontSize: '16px',
                    outline: 'none',
                    backgroundColor: '#f5f5f5'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleCloseSearch}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FontAwesomeIcon icon={faTimes} style={{ fontSize: '20px', color: '#666' }} />
              </button>
            </form>
          )}
        </div>
        {!showSearchBar && (
          <div className="playstore-nav-tabs">
            <button className="playstore-tab">Games</button>
            <button className="playstore-tab active">Apps</button>
            <button className="playstore-tab">Kids</button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="playstore-content">
        {/* App Info Section */}
        <div className="playstore-app-info">
          <div className="playstore-app-header">
            <div className="playstore-app-icon">
              <img src="/icons/mcash.png" alt="Mcash Remit" />
            </div>
            <div className="playstore-app-details">
              <h1 className="playstore-app-name">Mcash Remit</h1>
              <p className="playstore-developer">Mcash Remit Limited</p>
              <div className="playstore-rating-section">
                <div className="playstore-rating">
                  <span className="playstore-rating-value">4.2</span>
                  <FontAwesomeIcon icon={faStar} className="playstore-star-icon" />
                </div>
                <span className="playstore-reviews-count">2.63K reviews</span>
                <span className="playstore-separator">•</span>
                <span className="playstore-downloads">100K+ downloads</span>
                <span className="playstore-separator">•</span>
                <span className="playstore-age">3+</span>
              </div>
            </div>
          </div>
          <div className="playstore-action-buttons">
            <button 
              className="playstore-install-btn"
              onClick={handleInstallClick}
              disabled={isInstalled || showProgress || isIphone}
            >
              {showProgress ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                  {progressPhase === 'downloading' ? 'Downloading...' : 'Installing...'}
                </>
              ) : isInstalled ? (
                'Installed'
              ) : (
                'Install'
              )}
            </button>
            <button className="playstore-action-btn">
              <FontAwesomeIcon icon={faShare} />
            </button>
            <button className="playstore-action-btn">
              <FontAwesomeIcon icon={faBookmark} />
            </button>
          </div>
          {isIphone ? (
            <p className="playstore-device-info playstore-device-incompatible">
              This device is not compatible with this app
            </p>
          ) : (
            <p className="playstore-device-info">This app is available for all of your devices</p>
          )}
        </div>

        {/* Screenshots Gallery */}
        <div className="playstore-screenshots">
          <div className="playstore-screenshots-container">
            {screenshots.map((screenshot, index) => (
              <div key={index} className="playstore-screenshot-item">
                <img src={screenshot} alt={`Screenshot ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>

        {/* About Section */}
        <div className="playstore-section">
          <div className="playstore-section-header">
            <h2>About this app</h2>
            <FontAwesomeIcon icon={faChevronRight} />
          </div>
          <p className="playstore-description">
            Mcash Remit is a comprehensive mobile financial services app that enables users to perform various transactions including mobile banking, bank transfers, mobile recharge, bill payments, and deposits. The app provides a seamless and secure platform for managing your financial transactions with ease.
          </p>
          <div className="playstore-meta">
            <span>Updated on Jan 12, 2026</span>
            <span className="playstore-separator">•</span>
            <span>Finance</span>
          </div>
        </div>

        {/* Data Safety Section */}
        <div className="playstore-section">
          <h2>Data safety</h2>
          <p className="playstore-data-safety-text">
            Safety starts with understanding how developers collect and share your data.
          </p>
          <div className="playstore-data-info">
            <div className="playstore-data-item">
              <span className="playstore-data-label">No data shared with third parties</span>
              <a href="#" className="playstore-link">Learn more</a>
            </div>
            <div className="playstore-data-item">
              <span className="playstore-data-label">No data collected</span>
              <a href="#" className="playstore-link">Learn more</a>
            </div>
            <div className="playstore-data-item">
              <span className="playstore-data-label">Data is encrypted in transit</span>
            </div>
            <div className="playstore-data-item">
              <span className="playstore-data-label">Data can't be deleted</span>
            </div>
          </div>
          <a href="#" className="playstore-link">See details</a>
        </div>

        {/* Ratings Section */}
        <div className="playstore-section">
          <div className="playstore-ratings-header">
            <div>
              <h2>Ratings and reviews</h2>
              <div className="playstore-overall-rating">
                <span className="playstore-rating-value-large">4.2</span>
                <div className="playstore-stars-large">
                  {renderStars(4.2)}
                </div>
                <span className="playstore-total-reviews">2.34K reviews</span>
              </div>
            </div>
          </div>
          
          {/* Rating Distribution */}
          <div className="playstore-rating-bars">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="playstore-rating-bar">
                <span className="playstore-rating-bar-label">{stars}</span>
                <FontAwesomeIcon icon={faStar} className="playstore-star-small" />
                <div className="playstore-rating-bar-container">
                  <div 
                    className="playstore-rating-bar-fill"
                    style={{ width: `${stars === 5 ? 70 : stars === 4 ? 20 : stars === 1 ? 10 : 5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Reviews */}
          <div className="playstore-reviews">
            {reviews.map((review, index) => (
              <div key={index} className="playstore-review">
                <div className="playstore-review-header">
                  <div className="playstore-review-author">{review.author}</div>
                  <div className="playstore-review-date">{review.date}</div>
                </div>
                <div className="playstore-review-rating">
                  {renderStars(review.rating)}
                </div>
                <p className="playstore-review-text">{review.text}</p>
                <div className="playstore-review-helpful">
                  <span>{review.helpful} people found this review helpful</span>
                  <div className="playstore-review-actions">
                    <button className="playstore-helpful-btn">Yes</button>
                    <button className="playstore-helpful-btn">No</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <a href="#" className="playstore-link">See all reviews</a>
        </div>

        {/* What's New Section */}
        <div className="playstore-section">
          <h2>What's new</h2>
          <ul className="playstore-updates">
            <li>Target Vs Achievement Data Enhancement: Enable users to view new data points for Target and Achievement measurement.</li>
            <li>Performance Data Enhancement: Enables users to view last 7 day average data so that they can track performance patterns.</li>
          </ul>
        </div>

        {/* App Support */}
        <div className="playstore-section">
          <h2>App support</h2>
        </div>

        {/* Similar Apps */}
        <div className="playstore-section">
          <h2>Similar apps</h2>
          <div className="playstore-app-grid">
            {similarApps.map((app, index) => (
              <div 
                key={index} 
                className="playstore-app-card"
                onClick={() => window.open(app.playStoreLink, '_blank')}
                style={{ cursor: 'pointer' }}
              >
                <img src={app.icon} alt={app.name} className="playstore-app-card-icon" />
                <div className="playstore-app-card-info">
                  <div className="playstore-app-card-name">{app.name}</div>
                  <div className="playstore-app-card-developer">{app.developer}</div>
                  <div className="playstore-app-card-rating">
                    <FontAwesomeIcon icon={faStar} style={{ color: '#FFC107', fontSize: '12px' }} />
                    <span>{app.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Download/Install Progress Notification */}
      {showProgress && (
        <div className="playstore-download-notification">
          <div className="playstore-download-notification-content">
            <div className="playstore-download-icon">
              <img src="/icons/wallet.png" alt="Mcash Remit" />
            </div>
            <div className="playstore-download-info">
              <div className="playstore-download-header">
                <span className="playstore-download-app-name">Mcash Remit</span>
                <span className="playstore-download-percentage">{Math.round(progress)}%</span>
              </div>
              <div className="playstore-download-progress-bar">
                <div 
                  className="playstore-download-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="playstore-download-status">
                {progressPhase === 'downloading' ? 'Downloading...' : 'Installing...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="playstore-footer">
        <div className="playstore-footer-links">
          <a href="#">Google Play</a>
          <a href="#">Play Pass</a>
          <a href="#">Play Points</a>
          <a href="#">Gift cards</a>
          <a href="#">Redeem</a>
          <a href="#">Refund policy</a>
          <a href="#">Kids & family</a>
          <a href="#">Parent Guide</a>
          <a href="#">Family sharing</a>
          <a href="#">Terms of Service</a>
          <a href="#">Privacy</a>
          <a href="#">About Google Play</a>
          <a href="#">Developers</a>
          <a href="#">Google Store</a>
        </div>
        <p className="playstore-footer-text">All prices, include VAT</p>
        <p className="playstore-footer-text">Bangladesh (English)</p>
      </div>
    </div>
  )
}

