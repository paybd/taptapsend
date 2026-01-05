/**
 * Currency mapping based on country codes
 * Maps ISO country codes to their respective currency codes
 */

export const countryToCurrency = {
  // Middle East Countries
  'SA': 'SAR', // Saudi Arabia
  'AE': 'AED', // United Arab Emirates
  'KW': 'KWD', // Kuwait
  'QA': 'QAR', // Qatar
  'BH': 'BHD', // Bahrain
  'OM': 'OMR', // Oman
  'JO': 'JOD', // Jordan
  'LB': 'LBP', // Lebanon
  'IQ': 'IQD', // Iraq
  'YE': 'YER', // Yemen
  
  // European Countries
  'GB': 'GBP', // United Kingdom
  'EU': 'EUR', // European Union (general)
  'DE': 'EUR', // Germany
  'FR': 'EUR', // France
  'IT': 'EUR', // Italy
  'ES': 'EUR', // Spain
  'NL': 'EUR', // Netherlands
  'BE': 'EUR', // Belgium
  'AT': 'EUR', // Austria
  'CH': 'CHF', // Switzerland
  'SE': 'SEK', // Sweden
  'NO': 'NOK', // Norway
  'DK': 'DKK', // Denmark
  'PL': 'PLN', // Poland
  'CZ': 'CZK', // Czech Republic
  'GR': 'EUR', // Greece
  'PT': 'EUR', // Portugal
  'IE': 'EUR', // Ireland
  'FI': 'EUR', // Finland
  
  // North America
  'US': 'USD', // United States
  'CA': 'CAD', // Canada
  'MX': 'MXN', // Mexico
  
  // Asia
  'IN': 'INR', // India
  'PK': 'PKR', // Pakistan
  'BD': 'BDT', // Bangladesh
  'MY': 'MYR', // Malaysia
  'SG': 'SGD', // Singapore
  'TH': 'THB', // Thailand
  'PH': 'PHP', // Philippines
  'ID': 'IDR', // Indonesia
  'VN': 'VND', // Vietnam
  'CN': 'CNY', // China
  'JP': 'JPY', // Japan
  'KR': 'KRW', // South Korea
  
  // Other
  'AU': 'AUD', // Australia
  'NZ': 'NZD', // New Zealand
  'ZA': 'ZAR', // South Africa
  'EG': 'EGP', // Egypt
  'TR': 'TRY', // Turkey
  'RU': 'RUB', // Russia
  'BR': 'BRL', // Brazil
  'AR': 'ARS', // Argentina
}

/**
 * Get currency code for a given country code
 * @param {string} countryCode - ISO country code (e.g., 'SA', 'US', 'AE')
 * @returns {string} Currency code (e.g., 'SAR', 'USD', 'AED')
 */
export const getCurrencyForCountry = (countryCode) => {
  if (!countryCode) return 'USD' // Default to USD
  
  const currency = countryToCurrency[countryCode.toUpperCase()]
  return currency || 'USD' // Default to USD if country not found
}

/**
 * Get currency name for display
 * @param {string} countryCode - ISO country code
 * @returns {string} Currency name (e.g., 'SAR', 'USD', 'AED')
 */
export const getCurrencyName = (countryCode) => {
  return getCurrencyForCountry(countryCode)
}

