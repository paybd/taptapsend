import { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import '../index.css'

export default function LandingScreen({ onLogin, onSignUp, onGoogleLogin }) {
  const [sendAmount, setSendAmount] = useState('1')
  const [sendCurrency, setSendCurrency] = useState('USD')
  const [showSendDropdown, setShowSendDropdown] = useState(false)
  
  // Receiving currency is always Bangladesh (BDT)
  const receiveCurrency = 'BDT'
  
  // Exchange rates to BDT (Bangladeshi Taka)
  // Approximate rates - in real app, these would come from an API
  const exchangeRates = {
    'USD': 110,      // 1 USD = 110 BDT
    'EUR': 120,      // 1 EUR = 120 BDT
    'GBP': 140,      // 1 GBP = 140 BDT
    'AED': 30,       // 1 AED = 30 BDT (UAE Dirham)
    'SAR': 29,       // 1 SAR = 29 BDT (Saudi Riyal)
    'QAR': 30,       // 1 QAR = 30 BDT (Qatari Riyal)
    'KWD': 360,      // 1 KWD = 360 BDT (Kuwaiti Dinar)
    'OMR': 285,      // 1 OMR = 285 BDT (Omani Rial)
    'BHD': 290,      // 1 BHD = 290 BDT (Bahraini Dinar)
    'CHF': 125,      // 1 CHF = 125 BDT (Swiss Franc)
    'SEK': 10.5,     // 1 SEK = 10.5 BDT (Swedish Krona)
    'NOK': 10.2,     // 1 NOK = 10.2 BDT (Norwegian Krone)
    'DKK': 16,       // 1 DKK = 16 BDT (Danish Krone)
    'PLN': 28,       // 1 PLN = 28 BDT (Polish Zloty)
  }

  // Middle East and European countries
  const sendingCurrencies = [
    // Middle East
    { code: 'AED', flag: '🇦🇪', name: 'UAE Dirham' },
    { code: 'SAR', flag: '🇸🇦', name: 'Saudi Riyal' },
    { code: 'QAR', flag: '🇶🇦', name: 'Qatari Riyal' },
    { code: 'KWD', flag: '🇰🇼', name: 'Kuwaiti Dinar' },
    { code: 'OMR', flag: '🇴🇲', name: 'Omani Rial' },
    { code: 'BHD', flag: '🇧🇭', name: 'Bahraini Dinar' },
    // Europe
    { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
    { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
    { code: 'CHF', flag: '🇨🇭', name: 'Swiss Franc' },
    { code: 'SEK', flag: '🇸🇪', name: 'Swedish Krona' },
    { code: 'NOK', flag: '🇳🇴', name: 'Norwegian Krone' },
    { code: 'DKK', flag: '🇩🇰', name: 'Danish Krone' },
    { code: 'PLN', flag: '🇵🇱', name: 'Polish Zloty' },
    // Also include USD as it's commonly used
    { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
  ]

  const currentRate = exchangeRates[sendCurrency] || 110
  const receiveAmount = (parseFloat(sendAmount) || 0) * currentRate

  const formatReceiveAmount = (amount) => {
    return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const formatSendAmount = (amount) => {
    if (!amount || amount === '') return ''
    return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSendDropdown(false)
      }
    }

    if (showSendDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSendDropdown])

  const handleCurrencySelect = (currency) => {
    setSendCurrency(currency.code)
    setShowSendDropdown(false)
  }

  const selectedCurrency = sendingCurrencies.find(c => c.code === sendCurrency) || sendingCurrencies[0]

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
            />
            <div className="currency-selector-wrapper" ref={dropdownRef}>
              <div 
                className="currency-selector"
                onClick={() => setShowSendDropdown(!showSendDropdown)}
              >
                <span className="currency-flag">{selectedCurrency.flag}</span>
                <span className="currency-code">{sendCurrency}</span>
                <FontAwesomeIcon icon={faChevronDown} className={`chevron-icon ${showSendDropdown ? 'open' : ''}`} />
              </div>
              {showSendDropdown && (
                <div className="currency-dropdown">
                  {sendingCurrencies.map((currency) => (
                    <div
                      key={currency.code}
                      className={`currency-option ${sendCurrency === currency.code ? 'selected' : ''}`}
                      onClick={() => handleCurrencySelect(currency)}
                    >
                      <span className="currency-flag">{currency.flag}</span>
                      <span className="currency-name">{currency.name}</span>
                      <span className="currency-code-small">{currency.code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="currency-input-group">
          <label className="currency-label">They receive:</label>
          <div className="currency-input-wrapper">
            <input
              type="text"
              className="currency-input"
              value={formatReceiveAmount(receiveAmount)}
              readOnly
            />
            <div className="currency-selector receive-currency">
              <span className="currency-flag">🇧🇩</span>
              <span className="currency-code">{receiveCurrency}</span>
            </div>
          </div>
        </div>

        <div className="exchange-rate">
          Exchange rate: 1 {sendCurrency} = {receiveCurrency} {currentRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

