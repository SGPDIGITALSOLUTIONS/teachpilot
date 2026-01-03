'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function RevisionPage() {
  const router = useRouter();

  useEffect(() => {
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }
  }, [router]);

  return (
    <>
      <Header showLogout={true} />
      <div className="container">
        <h1>Revision</h1>
        <div className="card">
          <p>Revision timer and session management coming soon...</p>
        </div>
      </div>
    </>
  );
}



