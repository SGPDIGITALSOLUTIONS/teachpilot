'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface ParentNomination {
  id: number;
  parent_email: string;
  parent_name: string;
  status: string;
  nominated_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [parentEmail, setParentEmail] = useState('');
  const [parentName, setParentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nomination, setNomination] = useState<ParentNomination | null>(null);
  const [checkingNomination, setCheckingNomination] = useState(true);

  useEffect(() => {
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }

    checkNominationStatus();
  }, [router]);

  const checkNominationStatus = async () => {
    try {
      const response = await fetch('/api/parent/nomination-status');
      const data = await response.json();
      
      if (data.success && data.nomination) {
        setNomination(data.nomination);
      }
    } catch (error) {
      console.error('Failed to check nomination status:', error);
    } finally {
      setCheckingNomination(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/parent/nominate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_email: parentEmail,
          parent_name: parentName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Parent nomination sent successfully! An invitation has been sent to the parent.');
        setParentEmail('');
        setParentName('');
        await checkNominationStatus();
      } else {
        setError(data.message || 'Failed to send nomination');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingNomination) {
    return (
      <>
        <Header showLogout={true} />
        <div className="container">
          <p>Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header showLogout={true} />
      <div className="container">
        <h1>Settings</h1>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px' }}>Parent Nomination</h2>
          <p style={{ marginBottom: '20px', color: 'var(--muted)' }}>
            Nominate a parent to support you with your studies. They will be able to view your performance, send you messages and kudos, and help set study boundaries.
          </p>

          {nomination ? (
            <div className="alert" style={{ 
              backgroundColor: nomination.status === 'accepted' ? 'rgba(22, 163, 74, 0.06)' : 'rgba(245, 158, 11, 0.08)',
              borderColor: nomination.status === 'accepted' ? 'rgba(22, 163, 74, 0.35)' : 'rgba(245, 158, 11, 0.35)',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Current Nomination:</strong>
              </div>
              <div style={{ marginBottom: '4px' }}>
                <strong>Name:</strong> {nomination.parent_name || 'Not provided'}
              </div>
              <div style={{ marginBottom: '4px' }}>
                <strong>Email:</strong> {nomination.parent_email}
              </div>
              <div style={{ marginBottom: '4px' }}>
                <strong>Status:</strong> 
                <span style={{ 
                  textTransform: 'capitalize',
                  marginLeft: '8px',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: nomination.status === 'accepted' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: nomination.status === 'accepted' ? 'var(--success)' : 'var(--warning)',
                  fontWeight: '600'
                }}>
                  {nomination.status}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
                Nominated on: {new Date(nomination.nominated_at).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="parent-name" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Parent Name (Optional)
                </label>
                <input
                  id="parent-name"
                  type="text"
                  className="input"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Enter parent's name"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="parent-email" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Parent Email Address *
                </label>
                <input
                  id="parent-email"
                  type="email"
                  className="input"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  required
                />
                <div className="help">
                  An invitation will be sent to this email address
                </div>
              </div>

              {error && (
                <div className="alert danger" style={{ marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              {success && (
                <div className="alert success" style={{ marginBottom: '16px' }}>
                  {success}
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Nominate Parent'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}



