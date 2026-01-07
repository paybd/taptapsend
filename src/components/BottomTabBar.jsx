import '../index.css'

export default function BottomTabBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: '/icons/home.png' },
    { id: 'transactions', label: 'Transactions', icon: '/icons/transactions.png' },
    { id: 'scan', label: 'Scan', icon: '/icons/video-player.png' },
    { id: 'offers', label: 'Offers', icon: '/icons/lottery.png' },
    { id: 'profile', label: 'Profile', icon: '/icons/profile.png' },
  ]

  return (
    <nav className="bottom-tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="tab-icon">
            <img src={tab.icon} alt={tab.label} className="tab-icon-img" />
          </span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

