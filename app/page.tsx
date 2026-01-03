'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated === 'true') {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('teachpilot_authenticated', 'true');
        router.push('/dashboard');
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', marginTop: '5vh', paddingTop: '4px', paddingBottom: '4px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <Image
            src="/logo.png"
            alt="TeachPilot Logo"
            width={480}
            height={480}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="username" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
              Username
            </label>
            <input
              id="username"
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="alert danger" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

