import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faPhone,
  faEnvelope,
  faComments,
  faClock
} from '@fortawesome/free-solid-svg-icons'
import '../index.css'

export default function CustomerCareScreen({ onBack }) {
  const [selectedMethod, setSelectedMethod] = useState(null)

  const contactMethods = [
    {
      id: 'phone',
      icon: faPhone,
      title: 'Call Us',
      description: '24/7 Customer Support',
      value: '+880 1234-567890',
      action: 'call'
    },
    {
      id: 'email',
      icon: faEnvelope,
      title: 'Email Us',
      description: 'Send us an email',
      value: 'support@taptapsend.com',
      action: 'email'
    },
    {
      id: 'chat',
      icon: faComments,
      title: 'Live Chat',
      description: 'Chat with our support team',
      value: 'Available 24/7',
      action: 'chat'
    }
  ]

  const handleContact = (method) => {
    if (method.action === 'call') {
      window.location.href = `tel:${method.value.replace(/\s/g, '')}`
    } else if (method.action === 'email') {
      window.location.href = `mailto:${method.value}`
    } else if (method.action === 'chat') {
      setSelectedMethod(method.id)
      // In a real app, this would open a chat widget
      alert('Live chat feature coming soon!')
    }
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

          <div className="contact-methods">
            {contactMethods.map((method) => (
              <div
                key={method.id}
                className="contact-method-card"
                onClick={() => handleContact(method)}
              >
                <div className="contact-method-icon">
                  <FontAwesomeIcon icon={method.icon} />
                </div>
                <div className="contact-method-details">
                  <h3>{method.title}</h3>
                  <p className="contact-method-desc">{method.description}</p>
                  <p className="contact-method-value">{method.value}</p>
                </div>
                <div className="contact-method-arrow">
                  →
                </div>
              </div>
            ))}
          </div>

          <div className="care-hours">
            <div className="care-hours-header">
              <FontAwesomeIcon icon={faClock} />
              <h3>Support Hours</h3>
            </div>
            <div className="care-hours-content">
              <p><strong>24/7 Support</strong></p>
              <p>Our customer care team is available round the clock to assist you.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

