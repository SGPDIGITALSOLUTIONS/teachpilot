'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';

export default function NewTopicPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = parseInt(params.subjectId as string);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/subjects/${subjectId}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        router.push(`/subjects/${subjectId}/topics/${data.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create topic:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header showLogout={true} />
      <div className="container">
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => router.push('/subjects')}
            className="btn btn-quiet"
            style={{ marginBottom: '16px' }}
          >
            ← Back to Subjects
          </button>
          <h1>Add New Topic</h1>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                Topic Name *
              </label>
              <input
                id="name"
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Algebra, Geometry, Calculus"
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="description" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                Description (Optional)
              </label>
              <textarea
                id="description"
                className="input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Add a description for this topic"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Topic'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/subjects')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}



