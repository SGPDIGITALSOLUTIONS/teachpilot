'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

interface DailyGreeting {
  content: string;
  type: string;
  emoji: string;
  title: string;
}

interface Task {
  id: number;
  title: string;
  task_type: string;
  deadline: string | null;
  start_date: string | null;
  status: string;
  topic_id: number | null;
}

interface Subject {
  id: number;
  name: string;
  color: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [greeting, setGreeting] = useState<DailyGreeting | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);
  const [showConfidenceQuestion, setShowConfidenceQuestion] = useState(false);
  const [confidenceSubmitted, setConfidenceSubmitted] = useState(false);

  useEffect(() => {
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }

    loadDashboardData();
    checkConfidenceToday();
  }, [router]);

  const checkConfidenceToday = () => {
    const lastConfidenceDate = localStorage.getItem('teachpilot_confidence_date');
    const today = new Date().toDateString();
    
    if (lastConfidenceDate !== today) {
      setShowConfidenceQuestion(true);
    } else {
      const savedConfidence = localStorage.getItem('teachpilot_confidence_level');
      if (savedConfidence) {
        setConfidenceLevel(parseInt(savedConfidence));
        setConfidenceSubmitted(true);
      }
    }
  };

  const loadDashboardData = async () => {
    try {
      const [greetingRes, tasksRes, subjectsRes] = await Promise.all([
        loadDailyGreeting(),
        fetch('/api/tasks'),
        fetch('/api/subjects'),
      ]);

      // Load tasks
      const tasksData = await tasksRes.json();
      if (tasksData.success) {
        const allTasks = tasksData.data || [];
        const today = new Date().toISOString().split('T')[0];
        
        // Filter tasks for today (deadline or start_date is today)
        const todayTasksList = allTasks.filter((task: Task) => {
          return task.deadline === today || task.start_date === today;
        });
        setTodayTasks(todayTasksList);
      }

      // Load subjects
      const subjectsData = await subjectsRes.json();
      if (subjectsData.success) {
        setSubjects(subjectsData.data || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyGreeting = async () => {
    try {
      const cachedGreeting = localStorage.getItem('teachpilot_daily_greeting');
      const cachedDate = localStorage.getItem('teachpilot_daily_greeting_date');
      const today = new Date().toDateString();

      if (cachedGreeting && cachedDate === today) {
        setGreeting(JSON.parse(cachedGreeting));
        return;
      }

      const response = await fetch('/api/daily-greeting');
      const data = await response.json();

      if (data.success) {
        setGreeting(data.data);
        localStorage.setItem('teachpilot_daily_greeting', JSON.stringify(data.data));
        localStorage.setItem('teachpilot_daily_greeting_date', today);
      }
    } catch (error) {
      console.error('Failed to load greeting:', error);
    }
  };

  const handleConfidenceSubmit = async () => {
    if (confidenceLevel === null) return;

    try {
      // Save confidence locally
      const today = new Date().toDateString();
      localStorage.setItem('teachpilot_confidence_level', confidenceLevel.toString());
      localStorage.setItem('teachpilot_confidence_date', today);

      // TODO: Send to API to store in database
      // await fetch('/api/confidence', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ confidence_level: confidenceLevel }),
      // });

      setConfidenceSubmitted(true);
      setShowConfidenceQuestion(false);
    } catch (error) {
      console.error('Failed to save confidence:', error);
    }
  };

  const getSubjectName = (topicId: number | null) => {
    if (!topicId) return null;
    const subject = subjects.find((s) => s.id === topicId);
    return subject?.name || null;
  };

  const getTaskTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      revision_session: 'Revision',
      exam: 'Exam',
      custom: 'Task',
    };
    return labels[type] || 'Task';
  };

  const getConfidenceLabel = (level: number) => {
    const labels: Record<number, string> = {
      1: 'Not confident at all',
      2: 'Slightly confident',
      3: 'Moderately confident',
      4: 'Very confident',
      5: 'Extremely confident',
    };
    return labels[level] || '';
  };

  if (loading) {
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
        {/* Daily Greeting */}
        {greeting && (
          <div className="card daisy-accent" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '32px' }}>{greeting.emoji}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0' }}>{greeting.title}</h3>
                <p style={{ margin: 0, color: 'var(--text)' }}>{greeting.content}</p>
              </div>
            </div>
          </div>
        )}

        {/* Confidence Question */}
        {showConfidenceQuestion && !confidenceSubmitted && (
          <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--brand-500)' }}>
            <h2 style={{ marginBottom: '12px' }}>How are you feeling today? 💭</h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              How confident do you feel about your studies right now?
            </p>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginBottom: '12px' }}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setConfidenceLevel(level)}
                    className="btn"
                    style={{
                      flex: 1,
                      backgroundColor: confidenceLevel === level ? 'var(--brand-500)' : 'var(--surface)',
                      color: confidenceLevel === level ? 'white' : 'var(--text)',
                      borderColor: confidenceLevel === level ? 'var(--brand-500)' : 'var(--line)',
                      fontWeight: confidenceLevel === level ? '700' : '500',
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
              {confidenceLevel && (
                <p style={{ textAlign: 'center', margin: '8px 0 0 0', fontWeight: '600', color: 'var(--brand-700)' }}>
                  {getConfidenceLabel(confidenceLevel)}
                </p>
              )}
            </div>
            <button
              onClick={handleConfidenceSubmit}
              className="btn btn-primary"
              disabled={confidenceLevel === null}
              style={{ width: '100%' }}
            >
              Save
            </button>
          </div>
        )}

        {confidenceSubmitted && confidenceLevel && (
          <div className="card" style={{ marginBottom: '24px', backgroundColor: 'var(--brand-50)', borderColor: 'var(--brand-300)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>💪</span>
              <div>
                <strong>Today's Confidence:</strong> {confidenceLevel}/5 - {getConfidenceLabel(confidenceLevel)}
              </div>
            </div>
          </div>
        )}

        {/* Today's Schedule */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '16px' }}>Today's Schedule 📅</h2>
          {todayTasks.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No tasks scheduled for today. You're all set! 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todayTasks.map((task) => {
                const subjectName = getSubjectName(task.topic_id);
                return (
                  <div
                    key={task.id}
                    className="card"
                    style={{
                      borderLeft: `4px solid ${subjectName ? subjects.find(s => s.id === task.topic_id)?.color || 'var(--brand-500)' : 'var(--brand-500)'}`,
                      margin: 0,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0 }}>{task.title}</h3>
                      <span className="badge badge-blue">{getTaskTypeLabel(task.task_type)}</span>
                    </div>
                    {subjectName && (
                      <span className="badge" style={{ marginBottom: '8px' }}>{subjectName}</span>
                    )}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="badge">Status: {task.status}</span>
                      {task.deadline && (
                        <span className="badge badge-daisy">
                          Due: {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-3">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--brand-500)', marginBottom: '8px' }}>
              {todayTasks.length}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Tasks Today</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--brand-500)', marginBottom: '8px' }}>
              {subjects.length}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Subjects</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', color: confidenceLevel ? 'var(--brand-500)' : 'var(--muted)', marginBottom: '8px' }}>
              {confidenceLevel ? `${confidenceLevel}/5` : '—'}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '14px' }}>Confidence</div>
          </div>
        </div>
      </div>
      <PWAInstallPrompt />
    </>
  );
}
