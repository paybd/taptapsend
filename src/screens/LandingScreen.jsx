import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { detectVPNAndCountry } from '../lib/vpnDetection'
import { getCurrencyForCountry } from '../lib/currencyMapping'
import '../index.css'

export default function LandingScreen({ onLogin, onSignUp, onGoogleLogin }) {
  const [sendAmount, setSendAmount] = useState('1')
  const [sendCurrency, setSendCurrency] = useState(null)
  const [userCountryCode, setUserCountryCode] = useState(null)
  const [userCountry, setUserCountry] = useState(null)
  const [currencyName, setCurrencyName] = useState('')
  const [currencyFlag, setCurrencyFlag] = useState('')
  const [rates, setRates] = useState({}) // Store rates for all currencies
  const [isLoadingRate, setIsLoadingRate] = useState(true)
  
  // Receiving currency is always Bangladesh (BDT)
  const receiveCurrency = 'BDT'

  // Currency mapping with flags and names
  const currencyInfo = {
    'AED': { flag: '🇦🇪', name: 'UAE Dirham' },
    'SAR': { flag: '🇸🇦', name: 'Saudi Riyal' },
    'QAR': { flag: '🇶🇦', name: 'Qatari Riyal' },
    'KWD': { flag: '🇰🇼', name: 'Kuwaiti Dinar' },
    'OMR': { flag: '🇴🇲', name: 'Omani Rial' },
    'BHD': { flag: '🇧🇭', name: 'Bahraini Dinar' },
    'EUR': { flag: '🇪🇺', name: 'Euro' },
    'GBP': { flag: '🇬🇧', name: 'British Pound' },
    'CHF': { flag: '🇨🇭', name: 'Swiss Franc' },
    'SEK': { flag: '🇸🇪', name: 'Swedish Krona' },
    'NOK': { flag: '🇳🇴', name: 'Norwegian Krone' },
    'DKK': { flag: '🇩🇰', name: 'Danish Krone' },
    'PLN': { flag: '🇵🇱', name: 'Polish Zloty' },
    'USD': { flag: '🇺🇸', name: 'US Dollar' },
    'CAD': { flag: '🇨🇦', name: 'Canadian Dollar' },
    'AUD': { flag: '🇦🇺', name: 'Australian Dollar' },
    'JPY': { flag: '🇯🇵', name: 'Japanese Yen' },
    'CNY': { flag: '🇨🇳', name: 'Chinese Yuan' },
    'INR': { flag: '🇮🇳', name: 'Indian Rupee' },
    'PKR': { flag: '🇵🇰', name: 'Pakistani Rupee' },
  }

  // Detect user's location and fetch rates on mount
  useEffect(() => {
    detectLocationAndFetchRates()
  }, [])

  const detectLocationAndFetchRates = async () => {
    try {
      setIsLoadingRate(true)
      
      // Detect user's country using VPN API
      const locationData = await detectVPNAndCountry()
      
      if (locationData && locationData.countryCode) {
        setUserCountryCode(locationData.countryCode)
        setUserCountry(locationData.country || 'Unknown')
        
        // Get currency for the detected country
        const detectedCurrency = getCurrencyForCountry(locationData.countryCode)
        
        // Set the currency and its display info
        setSendCurrency(detectedCurrency)
        const currencyData = currencyInfo[detectedCurrency] || { flag: '💱', name: detectedCurrency }
        setCurrencyFlag(currencyData.flag)
        setCurrencyName(currencyData.name)
        
        // Fetch rate for user's country from Supabase
        const { data: rateData, error: rateError } = await supabase
          .from('rates')
          .select('company_rate, original_rate')
          .eq('country_code', locationData.countryCode)
          .single()

        if (!rateError && rateData && rateData.company_rate) {
          // Store the rate for user's currency
          const userRate = parseFloat(rateData.company_rate)
          console.log(`Fetched rate for ${detectedCurrency} (${locationData.countryCode}):`, userRate)
          setRates(prev => ({
            ...prev,
            [detectedCurrency]: userRate
          }))
        } else {
          console.warn(`Rate not found for country ${locationData.countryCode} (${detectedCurrency}):`, rateError)
        }
      } else {
        console.warn('Could not detect user location')
      }
    } catch (error) {
      console.error('Error detecting location or fetching rates:', error)
    } finally {
      setIsLoadingRate(false)
    }
  }


  // Get current rate - only use fetched rate from Supabase
  const getCurrentRate = () => {
    return rates[sendCurrency] || null
  }

  const currentRate = getCurrentRate()
  const receiveAmount = currentRate ? (parseFloat(sendAmount) || 0) * currentRate : 0

  const formatReceiveAmount = (amount) => {
    return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const formatSendAmount = (amount) => {
    if (!amount || amount === '') return ''
    return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="landing-screen">
      {/* Logo and Branding */}
      <div className="landing-header">
        <div className="logo-container">
          <div className="logo-circle">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Bird body (white) */}
              <ellipse cx="40" cy="45" rx="20" ry="25" fill="white"/>
              {/* Bird head (red) */}
              <circle cx="40" cy="30" r="12" fill="#ef4444"/>
              {/* Bird crest (red) */}
              <path d="M 40 20 L 35 15 L 40 18 L 45 15 Z" fill="#ef4444"/>
              {/* Wing/Tail (dark green) */}
              <ellipse cx="50" cy="50" rx="15" ry="20" fill="#166534"/>
              {/* Eye */}
              <circle cx="43" cy="28" r="2" fill="white"/>
            </svg>
          </div>
        </div>
        <h1 className="app-title">Taptap Send</h1>
        <div className="no-fees-badge">
          <FontAwesomeIcon icon={faHeart} className="heart-icon" />
          <span>No transfer fees on this transfer</span>
        </div>
      </div>

      {/* Currency Converter Widget */}
      <div className="converter-widget">
        <div className="currency-input-group">
          <label className="currency-label">You send:</label>
          <div className="currency-input-wrapper">
            <input
              type="number"
              className="currency-input"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              placeholder="0"
              step="0.01"
              min="0"
              disabled={!sendCurrency}
            />
            <div className="currency-selector receive-currency" style={{ cursor: 'default', opacity: sendCurrency ? 1 : 0.6 }}>
              {isLoadingRate ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px' }}>
                  <FontAwesomeIcon icon={faSpinner} className="fa-spin" style={{ fontSize: '14px' }} />
                </div>
              ) : sendCurrency ? (
                <>
                  <span className="currency-flag">{currencyFlag}</span>
                  <span className="currency-code">{sendCurrency}</span>
                </>
              ) : (
                <span className="currency-code" style={{ fontSize: '14px' }}>Detecting...</span>
              )}
            </div>
          </div>
          {sendCurrency && userCountry && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '4px' }}>
              Based on your location: {userCountry}
            </div>
          )}
        </div>

        <div className="currency-input-group">
          <label className="currency-label">They receive:</label>
          <div className="currency-input-wrapper">
            <input
              type="text"
              className="currency-input"
              value={currentRate ? formatReceiveAmount(receiveAmount) : '0'}
              readOnly
              placeholder={currentRate ? '' : 'Rate not available'}
            />
            <div className="currency-selector receive-currency">
              <span className="currency-flag">🇧🇩</span>
              <span className="currency-code">{receiveCurrency}</span>
            </div>
          </div>
        </div>

        <div className="exchange-rate">
          {isLoadingRate ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <FontAwesomeIcon icon={faSpinner} className="fa-spin" style={{ fontSize: '14px' }} />
              <span>Loading exchange rate...</span>
            </div>
          ) : currentRate && sendCurrency ? (
            <>
              Exchange rate: 1 {sendCurrency} = {receiveCurrency} {currentRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </>
          ) : sendCurrency ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Rate not available for {sendCurrency}. Please try again later.
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Detecting your location...
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="landing-actions">
        <div className="auth-buttons-row">
          <button className="btn-login" onClick={onLogin}>
            LOG IN
          </button>
          <button className="btn-signup" onClick={onSignUp}>
            SIGN UP
          </button>
        </div>
        <div className="divider">
          <span>Or</span>
        </div>
        <button className="btn-google" onClick={onGoogleLogin}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.6 10.2273C19.6 9.51818 19.5364 8.83636 19.4182 8.18182H10V12.05H15.3818C15.15 13.3 14.4455 14.3591 13.3864 15.0682V17.5773H16.6182C18.5091 15.8364 19.6 13.2727 19.6 10.2273Z" fill="#4285F4"/>
            <path d="M10 20C12.7 20 14.9636 19.1045 16.6182 17.5773L13.3864 15.0682C12.4909 15.6682 11.3455 16.0227 10 16.0227C7.39545 16.0227 5.19091 14.2636 4.40455 11.9H1.06364V14.4909C2.70909 17.7591 6.09091 20 10 20Z" fill="#34A853"/>
            <path d="M4.40455 11.9C4.20455 11.3 4.09091 10.6591 4.09091 10C4.09091 9.34091 4.20455 8.7 4.40455 8.1V5.50909H1.06364C0.386364 6.85909 0 8.38636 0 10C0 11.6136 0.386364 13.1409 1.06364 14.4909L4.40455 11.9Z" fill="#FBBC05"/>
            <path d="M10 3.97727C11.4682 3.97727 12.7864 4.48182 13.8227 5.47273L16.6909 2.60455C14.9591 0.990909 12.6955 0 10 0C6.09091 0 2.70909 2.24091 1.06364 5.50909L4.40455 8.1C5.19091 5.73636 7.39545 3.97727 10 3.97727Z" fill="#EA4335"/>
          </svg>
          CONTINUE WITH GOOGLE
        </button>
      </div>
    </div>
  )
}

