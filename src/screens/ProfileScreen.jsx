import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightFromBracket, faUser, faEnvelope, faGlobe, faIdCard, faLock, faTimes, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import Toast from '../components/Toast'
import '../index.css'

export default function ProfileScreen({ onLogout }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPinModal, setShowPinModal] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinErrors, setPinErrors] = useState({})
  const [isChangingPin, setIsChangingPin] = useState(false)
  const [pinMessage, setPinMessage] = useState(null)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        setUser(currentUser)

        if (currentUser) {
          // Load user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()

          setProfile(profileData)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [])

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
  }

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      if (onLogout) {
        onLogout()
      }
    } catch (error) {
      console.error('Error logging out:', error)
      setIsLoggingOut(false)
    }
  }

  const handleLogoutCancel = () => {
    if (!isLoggingOut) {
      setShowLogoutModal(false)
    }
  }

  const getAvatarInitials = () => {
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const handlePinChange = (value, pinType) => {
    const cleanedValue = value.replace(/\D/g, '').slice(0, 4) // Only allow digits, max 4
    setPinErrors({})
    
    if (pinType === 'current') {
      setCurrentPin(cleanedValue)
    } else if (pinType === 'new') {
      setNewPin(cleanedValue)
    } else {
      setConfirmPin(cleanedValue)
    }
  }

  const validatePinChange = () => {
    const newErrors = {}
    
    if (currentPin.length !== 4) {
      newErrors.currentPin = 'Please enter your current PIN'
    } else if (!/^\d{4}$/.test(currentPin)) {
      newErrors.currentPin = 'PIN must contain only numbers'
    }
    
    if (newPin.length !== 4) {
      newErrors.newPin = 'Please enter a new 4-digit PIN'
    } else if (!/^\d{4}$/.test(newPin)) {
      newErrors.newPin = 'PIN must contain only numbers'
    } else if (currentPin === newPin) {
      newErrors.newPin = 'New PIN must be different from current PIN'
    }
    
    if (confirmPin.length !== 4) {
      newErrors.confirmPin = 'Please confirm your new PIN'
    } else if (newPin !== confirmPin) {
      newErrors.confirmPin = 'PINs do not match'
    }

    setPinErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChangePin = async () => {
    if (!validatePinChange() || isChangingPin) return

    setIsChangingPin(true)
    setPinMessage(null)
    setPinErrors({})

    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // Verify current PIN
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('password')
        .eq('id', currentUser.id)
        .single()

      if (profileError) {
        throw new Error('Failed to fetch user information')
      }

      if (profileData.password !== currentPin) {
        setPinErrors({ currentPin: 'Invalid current PIN. Please try again.' })
        setIsChangingPin(false)
        return
      }

      // Update PIN
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ password: newPin })
        .eq('id', currentUser.id)

      if (updateError) {
        throw new Error('Failed to update PIN')
      }

      // Success
      setPinMessage({ type: 'success', text: 'PIN changed successfully!' })
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      
      setTimeout(() => {
        setShowPinModal(false)
        setPinMessage(null)
      }, 1500)
    } catch (error) {
      setPinMessage({ type: 'error', text: error.message || 'Failed to change PIN. Please try again.' })
    } finally {
      setIsChangingPin(false)
    }
  }

  const handleClosePinModal = () => {
    if (!isChangingPin) {
      setShowPinModal(false)
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setPinErrors({})
      setPinMessage(null)
    }
  }

  if (isLoading) {
    return (
      <div className="full-screen-loader">
        <div className="loader-spinner"></div>
        <div className="loader-text">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="screen-content">
      <h2>Profile</h2>
      
      {user && (
        <div className="profile-section">
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-main">
                <div className="profile-avatar">
                  {profile?.selfie_url ? (
                    <img src={profile.selfie_url} alt="Profile" className="profile-avatar-img" />
                  ) : (
                    <span>{getAvatarInitials()}</span>
                  )}
                </div>
                <div className="profile-info">
                  <h3 className="profile-name">
                    {user.user_metadata?.first_name && user.user_metadata?.last_name
                      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                      : profile?.first_name && profile?.last_name
                      ? `${profile.first_name} ${profile.last_name}`
                      : 'User'}
                  </h3>
                  <div className="profile-email">
                    <FontAwesomeIcon icon={faEnvelope} />
                    <span>{user.email}</span>
                  </div>
                  {profile?.country && (
                    <div className="profile-country">
                      <FontAwesomeIcon icon={faGlobe} />
                      <span>{profile.country} {profile.country_code ? `(${profile.country_code})` : ''}</span>
                    </div>
                  )}
                </div>
              </div>
              <button className="profile-logout-btn" onClick={handleLogoutClick} title="Sign Out">
                <FontAwesomeIcon icon={faRightFromBracket} />
              </button>
            </div>
          </div>

          {/* KYC Document Section */}
          {profile?.doc_url && (
            <div className="profile-kyc-section">
              <div className="profile-kyc-header">
                <FontAwesomeIcon icon={faIdCard} />
                <h3 className="profile-kyc-title">KYC Document</h3>
              </div>
              <div className="profile-kyc-document">
                <img 
                  src={profile.doc_url} 
                  alt="KYC Document" 
                  className="profile-kyc-image"
                />
              </div>
            </div>
          )}

          <div className="profile-actions">
            <button className="btn-secondary" onClick={() => setShowPinModal(true)}>
              <FontAwesomeIcon icon={faLock} />
              <span>Change PIN</span>
            </button>
          </div>
        </div>
      )}

      {/* PIN Change Modal */}
      {showPinModal && (
        <div className="pin-change-modal-overlay" onClick={handleClosePinModal}>
          <div className="pin-change-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pin-change-modal-header">
              <h3>Change PIN</h3>
              <button className="pin-change-modal-close" onClick={handleClosePinModal} disabled={isChangingPin}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            {pinMessage && (
              <Toast 
                message={pinMessage.text} 
                type={pinMessage.type} 
                onClose={() => setPinMessage(null)} 
              />
            )}

            <div className="pin-change-modal-content">
              <div className="form-group">
                <label className="form-label">Current PIN</label>
                <input
                  type="password"
                  className={`form-input ${pinErrors.currentPin ? 'error' : ''}`}
                  maxLength={4}
                  value={currentPin}
                  onChange={(e) => handlePinChange(e.target.value, 'current')}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={isChangingPin}
                  autoFocus
                  placeholder="Enter current PIN"
                />
                {pinErrors.currentPin && <span className="error-message">{pinErrors.currentPin}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">New PIN</label>
                <input
                  type="password"
                  className={`form-input ${pinErrors.newPin ? 'error' : ''}`}
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => handlePinChange(e.target.value, 'new')}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={isChangingPin}
                  placeholder="Enter new PIN"
                />
                {pinErrors.newPin && <span className="error-message">{pinErrors.newPin}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New PIN</label>
                <input
                  type="password"
                  className={`form-input ${pinErrors.confirmPin ? 'error' : ''}`}
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => handlePinChange(e.target.value, 'confirm')}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={isChangingPin}
                  placeholder="Confirm new PIN"
                />
                {pinErrors.confirmPin && <span className="error-message">{pinErrors.confirmPin}</span>}
              </div>

              <div className="pin-change-modal-actions">
                <button 
                  className="btn-primary" 
                  onClick={handleChangePin}
                  disabled={
                    isChangingPin || 
                    currentPin.length !== 4 || 
                    newPin.length !== 4 || 
                    confirmPin.length !== 4
                  }
                >
                  {isChangingPin ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="fa-spin" style={{ marginRight: '8px' }} />
                      Changing...
                    </>
                  ) : (
                    'Change PIN'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="logout-confirm-modal-overlay" onClick={handleLogoutCancel}>
          <div className="logout-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logout-confirm-modal-icon">
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </div>
            <h3 className="logout-confirm-modal-title">Confirm Sign Out</h3>
            <p className="logout-confirm-modal-message">
              Are you sure you want to sign out? You'll need to sign in again to access your account.
            </p>
            <div className="logout-confirm-modal-actions">
              <button 
                className="btn-secondary" 
                onClick={handleLogoutCancel}
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button 
                className="btn-logout" 
                onClick={handleLogoutConfirm}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin" style={{ marginRight: '8px' }} />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faRightFromBracket} />
                    Sign Out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

