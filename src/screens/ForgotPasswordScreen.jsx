import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faEnvelope, faArrowLeft, faShieldHalved, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import '../index.css'

export default function ForgotPasswordScreen({ onClose, onBackToLogin }) {
  const [step, setStep] = useState(1) // 1: email input, 2: OTP verification, 3: new password
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(60)

  // Countdown timer
  useEffect(() => {
    if (countdown > 0 && step === 2) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown, step])

  const handleEmailSubmit = async (e) => {
    e?.preventDefault()
    
    if (!email.trim()) {
      setErrors({ email: 'Email is required' })
      return
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Please enter a valid email' })
      return
    }

    setIsLoading(true)
    setError(null)
    setErrors({})

    try {
      // Send OTP code using signInWithOtp
      // This will send a 6-digit OTP code to the email
      const { error: resetError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false, // Don't create new user, only send OTP to existing users
        }
      })

      if (resetError) {
        throw resetError
      }

      // OTP sent successfully, move to verification step
      setStep(2)
      setCountdown(60)
    } catch (err) {
      setError(err.message || 'Failed to send reset code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return
    
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-code-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`reset-code-${index - 1}`)
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

  const handleVerifyCode = async () => {
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
    setError(null)

    try {
      // Verify OTP code - using 'email' type since we used signInWithOtp
      // This will authenticate the user and create a session
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: verificationCode,
        type: 'email' // Use 'email' type for signInWithOtp verification
      })

      if (verifyError) {
        throw verifyError
      }

      if (data.user && data.session) {
        // User is now authenticated with a session
        // Move to password reset step where they can set new password
        setStep(3)
      } else {
        throw new Error('Verification failed. Please try again.')
      }
    } catch (err) {
      console.error('OTP verification error:', err)
      setErrors({ code: err.message || 'Invalid verification code. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e?.preventDefault()
    
    const newErrors = {}
    
    if (!newPassword) {
      newErrors.newPassword = 'Password is required'
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, and number'
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    setError(null)
    setErrors({})

    try {
      // Check if user has an active session (should exist after OTP verification)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('Session expired. Please start the password reset process again.')
      }

      // User is authenticated, update password using the active session
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        throw updateError
      }

      // Password updated successfully, sign out so user can log in with new password
      await supabase.auth.signOut()

      // Go back to login with success message
      if (onBackToLogin) {
        onBackToLogin('Password reset successful! Please sign in with your new password.')
      }
    } catch (err) {
      console.error('Password update error:', err)
      setError(err.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: resetError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: false,
        }
      })

      if (resetError) {
        throw resetError
      }

      setCountdown(60)
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="forgot-password-screen">
      <div className="forgot-password-header">
        <button className="close-button" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <div className="forgot-password-title-section">
          {step === 1 && (
            <>
              <h1 className="forgot-password-title">Forgot Password?</h1>
              <p className="forgot-password-subtitle">Enter your email to receive a reset code</p>
            </>
          )}
          {step === 2 && (
            <>
              <FontAwesomeIcon icon={faShieldHalved} className="step-icon" />
              <h1 className="forgot-password-title">Verify Your Email</h1>
              <p className="forgot-password-subtitle">Enter the code sent to {email}</p>
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="forgot-password-title">Reset Password</h1>
              <p className="forgot-password-subtitle">Enter your new password</p>
            </>
          )}
        </div>
      </div>

      <div className="forgot-password-content">
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {/* Step 1: Email Input */}
        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="forgot-password-form">
            <div className="form-group">
              <label className="form-label">
                <FontAwesomeIcon icon={faEnvelope} className="label-icon" />
                Email Address
              </label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors(prev => ({ ...prev, email: '' }))
                  setError(null)
                }}
                disabled={isLoading}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>

            <button 
              type="button" 
              className="btn-back-to-login" 
              onClick={onBackToLogin}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to Login
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <div className="forgot-password-form">
            <div className="verification-code-container">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`reset-code-${index}`}
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

            <div className="resend-code">
              <p>Didn't receive the code?</p>
              <button
                className="resend-button"
                onClick={handleResendCode}
                disabled={countdown > 0 || isLoading}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
              </button>
            </div>

            <button 
              className="btn-primary" 
              onClick={handleVerifyCode}
              disabled={isLoading || code.join('').length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button 
              type="button" 
              className="btn-back-to-login" 
              onClick={() => setStep(1)}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back
            </button>
          </div>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <form onSubmit={handlePasswordReset} className="forgot-password-form">
            <div className="form-group">
              <label className="form-label">
                <FontAwesomeIcon icon={faShieldHalved} className="label-icon" />
                New Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.newPassword ? 'error' : ''}`}
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setErrors(prev => ({ ...prev, newPassword: '' }))
                    setError(null)
                  }}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
              {errors.newPassword && <span className="error-message">{errors.newPassword}</span>}
              <div className="password-hints">
                <p>Password must contain:</p>
                <ul>
                  <li className={newPassword.length >= 8 ? 'valid' : ''}>At least 8 characters</li>
                  <li className={/(?=.*[a-z])/.test(newPassword) ? 'valid' : ''}>One lowercase letter</li>
                  <li className={/(?=.*[A-Z])/.test(newPassword) ? 'valid' : ''}>One uppercase letter</li>
                  <li className={/(?=.*\d)/.test(newPassword) ? 'valid' : ''}>One number</li>
                </ul>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FontAwesomeIcon icon={faShieldHalved} className="label-icon" />
                Confirm Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setErrors(prev => ({ ...prev, confirmPassword: '' }))
                    setError(null)
                  }}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                </button>
              </div>
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>

            <button 
              type="button" 
              className="btn-back-to-login" 
              onClick={() => setStep(2)}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

