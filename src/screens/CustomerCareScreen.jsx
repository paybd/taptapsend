import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faEnvelope,
  faGlobe,
  faMapMarkerAlt,
  faSpinner
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import '../index.css'

export default function CustomerCareScreen({ onBack }) {
  const [contactInfo, setContactInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadContactInfo()
  }, [])

  const loadContactInfo = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Fetch contact information from Supabase
      // Assuming there's a customer_care table with a single row
      const { data, error: fetchError } = await supabase
        .from('customer_care')
        .select('whatsapp, website, email, address')
        .maybeSingle()

      if (fetchError) {
        console.error('Error loading contact info:', fetchError)
        setError('Failed to load contact information')
      } else if (data) {
        setContactInfo(data)
      } else {
        // Fallback if no data found
        setContactInfo({
          whatsapp: null,
          website: null,
          email: null,
          address: null
        })
      }
    } catch (error) {
      console.error('Error loading contact info:', error)
      setError('Failed to load contact information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWhatsApp = (whatsappNumber) => {
    if (!whatsappNumber) return
    
    // Remove any non-digit characters except + for international format
    const cleanNumber = whatsappNumber.replace(/[^\d+]/g, '')
    // Open WhatsApp with the number
    window.open(`https://wa.me/${cleanNumber}`, '_blank')
  }

  const handleEmail = (email) => {
    if (!email) return
    window.location.href = `mailto:${email}`
  }

  const handleWebsite = (website) => {
    if (!website) return
    // Ensure website has http:// or https://
    const url = website.startsWith('http://') || website.startsWith('https://') 
      ? website 
      : `https://${website}`
    window.open(url, '_blank')
  }

  if (isLoading) {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <button className="back-btn" onClick={onBack}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <h1 className="screen-title">Customer Care</h1>
          <div style={{ width: '40px' }}></div>
        </div>
        <div className="screen-content">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            color: 'var(--text-secondary)'
          }}>
            <FontAwesomeIcon icon={faSpinner} className="fa-spin" style={{ fontSize: '24px' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-container">
      {/* Header */}
      <div className="screen-header">
        <button className="back-btn" onClick={onBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="screen-title">Customer Care</h1>
        <div style={{ width: '40px' }}></div>
      </div>

      {/* Content */}
      <div className="screen-content">
        <div className="customer-care-section">
          <div className="care-intro">
            <h2>We're Here to Help</h2>
            <p>Get in touch with our support team through any of the following methods:</p>
          </div>

          {error && (
            <div className="error-message-box" style={{ marginBottom: '24px' }}>
              {error}
            </div>
          )}

          <div className="contact-methods">
            {contactInfo?.whatsapp && (
              <div
                className="contact-method-card"
                onClick={() => handleWhatsApp(contactInfo.whatsapp)}
                style={{ cursor: 'pointer' }}
              >
                <div className="contact-method-icon" style={{ 
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' 
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div className="contact-method-details">
                  <h3>WhatsApp</h3>
                  <p className="contact-method-desc">Chat with us on WhatsApp</p>
                  <p className="contact-method-value">{contactInfo.whatsapp}</p>
                </div>
                <div className="contact-method-arrow">
                  →
                </div>
              </div>
            )}

            {contactInfo?.email && (
              <div
                className="contact-method-card"
                onClick={() => handleEmail(contactInfo.email)}
                style={{ cursor: 'pointer' }}
              >
                <div className="contact-method-icon">
                  <FontAwesomeIcon icon={faEnvelope} />
                </div>
                <div className="contact-method-details">
                  <h3>Email Us</h3>
                  <p className="contact-method-desc">Send us an email</p>
                  <p className="contact-method-value">{contactInfo.email}</p>
                </div>
                <div className="contact-method-arrow">
                  →
                </div>
              </div>
            )}

            {contactInfo?.website && (
              <div
                className="contact-method-card"
                onClick={() => handleWebsite(contactInfo.website)}
                style={{ cursor: 'pointer' }}
              >
                <div className="contact-method-icon">
                  <FontAwesomeIcon icon={faGlobe} />
                </div>
                <div className="contact-method-details">
                  <h3>Visit Website</h3>
                  <p className="contact-method-desc">Visit our website</p>
                  <p className="contact-method-value">{contactInfo.website}</p>
                </div>
                <div className="contact-method-arrow">
                  →
                </div>
              </div>
            )}

            {contactInfo?.address && (
              <div className="contact-method-card" style={{ cursor: 'default' }}>
                <div className="contact-method-icon">
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                </div>
                <div className="contact-method-details">
                  <h3>Address</h3>
                  <p className="contact-method-desc">Our office location</p>
                  <p className="contact-method-value">{contactInfo.address}</p>
                </div>
              </div>
            )}
          </div>

          {!contactInfo?.whatsapp && !contactInfo?.email && !contactInfo?.website && !contactInfo?.address && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: 'var(--text-secondary)'
            }}>
              <p>Contact information not available. Please check back later.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
