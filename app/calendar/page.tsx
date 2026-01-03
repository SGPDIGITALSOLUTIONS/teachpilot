'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function CalendarPage() {
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
        <h1>Calendar</h1>
        <div className="card">
          <p>Calendar view coming soon...</p>
        </div>
      </div>
    </>
  );
}

