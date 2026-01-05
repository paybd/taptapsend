import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome, faList, faQrcode, faGift, faUser } from '@fortawesome/free-solid-svg-icons'
import '../index.css'

export default function BottomTabBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: faHome },
    { id: 'transactions', label: 'Transactions', icon: faList },
    { id: 'scan', label: 'Scan', icon: faQrcode },
    { id: 'offers', label: 'Offers', icon: faGift },
    { id: 'profile', label: 'Profile', icon: faUser },
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
            <FontAwesomeIcon icon={tab.icon} />
          </span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

