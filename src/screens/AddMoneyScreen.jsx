import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faArrowRight,
  faMobileScreenButton,
  faBuildingColumns,
  faCreditCard,
  faChartLine,
  faSpinner
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { getCurrencyForCountry } from '../lib/currencyMapping'
import '../index.css'

export default function AddMoneyScreen({ onBack, onNavigate }) {
  const [todayRate, setTodayRate] = useState(null)
  const [isLoadingRate, setIsLoadingRate] = useState(true)
  const [userCountryCode, setUserCountryCode] = useState(null)
  useEffect(() => {
    loadUserCountryAndRate()
  }, [])

  const loadUserCountryAndRate = async () => {
    try {
      setIsLoadingRate(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoadingRate(false)
        return
      }

      // Load user profile to get country_code
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        setIsLoadingRate(false)
        return
      }

      if (profileData && profileData.country_code) {
        setUserCountryCode(profileData.country_code)

        // Fetch rate based on country_code
        const { data: rateData, error: rateError } = await supabase
          .from('rates')
          .select('company_rate, original_rate')
          .eq('country_code', profileData.country_code)
          .single()

        if (rateError) {
          console.error('Error loading rate:', rateError)
        } else if (rateData) {
          setTodayRate(parseFloat(rateData.company_rate))
        }
      }
    } catch (error) {
      console.error('Error loading user country and rate:', error)
    } finally {
      setIsLoadingRate(false)
    }
  }

  const depositOptions = [
    {
      icon: '/icons/mobile-payment.png',
      label: 'bKash Deposit',
      description: 'Add money from bKash account',
      color: '#166534',
      screen: 'bkash-deposit'
    },
    {
      icon: '/icons/bank.png',
      label: 'Bank Deposit',
      description: 'Transfer from bank account',
      color: '#166534',
      screen: 'bank-deposit'
    },
    {
      icon: '/icons/payment-method.png',
      label: 'Card Deposit',
      description: 'Add money using debit/credit card',
      color: '#166534',
      screen: 'card-deposit'
    }
  ]

  // Show full screen loader while rate is loading
  if (isLoadingRate) {
    return (
      <div className="add-money-screen">
        <div className="full-screen-loader">
          <div className="loader-spinner"></div>
          <div className="loader-text">Loading exchange rate...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="add-money-screen">
      {/* Header */}
      <div className="add-money-header">
        <button className="back-btn" onClick={onBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="add-money-title">Add Money</h1>
        <div style={{ width: '40px' }}></div> {/* Spacer for centering */}
      </div>

      {/* Today's Rate Card */}
      {userCountryCode && (
        <div className="todays-rate-card">
          <div className="todays-rate-header">
            <FontAwesomeIcon icon={faChartLine} />
            <span className="todays-rate-label">Today's Rate</span>
          </div>
          {todayRate ? (
            <div className="todays-rate-value">
              <span className="todays-rate-amount">
                1 {getCurrencyForCountry(userCountryCode)} = {todayRate.toFixed(2)} BDT
              </span>
              <span className="todays-rate-country">({userCountryCode})</span>
            </div>
          ) : (
            <div className="todays-rate-error">
              Rate not available for your country
            </div>
          )}
        </div>
      )}

      {/* Deposit Options */}
      <div className="deposit-options">
        {depositOptions.map((option, index) => (
          <button 
            key={index} 
            className="deposit-option-card"
            style={{ '--option-color': option.color }}
            onClick={() => {
              if (onNavigate) {
                onNavigate(option.screen)
              }
            }}
          >
            <div className="deposit-option-icon">
              <img src={option.icon} alt={option.label} className="deposit-icon-img" />
            </div>
            <div className="deposit-option-content">
              <div className="deposit-option-label">{option.label}</div>
              <div className="deposit-option-description">{option.description}</div>
            </div>
            <div className="deposit-option-arrow">
              <FontAwesomeIcon icon={faArrowRight} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

