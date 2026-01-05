/**
 * VPN Detection Service using vpnapi.io
 * Detects user's country and VPN/proxy/Tor usage
 */

const VPN_API_KEY = import.meta.env.VITE_VPNAPI_KEY || '' // Set your API key in .env
const VPN_API_BASE = 'https://vpnapi.io/api'

// Validate API key is set
if (!VPN_API_KEY || VPN_API_KEY.trim() === '') {
  console.warn('⚠️ VITE_VPNAPI_KEY is not set. VPN detection requires an API key.')
} else {
  console.log('✅ VPN API key loaded successfully')
}

/**
 * Get user's IP address using a public IP service
 */
const getUserIP = async () => {
  try {
    // Try multiple IP detection services as fallback
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://api.ip.sb/ip'
    ]

    for (const service of services) {
      try {
        const response = await fetch(service)
        
        // Handle plain text response (api.ip.sb returns plain text)
        if (service.includes('api.ip.sb')) {
          const text = await response.text()
          const ip = text.trim()
          if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
            return ip
          }
        } else {
          // Handle JSON responses
          const data = await response.json()
          
          // Different services return IP in different formats
          if (data.ip) {
            return data.ip
          } else if (data.query) {
            return data.query
          }
        }
      } catch (error) {
        console.warn(`Failed to get IP from ${service}:`, error)
        continue
      }
    }
    
    throw new Error('Unable to detect IP address')
  } catch (error) {
    console.error('Error getting user IP:', error)
    throw error
  }
}

/**
 * Check VPN status and get country using vpnapi.io
 * @returns {Promise<{country: string, countryCode: string, isVpn: boolean, isProxy: boolean, isTor: boolean, isRelay: boolean}>}
 */
export const detectVPNAndCountry = async () => {
  try {
    // Get user's IP address
    const userIP = await getUserIP()
    
    if (!userIP) {
      throw new Error('Unable to detect IP address')
    }

    // Call vpnapi.io API with API key
    if (!VPN_API_KEY || VPN_API_KEY.trim() === '') {
      console.error('❌ VPN API key is not configured. Please set VITE_VPNAPI_KEY in your .env file.')
      throw new Error('VPN API key is not configured. Please set VITE_VPNAPI_KEY in your environment variables.')
    }

    // Log API key usage (first 8 chars only for security)
    console.log(`🔑 Using VPN API key: ${VPN_API_KEY.substring(0, 8)}...`)

    const apiUrl = `${VPN_API_BASE}/${userIP}?key=${VPN_API_KEY}`
    
    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Invalid VPN API key. Please check your VITE_VPNAPI_KEY configuration.')
      } else if (response.status === 429) {
        throw new Error('VPN API rate limit exceeded. Please try again later.')
      } else {
        const errorText = await response.text()
        throw new Error(`VPN API error: ${response.status} ${response.statusText}. ${errorText}`)
      }
    }

    const data = await response.json()
    
    // Check if API returned an error message
    if (data.error) {
      throw new Error(`VPN API error: ${data.error}`)
    }

    console.log('✅ VPN API response received successfully')

    // Extract security information
    const security = data.security || {}
    const isVpn = security.vpn === true
    const isProxy = security.proxy === true
    const isTor = security.tor === true
    const isRelay = security.relay === true

    // Extract location information
    const location = data.location || {}
    const country = location.country || 'Unknown'
    const countryCode = location.country_code || 'XX'

    console.log(`📍 Detected country: ${country} (${countryCode})`)
    console.log(`🔒 Security check - VPN: ${isVpn}, Proxy: ${isProxy}, Tor: ${isTor}, Relay: ${isRelay}`)

    return {
      ip: userIP,
      country,
      countryCode,
      isVpn,
      isProxy,
      isTor,
      isRelay,
      isBlocked: isVpn || isProxy || isTor || isRelay // Block if any security flag is true
    }
  } catch (error) {
    console.error('Error detecting VPN/Country:', error)
    throw error
  }
}

/**
 * Get a user-friendly error message for VPN blocking
 */
export const getVPNBlockMessage = () => {
  return 'VPN, Proxy, or Tor usage is not allowed. Please disable your VPN and try again.'
}

