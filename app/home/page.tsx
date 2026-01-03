'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

interface DailyGreeting {
  content: string;
  type: string;
  emoji: string;
  title: string;
}

export default function HomePage() {
  const router = useRouter();
  const [greeting, setGreeting] = useState<DailyGreeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }

    // Load daily greeting
    loadDailyGreeting();
  }, [router]);

  const loadDailyGreeting = async () => {
    try {
      // Check cache
      const cachedGreeting = localStorage.getItem('teachpilot_daily_greeting');
      const cachedDate = localStorage.getItem('teachpilot_daily_greeting_date');
      const today = new Date().toDateString();

      if (cachedGreeting && cachedDate === today) {
        setGreeting(JSON.parse(cachedGreeting));
        setLoading(false);
        return;
      }

      // Fetch new greeting
      const response = await fetch('/api/daily-greeting');
      const data = await response.json();

      if (data.success) {
        setGreeting(data.data);
        localStorage.setItem('teachpilot_daily_greeting', JSON.stringify(data.data));
        localStorage.setItem('teachpilot_daily_greeting_date', today);
      }
    } catch (error) {
      console.error('Failed to load greeting:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Header showLogout={true} />

      {loading ? (
        <div className="card">Loading...</div>
      ) : greeting ? (
        <div className="card daisy-accent" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '32px' }}>{greeting.emoji}</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0' }}>{greeting.title}</h3>
              <p style={{ margin: 0, color: 'var(--text)' }}>{greeting.content}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <p>Welcome back! Ready to study?</p>
        </div>
      )}

      <div className="grid grid-3" style={{ marginTop: '24px' }}>
        <Link href="/topics" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <h3>Topics</h3>
          <p style={{ margin: 0 }}>Manage your subjects and topics</p>
        </Link>

        <Link href="/tasks" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <h3>Tasks</h3>
          <p style={{ margin: 0 }}>View and manage your tasks</p>
        </Link>

        <Link href="/exams" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <h3>Exams</h3>
          <p style={{ margin: 0 }}>Take practice exams</p>
        </Link>
      </div>
    </div>
  );
}

