import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved, faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../../lib/supabase'
import { detectVPNAndCountry, getVPNBlockMessage } from '../../lib/vpnDetection'
import '../../index.css'

export default function Step3Verification({ formData, onNext, onBack, onComplete }) {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    // Send verification code when component mounts
    sendVerificationCode()
  }, [])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const sendVerificationCode = async () => {
    try {
      setIsResending(true)
      setErrors({})
      
      // Resend OTP code using Supabase
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
          shouldCreateUser: false, // Don't create new user, just resend code
        }
      })

      if (error) {
        setErrors({ resend: error.message || 'Failed to resend code. Please try again.' })
      } else {
        setCountdown(60)
      }
    } catch (error) {
      console.error('Error sending verification code:', error)
      setErrors({ resend: 'Failed to resend code. Please try again.' })
    } finally {
      setIsResending(false)
    }
  }

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return
    
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    const newCode = [...code]
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 6) {
        newCode[i] = pastedData[i]
      }
    }
    setCode(newCode)
  }

  const verifyCode = async () => {
    const verificationCode = code.join('')
    
    if (verificationCode.length !== 6) {
      setErrors({ code: 'Please enter the complete verification code' })
      return
    }

    if (!/^\d+$/.test(verificationCode)) {
      setErrors({ code: 'Verification code must contain only numbers' })
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      // First, detect VPN and country before proceeding with verification
      let vpnData = null
      try {
        vpnData = await detectVPNAndCountry()
        
        // Block VPN users
        if (vpnData.isBlocked) {
          setErrors({ vpn: getVPNBlockMessage() })
          setIsLoading(false)
          return
        }
      } catch (vpnError) {
        console.error('VPN detection error:', vpnError)
        // Continue with signup if VPN detection fails (don't block legitimate users)
        // You can choose to block here if you want strict enforcement
        // setErrors({ vpn: 'Unable to verify your connection. Please try again.' })
        // setIsLoading(false)
        // return
      }

      // Verify the OTP code with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: verificationCode,
        type: 'email'
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // After OTP verification, update user with password (8-digit) and metadata
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.password, // 8-digit password
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        })

        if (updateError) {
          console.error('Error updating user:', updateError)
          // Continue even if password update fails - user is verified
        }

        // Create user profile with KYC URLs and country information
        await createUserProfile(data.user, vpnData)
        onComplete(data.user)
      }
    } catch (error) {
      console.error('Verification error:', error)
      setErrors({ code: error.message || 'Invalid verification code. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const createUserProfile = async (user, vpnData = null) => {
    try {
      const profileData = {
        id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
          balance: 100.00, // Set initial balance to 100
          password: formData.pin || formData.password, // Store PIN as password (plain text)
          selfie_url: formData.selfieUrl || null,
          doc_url: formData.docUrl || null,
          updated_at: new Date().toISOString()
      }

      // Add country information if available
      if (vpnData) {
        profileData.country = vpnData.country || null
        profileData.country_code = vpnData.countryCode || null
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id'
        })

      if (profileError) {
        console.error('Error creating/updating profile:', profileError)
        // Don't throw - profile creation is optional
      }
    } catch (error) {
      console.error('Error in createUserProfile:', error)
    }
  }

  return (
    <div className="signup-step">
      <div className="step-header">
        <FontAwesomeIcon icon={faShieldHalved} className="step-icon" />
        <h2>Verify Your Email</h2>
        <p>We've sent a verification code to</p>
        <p className="email-display">{formData.email}</p>
      </div>

      <div className="verification-code-container">
        {code.map((digit, index) => (
          <input
            key={index}
            id={`code-${index}`}
            type="text"
            className={`code-input ${errors.code ? 'error' : ''}`}
            maxLength={1}
            value={digit}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            inputMode="numeric"
            pattern="[0-9]*"
          />
        ))}
      </div>
      {errors.code && <span className="error-message">{errors.code}</span>}
      {errors.vpn && (
        <div className="error-banner" style={{ marginTop: '16px' }}>
          {errors.vpn}
        </div>
      )}

      <div className="resend-code">
        <p>Didn't receive the code?</p>
        <button
          className="resend-button"
          onClick={sendVerificationCode}
          disabled={countdown > 0 || isResending}
        >
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
        </button>
        {errors.resend && <span className="error-message">{errors.resend}</span>}
      </div>

      <div className="form-actions">
        <button className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button 
          className="btn-primary" 
          onClick={verifyCode}
          disabled={isLoading || code.join('').length !== 6}
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>
      </div>
    </div>
  )
}

