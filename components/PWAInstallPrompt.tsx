'use client';

import { useEffect, useState } from 'react';
import { isAppleDevice, isStandalone, isIOSDevice } from '@/lib/device-detection';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Only show on Apple devices and if not already installed
    if (isAppleDevice() && !isStandalone()) {
      setIsIOS(isIOSDevice());
      
      // Check if user has dismissed the prompt before (stored in localStorage)
      const dismissed = localStorage.getItem('pwa-install-prompt-dismissed');
      if (!dismissed) {
        // Show prompt after a short delay
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '90%',
        width: '400px',
        zIndex: 10000,
        animation: 'slideUp 0.3s ease-out',
      }}
      className="pwa-install-prompt"
    >
      <div className="card" style={{ 
        border: '2px solid var(--brand-500)',
        boxShadow: 'var(--shadow-md)',
        padding: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>📱 Install TeachPilot</h3>
          <button
            onClick={handleDismiss}
            className="btn btn-quiet"
            style={{ padding: '4px 8px', minWidth: 'auto' }}
          >
            ✕
          </button>
        </div>

        {isIOS ? (
          <div>
            <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--muted)' }}>
              Add TeachPilot to your home screen for quick access!
            </p>
            <div style={{ 
              backgroundColor: 'var(--surface-2)', 
              padding: '16px', 
              borderRadius: 'var(--radius-md)',
              marginBottom: '12px'
            }}>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8' }}>
                <li>Tap the <strong>Share</strong> button <span style={{ fontSize: '18px' }}>⎋</span> at the bottom of your screen</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong> <span style={{ fontSize: '18px' }}>➕</span></li>
                <li>Tap <strong>"Add"</strong> in the top right corner</li>
                <li>Enjoy TeachPilot as an app! 🎉</li>
              </ol>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleDismiss}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Got it!
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--muted)' }}>
              Install TeachPilot as an app for a better experience!
            </p>
            <div style={{ 
              backgroundColor: 'var(--surface-2)', 
              padding: '16px', 
              borderRadius: 'var(--radius-md)',
              marginBottom: '12px',
              fontSize: '14px'
            }}>
              <p style={{ margin: 0 }}>
                Look for the install prompt in your browser's address bar, or check your browser's menu for "Install App" option.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Got it!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

