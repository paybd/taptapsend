import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faCreditCard,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons'
import '../../index.css'

export default function CardDepositScreen({ onBack }) {
  const [amount, setAmount] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [cvv, setCvv] = useState('')

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value) => {
    const v = value.replace(/\D/g, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value)
    setCardNumber(formatted)
  }

  const handleExpiryChange = (e) => {
    const formatted = formatExpiryDate(e.target.value)
    setExpiryDate(formatted)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle card deposit logic here
    console.log('Card Deposit:', { amount, cardNumber, cardHolder, expiryDate, cvv })
  }

  return (
    <div className="deposit-screen">
      {/* Header */}
      <div className="deposit-header">
        <button className="back-btn" onClick={onBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="deposit-title">Card Deposit</h1>
        <div style={{ width: '40px' }}></div>
      </div>

      {/* Content */}
      <div className="deposit-content">
        <div className="deposit-icon-large">
          <FontAwesomeIcon icon={faCreditCard} />
        </div>
        
        <form onSubmit={handleSubmit} className="deposit-form">
          <div className="form-group">
            <label className="form-label">Card Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={handleCardNumberChange}
              maxLength={19}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Card Holder Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Expiry Date</label>
              <input
                type="text"
                className="form-input"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={handleExpiryChange}
                maxLength={5}
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">CVV</label>
              <input
                type="password"
                className="form-input"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                maxLength={4}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Amount (BDT)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="0.01"
              required
            />
          </div>

          <button type="submit" className="deposit-submit-btn">
            <FontAwesomeIcon icon={faCheckCircle} />
            Confirm Deposit
          </button>
        </form>
      </div>
    </div>
  )
}

