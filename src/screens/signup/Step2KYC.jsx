import { useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faIdCard, 
  faCamera, 
  faImage, 
  faTimes,
  faSpinner
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../../lib/supabase'
import '../../index.css'

export default function Step2KYC({ formData, updateFormData, onNext, onBack }) {
  const [selfieFile, setSelfieFile] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)
  const [docFile, setDocFile] = useState(null)
  const [docPreview, setDocPreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [isUploading, setIsUploading] = useState(false)
  const selfieInputRef = useRef(null)
  const docInputRef = useRef(null)

  const handleSelfieChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ selfie: 'Please upload an image file' })
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ selfie: 'Image size should be less than 5MB' })
        return
      }

      setSelfieFile(file)
      setErrors({ ...errors, selfie: '' })
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelfiePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDocChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({ doc: 'Please upload an image file' })
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ doc: 'Image size should be less than 5MB' })
        return
      }

      setDocFile(file)
      setErrors({ ...errors, doc: '' })
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setDocPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveSelfie = () => {
    setSelfieFile(null)
    setSelfiePreview(null)
    if (selfieInputRef.current) {
      selfieInputRef.current.value = ''
    }
  }

  const handleRemoveDoc = () => {
    setDocFile(null)
    setDocPreview(null)
    if (docInputRef.current) {
      docInputRef.current.value = ''
    }
  }

  const uploadImageToStorage = async (file, userId, type) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${type}_${Date.now()}.${fileExt}`
    const filePath = `kyc/${fileName}`

    const { data, error: uploadError } = await supabase.storage
      .from('kyc')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to upload ${type}: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('kyc')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  const handleNext = async () => {
    const newErrors = {}
    
    if (!selfieFile) {
      newErrors.selfie = 'Please upload a selfie image'
    }
    
    if (!docFile) {
      newErrors.doc = 'Please upload a document image'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsUploading(true)
    setErrors({})

    try {
      // Generate a temporary user ID for upload (we'll use email hash)
      // Since user isn't created yet, we'll use a temporary identifier
      const tempUserId = formData.email.replace(/[^a-zA-Z0-9]/g, '_')

      // Upload selfie
      const selfieUrl = await uploadImageToStorage(selfieFile, tempUserId, 'selfie')
      
      // Upload document
      const docUrl = await uploadImageToStorage(docFile, tempUserId, 'doc')

      // Store URLs in formData
      updateFormData('selfieUrl', selfieUrl)
      updateFormData('docUrl', docUrl)

      // Proceed to next step
      onNext()
    } catch (error) {
      console.error('Error uploading images:', error)
      setErrors({ upload: error.message || 'Failed to upload images. Please try again.' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="signup-step">
      <div className="step-header">
        <FontAwesomeIcon icon={faIdCard} className="step-icon" />
        <h2>KYC Verification</h2>
        <p>Please upload your selfie and a valid ID document</p>
      </div>

      {errors.upload && (
        <div className="error-banner">
          {errors.upload}
        </div>
      )}

      {/* Selfie Camera Capture */}
      <div className="form-group">
        <label className="form-label">
          <FontAwesomeIcon icon={faCamera} className="label-icon" />
          Selfie Photo
        </label>
        {!selfiePreview ? (
          <div className="file-upload-area">
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleSelfieChange}
              className="file-input"
              id="selfie-upload"
              disabled={isUploading}
            />
            <label htmlFor="selfie-upload" className="file-upload-label">
              <FontAwesomeIcon icon={faCamera} />
              <span>Take a selfie</span>
              <span className="file-upload-hint">Tap to open camera</span>
            </label>
          </div>
        ) : (
          <div className="receipt-preview-container">
            <img src={selfiePreview} alt="Selfie preview" className="receipt-preview" />
            <button
              type="button"
              className="remove-receipt-btn"
              onClick={handleRemoveSelfie}
              disabled={isUploading}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}
        {errors.selfie && <span className="error-message">{errors.selfie}</span>}
      </div>

      {/* Document Upload */}
      <div className="form-group">
        <label className="form-label">
          <FontAwesomeIcon icon={faIdCard} className="label-icon" />
          ID Document
        </label>
        {!docPreview ? (
          <div className="file-upload-area">
            <input
              ref={docInputRef}
              type="file"
              accept="image/*"
              onChange={handleDocChange}
              className="file-input"
              id="doc-upload"
              disabled={isUploading}
            />
            <label htmlFor="doc-upload" className="file-upload-label">
              <FontAwesomeIcon icon={faImage} />
              <span>Click to upload document</span>
              <span className="file-upload-hint">PNG, JPG up to 5MB</span>
            </label>
          </div>
        ) : (
          <div className="receipt-preview-container">
            <img src={docPreview} alt="Document preview" className="receipt-preview" />
            <button
              type="button"
              className="remove-receipt-btn"
              onClick={handleRemoveDoc}
              disabled={isUploading}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}
        {errors.doc && <span className="error-message">{errors.doc}</span>}
      </div>

      <div className="form-actions">
        <button 
          className="btn-secondary" 
          onClick={onBack}
          disabled={isUploading}
        >
          Back
        </button>
        <button 
          className="btn-primary" 
          onClick={handleNext}
          disabled={isUploading || !selfieFile || !docFile}
        >
          {isUploading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
              Uploading...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  )
}

