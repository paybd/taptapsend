import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faSpinner,
  faCircleCheck,
  faClock,
  faXmarkCircle,
  faXmark,
  faMobileScreenButton,
  faIdCard,
  faBuildingColumns,
  faPhone,
  faBolt,
  faCreditCard
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../lib/supabase'
import { getCurrencyForCountry } from '../lib/currencyMapping'
import '../index.css'

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([])
  const [deposits, setDeposits] = useState([])
  const [allItems, setAllItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'deposits', 'transactions'
  const [userCountryCode, setUserCountryCode] = useState(null)
  const [userCurrency, setUserCurrency] = useState('BDT')
  const [selectedItem, setSelectedItem] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user profile to get country_code
      const { data: profileData } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', user.id)
        .single()

      if (profileData && profileData.country_code) {
        setUserCountryCode(profileData.country_code)
        setUserCurrency(getCurrencyForCountry(profileData.country_code))
      }

      // Fetch deposits
      const { data: depositsData, error: depositsError } = await supabase
        .from('deposit')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (depositsError) {
        console.error('Error fetching deposits:', depositsError)
      }

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError)
      }

      setDeposits(depositsData || [])
      setTransactions(transactionsData || [])

      // Combine and sort by date
      const combined = [
        ...(depositsData || []).map(deposit => ({
          ...deposit,
          itemType: 'deposit',
          displayType: deposit.deposit_type === 'bkash' 
            ? 'bKash Deposit' 
            : deposit.deposit_type === 'gift_card'
            ? 'Gift Card Deposit'
            : 'Bank Deposit',
          amount: deposit.amount,
          status: deposit.status,
          createdAt: deposit.created_at
        })),
        ...(transactionsData || []).map(transaction => ({
          ...transaction,
          itemType: 'transaction',
          displayType: getTransactionDisplayType(transaction),
          amount: transaction.amount,
          status: transaction.status,
          createdAt: transaction.created_at
        }))
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

      setAllItems(combined)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTransactionDisplayType = (transaction) => {
    switch (transaction.type) {
      case 'mobile_banking':
        return `Mobile Banking${transaction.mfs_service ? ` - ${transaction.mfs_service.charAt(0).toUpperCase() + transaction.mfs_service.slice(1)}` : ''}`
      case 'bank_transfer':
        return `Bank Transfer${transaction.bank_name ? ` - ${transaction.bank_name}` : ''}`
      case 'mobile_recharge':
        return `Mobile Recharge${transaction.mfs_service ? ` - ${transaction.mfs_service.charAt(0).toUpperCase() + transaction.mfs_service.slice(1)}` : ''}`
      case 'pay_bill':
        return `Pay Bill${transaction.account_type ? ` - ${transaction.account_type}` : ''}`
      default:
        return transaction.type ? transaction.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Transaction'
    }
  }

  const getTransactionIcon = (item) => {
    if (item.itemType === 'deposit') {
      if (item.deposit_type === 'bkash') {
        return '/icons/bkash.png'
      }
      if (item.deposit_type === 'gift_card') {
        return '/icons/payment-method.png'
      }
      return '/icons/bank.png'
    }

    switch (item.type) {
      case 'mobile_banking':
        return '/icons/mobile-payment.png'
      case 'bank_transfer':
        return '/icons/bank.png'
      case 'mobile_recharge':
        return '/icons/recharge.png'
      case 'pay_bill':
        return '/icons/payment-method.png'
      default:
        return '/icons/wallet.png'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return faCircleCheck
      case 'pending':
        return faClock
      case 'failed':
      case 'rejected':
        return faXmarkCircle
      default:
        return faClock
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return '#16a34a' // green
      case 'pending':
        return '#eab308' // yellow
      case 'failed':
      case 'rejected':
        return '#dc2626' // red
      default:
        return '#6b7280' // gray
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const filteredItems = filter === 'all' 
    ? allItems 
    : filter === 'deposits' 
      ? allItems.filter(item => item.itemType === 'deposit')
      : allItems.filter(item => item.itemType === 'transaction')

  if (isLoading) {
    return (
      <div className="full-screen-loader">
        <div className="loader-spinner"></div>
        <div className="loader-text">Loading transactions...</div>
      </div>
    )
  }

  return (
    <div className="screen-content" style={{ 
      paddingBottom: 'calc(var(--tab-bar-height) + 20px)',
      minHeight: 'calc(100vh - var(--tab-bar-height))'
    }}>
      <h2 style={{ 
        fontSize: '24px', 
        fontWeight: '700', 
        marginBottom: '16px',
        marginTop: '0',
        color: 'var(--text-primary)'
      }}>
        Transactions
      </h2>

      {/* Filter Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '10px 20px',
            borderRadius: '24px',
            border: 'none',
            background: filter === 'all' 
              ? 'linear-gradient(135deg, var(--landing-green) 0%, var(--primary-dark) 100%)' 
              : 'var(--bg-primary)',
            color: filter === 'all' ? 'white' : 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: filter === 'all' ? '0 2px 8px rgba(22, 101, 52, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          All
        </button>
        <button
          onClick={() => setFilter('deposits')}
          style={{
            padding: '10px 20px',
            borderRadius: '24px',
            border: 'none',
            background: filter === 'deposits' 
              ? 'linear-gradient(135deg, var(--landing-green) 0%, var(--primary-dark) 100%)' 
              : 'var(--bg-primary)',
            color: filter === 'deposits' ? 'white' : 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: filter === 'deposits' ? '0 2px 8px rgba(22, 101, 52, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          Deposits
        </button>
        <button
          onClick={() => setFilter('transactions')}
          style={{
            padding: '10px 20px',
            borderRadius: '24px',
            border: 'none',
            background: filter === 'transactions' 
              ? 'linear-gradient(135deg, var(--landing-green) 0%, var(--primary-dark) 100%)' 
              : 'var(--bg-primary)',
            color: filter === 'transactions' ? 'white' : 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: filter === 'transactions' ? '0 2px 8px rgba(22, 101, 52, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          Transactions
        </button>
      </div>

      {/* Transactions List */}
      {filteredItems.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 20px',
          color: 'var(--text-secondary)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--landing-green)20 0%, var(--primary-dark)20 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <FontAwesomeIcon 
              icon={faCreditCard} 
              style={{ fontSize: '40px', color: 'var(--landing-green)', opacity: 0.5 }}
            />
          </div>
          <p style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
            No {filter === 'all' ? 'transactions' : filter} found
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', opacity: 0.7 }}>
            Your {filter === 'all' ? 'transactions and deposits' : filter} will appear here
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredItems.map((item) => {
            const isDeposit = item.itemType === 'deposit'
            const icon = getTransactionIcon(item)
            const statusIcon = getStatusIcon(item.status)
            const statusColor = getStatusColor(item.status)

            return (
              <div
                key={`${item.itemType}-${item.id}`}
                style={{
                  background: 'var(--bg-primary)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                }}
                onClick={() => {
                  setSelectedItem(item)
                  setShowModal(true)
                }}
              >
                {/* Commission badge in top-right corner */}
                {item.itemType === 'transaction' && item.commission > 0 && item.status === 'completed' && (
                  <div style={{ 
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontSize: '11px', 
                    fontWeight: '600',
                    color: 'var(--landing-green)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, var(--landing-green)15 0%, var(--primary-dark)15 100%)',
                    border: '1px solid var(--landing-green)30',
                    zIndex: 1
                  }}>
                    Commission: {parseFloat(item.commission).toFixed(2)} BDT
                  </div>
                )}
                {/* Icon */}
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                    background: isDeposit 
                      ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                      : 'linear-gradient(135deg, var(--landing-green) 0%, var(--primary-dark) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(22, 101, 52, 0.2)',
                  padding: '8px'
                }}>
                  <img src={icon} alt={item.displayType} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    marginBottom: '6px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.displayType}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                    marginBottom: '4px'
                  }}>
                    <span>{formatDate(item.createdAt)}</span>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span>{formatTime(item.createdAt)}</span>
                  </div>
                  {/* Show PIN (last_digit) for successful mobile_banking transactions */}
                  {item.itemType === 'transaction' && item.type === 'mobile_banking' && item.status === 'completed' && item.last_digit && (
                    <div style={{ 
                      fontSize: '13px', 
                      fontWeight: '600',
                      color: 'var(--landing-green)',
                      marginTop: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, var(--landing-green)15 0%, var(--primary-dark)15 100%)',
                      border: '1px solid var(--landing-green)30',
                      display: 'inline-block'
                    }}>
                      PIN: {item.last_digit}
                    </div>
                  )}
                  {item.itemType === 'transaction' && item.type === 'bank_transfer' && item.recipient_account_number && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-secondary)',
                      marginTop: '4px',
                      opacity: 0.8
                    }}>
                      To: {item.recipient_account_name || item.recipient_account_number}
                    </div>
                  )}
                  {item.itemType === 'transaction' && item.type === 'mobile_recharge' && item.phone && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-secondary)',
                      marginTop: '4px',
                      opacity: 0.8
                    }}>
                      Phone: {item.phone}
                    </div>
                  )}
                </div>

                {/* Amount and Status */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-end',
                  gap: '8px',
                  flexShrink: 0
                }}>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: '700',
                    color: isDeposit ? '#16a34a' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    flexDirection: 'column',
                    alignItems: 'flex-end'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isDeposit ? '+' : '-'}{parseFloat(item.amount).toFixed(2)} {isDeposit && (item.deposit_type === 'bank' || item.deposit_type === 'gift_card') ? userCurrency : 'BDT'}
                    </div>
                    {/* Show amount_to_add for bank and gift card deposits if available */}
                    {isDeposit && (item.deposit_type === 'bank' || item.deposit_type === 'gift_card') && item.amount_to_add && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'var(--text-secondary)',
                        opacity: 0.7,
                        fontWeight: '500'
                      }}>
                        ≈ {parseFloat(item.amount_to_add).toFixed(2)} BDT
                      </div>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: statusColor,
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: `${statusColor}20`,
                    border: `1px solid ${statusColor}30`
                  }}>
                    <FontAwesomeIcon icon={statusIcon} style={{ fontSize: '9px' }} />
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Transaction Details Modal */}
      {showModal && selectedItem && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => {
            setShowModal(false)
            setSelectedItem(null)
          }}
        >
          <div 
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setShowModal(false)
                setSelectedItem(null)
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>

            {/* Modal Header */}
            <div style={{ marginBottom: '24px', paddingRight: '40px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: selectedItem.itemType === 'deposit' 
                    ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                    : 'linear-gradient(135deg, var(--landing-green) 0%, var(--primary-dark) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px'
                }}>
                  <img src={getTransactionIcon(selectedItem)} alt={selectedItem.displayType} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    margin: 0
                  }}>
                    {selectedItem.displayType}
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '4px'
                  }}>
                    <FontAwesomeIcon 
                      icon={getStatusIcon(selectedItem.status)} 
                      style={{ 
                        fontSize: '12px', 
                        color: getStatusColor(selectedItem.status) 
                      }} 
                    />
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: getStatusColor(selectedItem.status)
                    }}>
                      {selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Amount */}
              <div style={{
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px'
                }}>
                  Amount
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: selectedItem.itemType === 'deposit' ? '#16a34a' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {selectedItem.itemType === 'deposit' ? '+' : '-'}
                  {parseFloat(selectedItem.amount).toFixed(2)} {selectedItem.itemType === 'deposit' && (selectedItem.deposit_type === 'bank' || selectedItem.deposit_type === 'gift_card') ? userCurrency : 'BDT'}
                  {selectedItem.itemType === 'deposit' && (selectedItem.deposit_type === 'bank' || selectedItem.deposit_type === 'gift_card') && selectedItem.amount_to_add && (
                    <span style={{
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      fontWeight: '500',
                      marginLeft: '8px'
                    }}>
                      (≈ {parseFloat(selectedItem.amount_to_add).toFixed(2)} BDT)
                    </span>
                  )}
                </div>
              </div>

              {/* Commission for completed transactions */}
              {selectedItem.itemType === 'transaction' && selectedItem.commission > 0 && selectedItem.status === 'completed' && (
                <div style={{
                  padding: '16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Commission
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'var(--text-primary)'
                  }}>
                    {parseFloat(selectedItem.commission).toFixed(2)} BDT
                  </div>
                </div>
              )}

              {/* Date and Time */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Date
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    {formatDate(selectedItem.createdAt)}
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    Time
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)'
                  }}>
                    {formatTime(selectedItem.createdAt)}
                  </div>
                </div>
              </div>

              {/* Transaction-specific details */}
              {selectedItem.itemType === 'transaction' && selectedItem.type === 'mobile_banking' && (
                <>
                  {selectedItem.mfs_service && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FontAwesomeIcon icon={faMobileScreenButton} style={{ fontSize: '12px' }} />
                        MFS Service
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {selectedItem.mfs_service.charAt(0).toUpperCase() + selectedItem.mfs_service.slice(1)}
                      </div>
                    </div>
                  )}
                  {selectedItem.account_type && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FontAwesomeIcon icon={faIdCard} style={{ fontSize: '12px' }} />
                        Account Type
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {selectedItem.account_type.charAt(0).toUpperCase() + selectedItem.account_type.slice(1)}
                      </div>
                    </div>
                  )}
                  {selectedItem.status === 'completed' && selectedItem.last_digit && (
                    <div style={{
                      padding: '12px',
                      background: 'linear-gradient(135deg, var(--landing-green)15 0%, var(--primary-dark)15 100%)',
                      borderRadius: '8px',
                      border: '1px solid var(--landing-green)30'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--landing-green)',
                        marginBottom: '4px',
                        fontWeight: '600'
                      }}>
                        PIN
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'var(--landing-green)'
                      }}>
                        {selectedItem.last_digit}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedItem.itemType === 'transaction' && selectedItem.type === 'bank_transfer' && (
                <>
                  {selectedItem.bank_name && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FontAwesomeIcon icon={faBuildingColumns} style={{ fontSize: '12px' }} />
                        Bank Name
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {selectedItem.bank_name}
                      </div>
                    </div>
                  )}
                  {selectedItem.recipient_account_number && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FontAwesomeIcon icon={faIdCard} style={{ fontSize: '12px' }} />
                        Account Number
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {selectedItem.recipient_account_number}
                      </div>
                    </div>
                  )}
                  {selectedItem.recipient_account_name && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px'
                      }}>
                        Recipient Name
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {selectedItem.recipient_account_name}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedItem.itemType === 'transaction' && selectedItem.type === 'mobile_recharge' && (
                <>
                  {selectedItem.mfs_service && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FontAwesomeIcon icon={faMobileScreenButton} style={{ fontSize: '12px' }} />
                        Operator
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {selectedItem.mfs_service.charAt(0).toUpperCase() + selectedItem.mfs_service.slice(1)}
                      </div>
                    </div>
                  )}
                  {selectedItem.phone && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FontAwesomeIcon icon={faPhone} style={{ fontSize: '12px' }} />
                        Phone Number
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {selectedItem.phone}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedItem.itemType === 'transaction' && selectedItem.type === 'pay_bill' && (
                <>
                  {selectedItem.account_type && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FontAwesomeIcon icon={faBolt} style={{ fontSize: '12px' }} />
                        Provider
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {selectedItem.account_type}
                      </div>
                    </div>
                  )}
                  {selectedItem.bank_name && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <FontAwesomeIcon icon={faIdCard} style={{ fontSize: '12px' }} />
                        Account Number
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                      }}>
                        {selectedItem.bank_name}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedItem.itemType === 'deposit' && selectedItem.deposit_type === 'bank' && (
                <>
                  {selectedItem.receipt_url && (
                    <div style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        marginBottom: '8px'
                      }}>
                        Receipt
                      </div>
                      <img 
                        src={selectedItem.receipt_url} 
                        alt="Receipt" 
                        style={{
                          width: '100%',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)'
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
