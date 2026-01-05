import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightFromBracket, faUser, faEnvelope, faGlobe, faIdCard } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { useState, useEffect } from 'react'
import '../index.css'

export default function ProfileScreen({ onLogout }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      if (onLogout) {
        onLogout()
      }
    } catch (error) {
      console.error('Error logging out:', error)
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

  if (isLoading) {
    return (
      <div className="screen-content">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="screen-content">
      <h2>Profile</h2>
      
      {user && (
        <div className="profile-section">
          <div className="profile-card">
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
                  onClick={() => window.open(profile.doc_url, '_blank')}
                />
                <p className="profile-kyc-hint">Tap to view full size</p>
              </div>
            </div>
          )}

          <div className="profile-actions">
            <button className="btn-logout" onClick={handleLogout}>
              <FontAwesomeIcon icon={faRightFromBracket} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

