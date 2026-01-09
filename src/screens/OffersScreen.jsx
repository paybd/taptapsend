import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faHeadset } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import '../index.css'

export default function OffersScreen({ onNavigate }) {
  const [offers, setOffers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadOffers()
    
    // Update countdown every second
    const interval = setInterval(() => {
      setOffers(prevOffers => [...prevOffers]) // Trigger re-render for countdown
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const loadOffers = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const now = new Date().toISOString()
      
      // Fetch offers that haven't ended yet
      const { data, error: fetchError } = await supabase
        .from('offers')
        .select('*')
        .gte('end_date', now)
        .order('end_date', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      setOffers(data || [])
    } catch (err) {
      console.error('Error loading offers:', err)
      setError('Failed to load offers. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateTimeRemaining = (endDate) => {
    const now = new Date()
    const end = new Date(endDate)
    const difference = end - now

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((difference % (1000 * 60)) / 1000)

    return { days, hours, minutes, seconds, expired: false }
  }

  const formatTimeRemaining = (timeRemaining) => {
    if (timeRemaining.expired) {
      return 'Expired'
    }

    const parts = []
    if (timeRemaining.days > 0) {
      parts.push(`${timeRemaining.days}d`)
    }
    if (timeRemaining.hours > 0 || parts.length > 0) {
      parts.push(`${timeRemaining.hours}h`)
    }
    if (timeRemaining.minutes > 0 || parts.length > 0) {
      parts.push(`${timeRemaining.minutes}m`)
    }
    parts.push(`${timeRemaining.seconds}s`)

    return parts.join(' ')
  }

  const handleContact = () => {
    if (onNavigate) {
      onNavigate('customer-care')
    }
  }

  if (isLoading) {
    return (
      <div className="full-screen-loader">
        <div className="loader-spinner"></div>
        <div className="loader-text">Loading offers...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="screen-content">
        <h2>Offers</h2>
        <div style={{ 
          padding: '20px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '12px',
          color: 'var(--danger-color)',
          marginTop: '20px'
        }}>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="screen-content">
      <h2>Special Offers</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Check out our latest offers and promotions
      </p>

      {offers.length === 0 ? (
        <div className="offers-empty-state">
          <div className="offers-empty-icon">🎁</div>
          <h3>No Active Offers</h3>
          <p>There are currently no active offers. Check back soon for exciting promotions!</p>
          <button className="btn-primary" onClick={handleContact}>
            <FontAwesomeIcon icon={faHeadset} />
            <span>Contact Us</span>
          </button>
        </div>
      ) : (
        <div className="offers-list">
          {offers.map((offer) => {
            const timeRemaining = calculateTimeRemaining(offer.end_date)
            
            return (
              <div key={offer.id} className="offer-card">
                <div className="offer-header">
                  <h3 className="offer-title">{offer.title}</h3>
                  {!timeRemaining.expired && (
                    <div className="offer-countdown">
                      <FontAwesomeIcon icon={faClock} />
                      <span>{formatTimeRemaining(timeRemaining)}</span>
                    </div>
                  )}
                </div>
                <p className="offer-description">{offer.description}</p>
                <div className="offer-footer">
                  <button className="btn-primary offer-contact-btn" onClick={handleContact}>
                    <FontAwesomeIcon icon={faHeadset} />
                    <span>Contact</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
