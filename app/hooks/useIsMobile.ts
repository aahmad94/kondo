import { useState, useEffect } from 'react';

interface MobileInfo {
  isMobile: boolean;
  browser: string;
  offset: number;
}

export function useIsMobile(): MobileInfo {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>({
    isMobile: false,
    browser: 'unknown',
    offset: 0
  });

  useEffect(() => {
    const checkMobileInfo = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isMobileWidth = window.innerWidth < 640; // Tailwind's sm breakpoint
      const isMobile = isMobileDevice || isMobileWidth;
      
      let browser = 'unknown';
      let offset = 0;

      if (!isMobile) {
        setMobileInfo({ isMobile, browser, offset });
        return;
      }

      // Detect browser
      if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
        browser = 'safari';
        // iOS Safari: Estimate URL bar + toolbar height
        offset = 70; // Conservative estimate for top address bar + bottom toolbar
      } else if (userAgent.includes('chrome')) {
        browser = 'chrome';
        offset = 0; // Typical Chrome address bar height on Android
      } else if (userAgent.includes('firefox')) {
        browser = 'firefox';
        offset = 70; // Similar to Chrome, may vary
      } else {
        // Fallback for other browsers
        offset = 70; // Safe default
      }

      setMobileInfo({ isMobile, browser, offset });
    };

    // Initial check
    checkMobileInfo();

    // Add event listeners for both orientation changes and window resize
    window.addEventListener('orientationchange', checkMobileInfo);
    window.addEventListener('resize', checkMobileInfo);

    // Cleanup
    return () => {
      window.removeEventListener('orientationchange', checkMobileInfo);
      window.removeEventListener('resize', checkMobileInfo);
    };
  }, []);

  return mobileInfo;
} 