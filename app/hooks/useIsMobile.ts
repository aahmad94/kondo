import { useState, useEffect } from 'react';

interface MobileInfo {
  isMobile: boolean;
  browser: string;
  mobileOffset: number;
}

export function useIsMobile(): MobileInfo {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>({
    isMobile: false,
    browser: 'unknown',
    mobileOffset: 0
  });

  useEffect(() => {
    const checkMobileInfo = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isMobileWidth = window.innerWidth < 640; // Tailwind's sm breakpoint
      const isMobile = isMobileDevice || isMobileWidth;
      
      let browser = 'unknown';
      let mobileOffset = 0;

      if (!isMobile) {
        setMobileInfo({ isMobile, browser, mobileOffset });
        return;
      }

      // Detect browser and set appropriate offset for mobile browser bars
      if (userAgent.includes('chrome') && userAgent.includes('android')) {
        browser = 'chrome-android';
        mobileOffset = 160; // Chrome Android has both top URL bar and bottom nav bar
      } else if (userAgent.includes('chrome')) {
        browser = 'chrome';
        mobileOffset = 160; // Chrome mobile (iOS or other)
      } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
        browser = 'safari';
        mobileOffset = 80; // Safari iOS
      } else if (userAgent.includes('firefox')) {
        browser = 'firefox';
        mobileOffset = 80; // Firefox mobile
      } else {
        // Fallback for other mobile browsers
        browser = 'other';
        mobileOffset = 80; // Safe default
      }

      setMobileInfo({ isMobile, browser, mobileOffset });
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