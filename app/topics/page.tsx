'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

interface Topic {
  id: number;
  name: string;
  subject: string | null;
  description: string | null;
  color: string | null;
}

export default function TopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }

    loadTopics();
  }, [router]);

  const loadTopics = async () => {
    try {
      const response = await fetch('/api/topics');
      const data = await response.json();
      if (data.success) {
        setTopics(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <p>Loading topics...</p>
      </div>
    );
  }

  return (
    <>
      <Header showLogout={true} />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Topics</h1>
        </div>

      {topics.length === 0 ? (
        <div className="card">
          <p>No topics yet. Create your first topic to get started!</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="card"
              style={{
                borderLeft: `4px solid ${topic.color || 'var(--brand-500)'}`,
              }}
            >
              <h3>{topic.name}</h3>
              {topic.subject && (
                <span className="badge badge-blue" style={{ marginBottom: '8px' }}>
                  {topic.subject}
                </span>
              )}
              {topic.description && <p style={{ margin: '8px 0 0 0' }}>{topic.description}</p>}
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
}

