import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faEnvelope } from '@fortawesome/free-solid-svg-icons'
import '../../index.css'

export default function Step1PersonalInfo({ formData, updateFormData, onNext }) {
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
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
        <h2>Personal Information</h2>
        <p>Tell us about yourself</p>
      </div>

      <div className="form-group">
        <label className="form-label">
          <FontAwesomeIcon icon={faUser} className="label-icon" />
          First Name
        </label>
        <input
          type="text"
          className={`form-input ${errors.firstName ? 'error' : ''}`}
          placeholder="Enter your first name"
          value={formData.firstName}
          onChange={(e) => updateFormData('firstName', e.target.value)}
        />
        {errors.firstName && <span className="error-message">{errors.firstName}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">
          <FontAwesomeIcon icon={faUser} className="label-icon" />
          Last Name
        </label>
        <input
          type="text"
          className={`form-input ${errors.lastName ? 'error' : ''}`}
          placeholder="Enter your last name"
          value={formData.lastName}
          onChange={(e) => updateFormData('lastName', e.target.value)}
        />
        {errors.lastName && <span className="error-message">{errors.lastName}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">
          <FontAwesomeIcon icon={faEnvelope} className="label-icon" />
          Email Address
        </label>
        <input
          type="email"
          className={`form-input ${errors.email ? 'error' : ''}`}
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
        />
        {errors.email && <span className="error-message">{errors.email}</span>}
      </div>

      <button className="btn-primary" onClick={handleNext}>
        Continue
      </button>
    </div>
  )
}

