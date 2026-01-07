import { useState, useEffect } from 'react'
import LandingScreen from './screens/LandingScreen'
import LoginScreen from './screens/LoginScreen'
import ForgotPasswordScreen from './screens/ForgotPasswordScreen'
import SignupScreen from './screens/SignupScreen'
import HomeScreen from './screens/HomeScreen'
import AddMoneyScreen from './screens/AddMoneyScreen'
import BkashDepositScreen from './screens/deposit/BkashDepositScreen'
import BankDepositScreen from './screens/deposit/BankDepositScreen'
import CardDepositScreen from './screens/deposit/CardDepositScreen'
import MobileBankingScreen from './screens/MobileBankingScreen'
import BankTransferScreen from './screens/BankTransferScreen'
import MobileRechargeScreen from './screens/MobileRechargeScreen'
import PayBillScreen from './screens/PayBillScreen'
import CustomerCareScreen from './screens/CustomerCareScreen'
import TransactionsScreen from './screens/TransactionsScreen'
import ScanScreen from './screens/ScanScreen'
import OffersScreen from './screens/OffersScreen'
import ProfileScreen from './screens/ProfileScreen'
import BottomTabBar from './components/BottomTabBar'
import { supabase } from './lib/supabase'
import './index.css'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [user, setUser] = useState(null)
  const [loginMessage, setLoginMessage] = useState(null)
  const [currentScreen, setCurrentScreen] = useState(null) // null, 'add-money', etc.

  // Check for existing session on mount and listen for auth changes
  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          setIsLoggedIn(true)
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          setIsLoggedIn(true)
          setShowLogin(false)
          setShowSignup(false)
        } else {
          setUser(null)
          setIsLoggedIn(false)
        }
        setIsLoading(false)
      }
    )

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogin = () => {
    setShowLogin(true)
    setLoginMessage(null)
  }

  const handleLoginSuccess = (userData) => {
    setUser(userData)
    setIsLoggedIn(true)
    setShowLogin(false)
    setShowForgotPassword(false)
    setActiveTab('home')
    setLoginMessage(null)
  }

  const handleLoginClose = () => {
    setShowLogin(false)
    setLoginMessage(null)
  }

  const handleForgotPassword = () => {
    setShowForgotPassword(true)
    setShowLogin(false)
  }

  const handleForgotPasswordClose = () => {
    setShowForgotPassword(false)
  }

  const handleBackToLogin = (message) => {
    setShowForgotPassword(false)
    setShowLogin(true)
    if (message) {
      setLoginMessage(message)
    }
  }

  const handleSignUp = () => {
    setShowSignup(true)
    setShowLogin(false)
  }

  const handleSignupComplete = (userData) => {
    setUser(userData)
    setIsLoggedIn(true)
    setShowSignup(false)
    setActiveTab('home')
  }

  const handleSignupClose = () => {
    setShowSignup(false)
  }

  const handleGoogleLogin = () => {
    // Google login is handled in LoginScreen component
    setShowLogin(true)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setUser(null)
    setActiveTab('home')
  }

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="app-container landing-container">
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

  // Show forgot password screen if triggered
  if (showForgotPassword) {
    return (
      <div className="app-container landing-container">
        <ForgotPasswordScreen 
          onClose={handleForgotPasswordClose}
          onBackToLogin={handleBackToLogin}
        />
      </div>
    )
  }

  // Show login screen if login is triggered
  if (showLogin) {
    return (
      <div className="app-container landing-container">
        <LoginScreen 
          onClose={handleLoginClose}
          onLoginSuccess={handleLoginSuccess}
          onSignUp={handleSignUp}
          onForgotPassword={handleForgotPassword}
          message={loginMessage}
        />
      </div>
    )
  }

  // Show signup screen if signup is triggered
  if (showSignup) {
  return (
      <div className="app-container landing-container">
        <SignupScreen 
          onClose={handleSignupClose}
          onComplete={handleSignupComplete}
        />
      </div>
    )
  }

  // Show landing screen if not logged in
  if (!isLoggedIn) {
    return (
      <div className="app-container landing-container">
        <LandingScreen 
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          onGoogleLogin={handleGoogleLogin}
        />
      </div>
    )
  }

  const handleNavigate = (screen) => {
    setCurrentScreen(screen)
  }

  const handleBack = () => {
    // If on a deposit screen, go back to add-money screen
    if (currentScreen === 'bkash-deposit' || currentScreen === 'bank-deposit' || currentScreen === 'card-deposit') {
      setCurrentScreen('add-money')
    } else if (currentScreen === 'mobile-banking' || currentScreen === 'bank-transfer' || currentScreen === 'mobile-recharge' || currentScreen === 'pay-bill' || currentScreen === 'customer-care') {
      // Go back to home from transaction screens and customer care
      setCurrentScreen(null)
    } else {
      // Otherwise go back to home
      setCurrentScreen(null)
}
  }

  // Show main app with tabs if logged in
  const renderContent = () => {
    // Show deposit screens first
    if (currentScreen === 'bkash-deposit') {
      return <BkashDepositScreen onBack={handleBack} />
    }
    if (currentScreen === 'bank-deposit') {
      return <BankDepositScreen onBack={handleBack} />
    }
    if (currentScreen === 'card-deposit') {
      return <CardDepositScreen onBack={handleBack} />
    }
    
    // Show Mobile Banking Screen
    if (currentScreen === 'mobile-banking') {
      return <MobileBankingScreen onBack={handleBack} />
    }
    
    // Show Bank Transfer Screen
    if (currentScreen === 'bank-transfer') {
      return <BankTransferScreen onBack={handleBack} />
    }
    
    // Show Mobile Recharge Screen
    if (currentScreen === 'mobile-recharge') {
      return <MobileRechargeScreen onBack={handleBack} />
    }
    
    // Show Pay Bill Screen
    if (currentScreen === 'pay-bill') {
      return <PayBillScreen onBack={handleBack} />
    }
    
    // Show Customer Care Screen
    if (currentScreen === 'customer-care') {
      return <CustomerCareScreen onBack={handleBack} />
    }
    
    // Show AddMoneyScreen
    if (currentScreen === 'add-money') {
      return <AddMoneyScreen onBack={handleBack} onNavigate={handleNavigate} />
    }

    // Then show tab-based screens
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigate={handleNavigate} onTabChange={setActiveTab} />
      case 'transactions':
        return <TransactionsScreen />
      case 'scan':
        return <ScanScreen />
      case 'offers':
        return <OffersScreen />
      case 'profile':
        return <ProfileScreen onLogout={handleLogout} />
      default:
        return <HomeScreen onNavigate={handleNavigate} />
    }
  }

  return (
    <div className="app-container">
      <div className="app-content">
        {renderContent()}
      </div>
      <BottomTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}
