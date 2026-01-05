import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'
import '../../index.css'

export default function Step2Password({ formData, updateFormData, onNext, onBack }) {
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const validate = () => {
    const newErrors = {}
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length !== 8) {
      newErrors.password = 'Password must be exactly 8 digits'
    } else if (!/^\d{8}$/.test(formData.password)) {
      newErrors.password = 'Password must contain only digits'
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  return (
    <div className="signup-step">
      <div className="step-header">
        <h2>Create Password</h2>
        <p>Enter an 8-digit password</p>
      </div>

      <div className="form-group">
        <label className="form-label">
          <FontAwesomeIcon icon={faLock} className="label-icon" />
          Password
        </label>
        <div className="password-input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            className={`form-input ${errors.password ? 'error' : ''}`}
            placeholder="Enter 8-digit password"
            value={formData.password}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 8)
              updateFormData('password', value)
            }}
            maxLength={8}
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
          </button>
        </div>
        {errors.password && <span className="error-message">{errors.password}</span>}
        <div className="password-hint">
          <p>Password must be exactly 8 digits (0-9)</p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          <FontAwesomeIcon icon={faLock} className="label-icon" />
          Confirm Password
        </label>
        <div className="password-input-wrapper">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
            placeholder="Confirm 8-digit password"
            value={formData.confirmPassword}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 8)
              updateFormData('confirmPassword', value)
            }}
            maxLength={8}
            inputMode="numeric"
            pattern="[0-9]*"
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

      <div className="form-actions">
        <button className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button className="btn-primary" onClick={handleNext}>
          Continue
        </button>
      </div>
    </div>
  )
}

