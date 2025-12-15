const UAParser = require('ua-parser-js');

/**
 * Parse User Agent and extract device information
 * @param {string} userAgent - The User-Agent string from request headers
 * @returns {object} Device information
 */
const parseUserAgent = (userAgent) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine device type
  let deviceType = 'desktop';
  if (result.device.type === 'mobile') {
    deviceType = 'mobile';
  } else if (result.device.type === 'tablet') {
    deviceType = 'tablet';
  } else if (result.device.type) {
    deviceType = result.device.type;
  }

  // Better platform detection
  let platform = 'Unknown';
  
  // First try device vendor/model
  if (result.device.vendor || result.device.model) {
    platform = [result.device.vendor, result.device.model].filter(Boolean).join(' ');
  } 
  // If not found, use OS as platform
  else if (result.os.name) {
    platform = result.os.name;
    // Add more specific info for desktop
    if (deviceType === 'desktop') {
      if (result.os.name.includes('Windows')) {
        platform = 'Windows PC';
      } else if (result.os.name.includes('Mac')) {
        platform = 'Apple Mac';
      } else if (result.os.name.includes('Linux')) {
        platform = 'Linux PC';
      }
    }
  }

  return {
    type: deviceType,
    browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
    os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
    platform: platform,
    deviceVendor: result.device.vendor || null,
    deviceModel: result.device.model || null
  };
};

/**
 * Get IP address from request
 * @param {object} req - Express request object
 * @returns {string} IP address
 */
const getClientIP = (req) => {
  // Check for forwarded IPs (common in production with proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can be comma-separated list
    const ip = forwarded.split(',')[0].trim();
    // Skip localhost IPs from proxy
    if (ip !== '::1' && ip !== '127.0.0.1' && !ip.startsWith('192.168.')) {
      return ip;
    }
  }
  
  // Check other common headers
  const realIP = req.headers['x-real-ip'];
  if (realIP && realIP !== '::1' && realIP !== '127.0.0.1') {
    return realIP;
  }

  const cfIP = req.headers['cf-connecting-ip']; // Cloudflare
  if (cfIP && cfIP !== '::1' && cfIP !== '127.0.0.1') {
    return cfIP;
  }

  // Get connection IP
  let connectionIP = (
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    'Unknown'
  );

  // Convert IPv6 localhost to IPv4 for consistency
  if (connectionIP === '::1') {
    connectionIP = '127.0.0.1';
  }

  // Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
  if (connectionIP.startsWith('::ffff:')) {
    connectionIP = connectionIP.substring(7);
  }

  return connectionIP;
};

/**
 * Check if IP is local/private
 * @param {string} ip - IP address
 * @returns {boolean}
 */
const isLocalIP = (ip) => {
  if (!ip || ip === 'Unknown') return true;
  
  // IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return true;
  
  // IPv4 localhost and private ranges
  if (ip === '127.0.0.1') return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('172.')) {
    const second = parseInt(ip.split('.')[1]);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith('169.254.')) return true; // Link-local
  
  return false;
};

/**
 * Get location data from IP (requires external service)
 * @param {string} ip - IP address
 * @param {string} fallbackCity - Fallback city name for local IPs
 * @returns {object} Location information
 */
const getLocationFromIP = async (ip, fallbackCity = 'Development') => {
  try {
    // Check if it's a local IP
    if (isLocalIP(ip)) {
      return {
        country: 'Pakistan', // Your default country
        region: 'Sindh', // Your default region
        city: fallbackCity, // Use fallback or 'Development'
        timezone: 'Asia/Karachi',
        coordinates: {
          latitude: 24.8607, // Karachi coordinates
          longitude: 67.0011
        }
      };
    }

    // Using ip-api.com (free tier - 45 requests/minute)
    const axios = require('axios');
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 5000,
      params: {
        fields: 'status,message,country,regionName,city,timezone,lat,lon'
      }
    });

    if (response.data.status === 'success') {
      return {
        country: response.data.country || 'Unknown',
        region: response.data.regionName || 'Unknown',
        city: response.data.city || 'Unknown',
        timezone: response.data.timezone || 'Unknown',
        coordinates: {
          latitude: response.data.lat || null,
          longitude: response.data.lon || null
        }
      };
    } else {
      throw new Error(response.data.message || 'Failed to fetch location');
    }
  } catch (error) {
    console.error('Error fetching location:', error.message);
    
    // Return default Pakistan location on error
    return {
      country: 'Pakistan',
      region: 'Unknown',
      city: 'Unknown',
      timezone: 'Asia/Karachi',
      coordinates: {
        latitude: null,
        longitude: null
      }
    };
  }
};

/**
 * Get comprehensive device and location info
 * @param {object} req - Express request object
 * @returns {object} Complete device and location information
 */
const getDeviceAndLocationInfo = async (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = getClientIP(req);
  
  // Parse device info
  const deviceInfo = parseUserAgent(userAgent);
  
  // Determine fallback city based on environment
  const fallbackCity = process.env.NODE_ENV === 'production' 
    ? 'Unknown' 
    : 'Local Development';
  
  // Get location data
  const locationInfo = await getLocationFromIP(ip, fallbackCity);
  
  return {
    device: deviceInfo,
    ip: ip,
    location: locationInfo,
    userAgent: userAgent,
    isLocalEnvironment: isLocalIP(ip)
  };
};

module.exports = {
  parseUserAgent,
  getClientIP,
  getLocationFromIP,
  isLocalIP,
  getDeviceAndLocationInfo
};