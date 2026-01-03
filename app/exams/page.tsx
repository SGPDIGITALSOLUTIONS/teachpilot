'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

interface Exam {
  id: number;
  title: string;
  total_questions: number;
  estimated_duration: number | null;
  difficulty: string | null;
  version_number: number;
}

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }

    loadExams();
  }, [router]);

  const loadExams = async () => {
    try {
      const response = await fetch('/api/exams');
      const data = await response.json();
      if (data.success) {
        setExams(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <p>Loading exams...</p>
      </div>
    );
  }

  return (
    <>
      <Header showLogout={true} />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Exam Bank</h1>
        </div>

      {exams.length === 0 ? (
        <div className="card">
          <p>No exams available yet. Upload revision materials to generate practice exams!</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {exams.map((exam) => (
            <div key={exam.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>{exam.title}</h3>
                {exam.version_number > 1 && (
                  <span className="badge badge-blue">v{exam.version_number}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span className="badge">{exam.total_questions} questions</span>
                {exam.estimated_duration && (
                  <span className="badge">~{exam.estimated_duration} min</span>
                )}
                {exam.difficulty && (
                  <span className="badge badge-blue">{exam.difficulty}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link href={`/exams/${exam.id}/take`} className="btn btn-primary" style={{ flex: 1, textAlign: 'center' }}>
                  Take Exam
                </Link>
                <Link href={`/exams/${exam.id}/take?mock=true`} className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>
                  Mock Exam
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </>
  );
}

