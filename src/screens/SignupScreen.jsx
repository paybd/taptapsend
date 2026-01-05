import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import Step1PersonalInfo from './signup/Step1PersonalInfo'
import Step2KYC from './signup/Step2KYC'
import Step3Password from './signup/Step2Password'
import Step4PIN from './signup/Step3PIN'
import Step5Verification from './signup/Step3Verification'
import { supabase } from '../lib/supabase'
import '../index.css'

export default function SignupScreen({ onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    pin: '',
    selfieUrl: '',
    docUrl: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleNext = async () => {
    if (currentStep === 4) {
      // Send OTP code to email for verification
      setIsLoading(true)
      setError(null)

      try {
        // Use signInWithOtp to send a 6-digit OTP code to the email
        // This will create a new user if they don't exist, or send OTP to existing user
        const { data, error: otpError } = await supabase.auth.signInWithOtp({
          email: formData.email,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
            },
            shouldCreateUser: true, // Create user if doesn't exist
            emailRedirectTo: undefined, // Don't use redirect, use OTP code
          }
        })

        if (otpError) {
          // Handle specific error cases
          if (otpError.message.includes('already registered')) {
            throw new Error('An account with this email already exists. Please sign in instead.')
          }
          throw otpError
        }

        // OTP sent successfully, proceed to verification step
        setCurrentStep(5)
      } catch (err) {
        setError(err.message || 'An error occurred while sending verification code')
      } finally {
        setIsLoading(false)
      }
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => prev - 1)
    setError(null)
  }

  const handleComplete = (user) => {
    onComplete(user)
  }

  const totalSteps = 5
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="signup-screen">
      <div className="signup-header">
        <button className="close-button" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="step-indicator">
          Step {currentStep} of {totalSteps}
        </div>
      </div>

      <div className="signup-content">
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {currentStep === 1 && (
          <Step1PersonalInfo
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <Step2KYC
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <Step3Password
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 4 && (
          <Step4PIN
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 5 && (
          <Step5Verification
            formData={formData}
            onNext={handleNext}
            onBack={handleBack}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  )
}

