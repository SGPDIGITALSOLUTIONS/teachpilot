'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Image from 'next/image';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check if we're back online
    const checkOnline = () => setIsOnline(navigator.onLine);
    
    checkOnline();
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);

    return () => {
      window.removeEventListener('online', checkOnline);
      window.removeEventListener('offline', checkOnline);
    };
  }, []);

  if (isOnline) {
    return (
      <>
        <Header showLogout={true} />
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <h1>You're Back Online! 🎉</h1>
            <p style={{ marginBottom: '24px' }}>Your connection has been restored.</p>
            <a href="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header showLogout={false} />
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <Image
              src="/logo.png"
              alt="TeachPilot Logo"
              width={120}
              height={120}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <h1>You're Offline 📡</h1>
          <p style={{ marginBottom: '24px', color: 'var(--muted)' }}>
            It looks like you're not connected to the internet. Don't worry - some features may still work if you've visited them before!
          </p>
          
          <div style={{ 
            backgroundColor: 'var(--surface-2)', 
            padding: '20px', 
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <h3 style={{ marginTop: 0 }}>What you can do:</h3>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>View previously visited pages</li>
              <li>Review cached content</li>
              <li>Wait for your connection to return</li>
            </ul>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            style={{ marginRight: '12px' }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.history.back()}
            className="btn btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    </>
  );
}


