import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faPaperPlane, 
  faWallet, 
  faMobileScreenButton, 
  faCreditCard, 
  faBuildingColumns,
  faBell,
  faGear,
  faEye,
  faEyeSlash,
  faArrowUp,
  faArrowDown,
  faArrowsRotate
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import '../index.css'

export default function HomeScreen({ onNavigate }) {
  const [balanceVisible, setBalanceVisible] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [balance, setBalance] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [selfieUrl, setSelfieUrl] = useState(null)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)

      if (currentUser) {
        // Load user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (profileError) {
          console.error('Error loading profile:', profileError)
        } else if (profileData) {
          setProfile(profileData)
          setBalance(parseFloat(profileData.balance) || 0)
          setFirstName(profileData.first_name || '')
          setSelfieUrl(profileData.selfie_url || null)
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    await loadUserData(true)
  }

  const getAvatarInitials = () => {
    if (firstName) {
      return firstName.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const getGreetingName = () => {
    if (firstName) {
      return firstName
    }
    if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'User'
  }

  const quickActions = [
    { icon: faWallet, label: 'Add Money', color: '#166534' },
    { icon: faPaperPlane, label: 'Mobile Banking', color: '#166534' },
    { icon: faBuildingColumns, label: 'Bank Transfer', color: '#166534' },
    { icon: faMobileScreenButton, label: 'Mobile Recharge', color: '#166534' },
    { icon: faCreditCard, label: 'Pay Bill', color: '#166534' },
  ]

  const recentTransactions = [
    { id: 1, name: 'John Doe', type: 'sent', amount: 500, date: 'Today', time: '10:30 AM' },
    { id: 2, name: 'Jane Smith', type: 'received', amount: 1200, date: 'Yesterday', time: '3:45 PM' },
    { id: 3, name: 'Mobile Recharge', type: 'paid', amount: 200, date: '2 days ago', time: '9:15 AM' },
    { id: 4, name: 'Electricity Bill', type: 'paid', amount: 850, date: '3 days ago', time: '2:20 PM' },
  ]

  if (isLoading) {
    return (
      <div className="home-screen">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: 'var(--text-secondary)'
        }}>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="home-screen">
      {/* Balance Card - Fixed */}
      <div className="balance-card">
        <div className="balance-header">
          <div className="balance-user-info">
            <div className="balance-avatar">
              {selfieUrl ? (
                <img src={selfieUrl} alt="Profile" className="balance-avatar-img" />
              ) : (
                <span>{getAvatarInitials()}</span>
              )}
            </div>
            <div>
              <div className="balance-greeting">Hello, {getGreetingName()}</div>
              <div className="balance-status">Active</div>
            </div>
          </div>
          <div className="balance-header-actions">
            <button className="icon-btn">
              <FontAwesomeIcon icon={faBell} />
            </button>
            <button className="icon-btn">
              <FontAwesomeIcon icon={faGear} />
            </button>
          </div>
        </div>
        <div className="balance-label-row">
          <span>Available Balance</span>
          <button 
            className="eye-btn"
            onClick={() => setBalanceVisible(!balanceVisible)}
            title={balanceVisible ? 'Hide balance' : 'Show balance'}
          >
            <FontAwesomeIcon icon={balanceVisible ? faEye : faEyeSlash} />
          </button>
        </div>
        <div className="balance-amount-wrapper">
          <div className="balance-amount">
            {balanceVisible ? `৳${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '৳••••••'}
          </div>
          <button 
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh balance"
          >
            <FontAwesomeIcon 
              icon={faArrowsRotate} 
              className={isRefreshing ? 'spinning' : ''}
            />
          </button>
        </div>
        <div className="balance-footer">
          <span className="account-type">Personal Account</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="home-content">
        {/* Quick Actions */}
        <div className="quick-actions">
          <h3 className="section-title">Quick Actions</h3>
          <div className="actions-grid">
            {quickActions.map((action, index) => (
              <button 
                key={index} 
                className="action-btn" 
                style={{ '--action-color': action.color }}
                onClick={() => {
                  if (action.label === 'Add Money' && onNavigate) {
                    onNavigate('add-money')
                  } else if (action.label === 'Mobile Banking' && onNavigate) {
                    onNavigate('mobile-banking')
                  } else if (action.label === 'Bank Transfer' && onNavigate) {
                    onNavigate('bank-transfer')
                  } else if (action.label === 'Mobile Recharge' && onNavigate) {
                    onNavigate('mobile-recharge')
                  } else if (action.label === 'Pay Bill' && onNavigate) {
                    onNavigate('pay-bill')
                  }
                }}
              >
                <span className="action-icon">
                  <FontAwesomeIcon icon={action.icon} />
                </span>
                <span className="action-label">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="transactions-section">
          <div className="section-header">
            <h3 className="section-title">Recent Transactions</h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="transactions-list">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-icon">
                  {transaction.type === 'sent' && <FontAwesomeIcon icon={faArrowUp} />}
                  {transaction.type === 'received' && <FontAwesomeIcon icon={faArrowDown} />}
                  {transaction.type === 'paid' && <FontAwesomeIcon icon={faCreditCard} />}
                </div>
                <div className="transaction-details">
                  <div className="transaction-name">{transaction.name}</div>
                  <div className="transaction-meta">
                    {transaction.date} • {transaction.time}
                  </div>
                </div>
                <div className={`transaction-amount ${transaction.type}`}>
                  {transaction.type === 'sent' || transaction.type === 'paid' ? '-' : '+'}৳{transaction.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

