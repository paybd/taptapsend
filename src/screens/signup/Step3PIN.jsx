import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock, faSpinner } from '@fortawesome/free-solid-svg-icons'
import '../../index.css'

export default function Step3PIN({ formData, updateFormData, onNext, onBack }) {
  const [pin, setPin] = useState(['', '', '', ''])
  const [confirmPin, setConfirmPin] = useState(['', '', '', ''])
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePinChange = (index, value, isConfirm = false) => {
    if (value.length > 1) return
    
    const newPin = isConfirm ? [...confirmPin] : [...pin]
    newPin[index] = value.replace(/\D/g, '') // Only allow digits
    setErrors({})
    
    if (isConfirm) {
      setConfirmPin(newPin)
    } else {
      setPin(newPin)
    }

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`${isConfirm ? 'confirm-' : ''}pin-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handlePinKeyDown = (index, e, isConfirm = false) => {
    const currentPin = isConfirm ? confirmPin : pin
    if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
      const prevInput = document.getElementById(`${isConfirm ? 'confirm-' : ''}pin-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handlePinPaste = (e, isConfirm = false) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 4).replace(/\D/g, '')
    const newPin = ['', '', '', '']
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 4) {
        newPin[i] = pastedData[i]
      }
    }
    setErrors({})
    if (isConfirm) {
      setConfirmPin(newPin)
    } else {
      setPin(newPin)
    }
  }

  const validate = () => {
    const newErrors = {}
    const pinValue = pin.join('')
    const confirmPinValue = confirmPin.join('')
    
    if (pinValue.length !== 4) {
      newErrors.pin = 'Please enter the complete 4-digit PIN'
    } else if (!/^\d{4}$/.test(pinValue)) {
      newErrors.pin = 'PIN must contain only numbers'
    }
    
    if (confirmPinValue.length !== 4) {
      newErrors.confirmPin = 'Please confirm your PIN'
    } else if (pinValue !== confirmPinValue) {
      newErrors.confirmPin = 'PINs do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (validate() && !isSubmitting) {
      setIsSubmitting(true)
      try {
        updateFormData('pin', pin.join(''))
        await onNext()
        // If onNext succeeds, the step will change and component will unmount
        // If it fails, reset submitting state after a short delay to allow error to display
        setTimeout(() => {
          setIsSubmitting(false)
        }, 100)
      } catch (error) {
        // Error handling is done in parent component
        setIsSubmitting(false)
      }
    }
  }

  return (
    <div className="signup-step">
      <div className="step-header">
        <FontAwesomeIcon icon={faLock} className="step-icon" />
        <h2>Set Up PIN</h2>
        <p>Create a 4-digit PIN for secure transactions</p>
      </div>

      <div className="form-group">
        <label className="form-label">Enter PIN</label>
        <div className="pin-input-container">
          {pin.map((digit, index) => (
            <input
              key={index}
              id={`pin-${index}`}
              type="text"
              className={`pin-input ${errors.pin ? 'error' : ''}`}
              maxLength={1}
              value={digit}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handlePinKeyDown(index, e)}
              onPaste={(e) => handlePinPaste(e)}
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus={index === 0}
            />
          ))}
        </div>
        {errors.pin && <span className="error-message">{errors.pin}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Confirm PIN</label>
        <div className="pin-input-container">
          {confirmPin.map((digit, index) => (
            <input
              key={index}
              id={`confirm-pin-${index}`}
              type="text"
              className={`pin-input ${errors.confirmPin ? 'error' : ''}`}
              maxLength={1}
              value={digit}
              onChange={(e) => handlePinChange(index, e.target.value, true)}
              onKeyDown={(e) => handlePinKeyDown(index, e, true)}
              onPaste={(e) => handlePinPaste(e, true)}
              inputMode="numeric"
              pattern="[0-9]*"
            />
          ))}
        </div>
        {errors.confirmPin && <span className="error-message">{errors.confirmPin}</span>}
      </div>

      <div className="form-actions">
        <button className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button 
          className="btn-primary" 
          onClick={handleNext}
          disabled={pin.join('').length !== 4 || confirmPin.join('').length !== 4 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="fa-spin" style={{ marginRight: '8px' }} />
              Processing...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  )
}

