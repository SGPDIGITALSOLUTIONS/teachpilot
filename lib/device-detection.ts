/**
 * Detects if the device is an Apple device (iPhone, iPad, iPod)
 */
export function isAppleDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();
  
  // Check for iOS devices
  const isIOS = /iphone|ipad|ipod/.test(userAgent) || 
               (platform === 'macintel' && navigator.maxTouchPoints > 1); // iPad on iOS 13+
  
  // Check for macOS (Safari on Mac)
  const isMac = /macintosh|mac os x/.test(userAgent);
  
  return isIOS || isMac;
}

/**
 * Detects if the app is running in standalone mode (already installed as PWA)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for iOS standalone mode
  if ((window.navigator as any).standalone) {
    return true;
  }
  
  // Check for Android/Chrome standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  return false;
}

/**
 * Checks if the device is specifically an iPhone or iPad
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();
  
  return /iphone|ipad|ipod/.test(userAgent) || 
         (platform === 'macintel' && navigator.maxTouchPoints > 1);
}


