'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

interface Task {
  id: number;
  task_type: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
  importance: number;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }

    loadTasks();
  }, [router]);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      revision_session: { label: 'Revision', class: 'badge-blue' },
      exam: { label: 'Exam', class: 'badge-daisy' },
      custom: { label: 'Custom', class: 'badge' },
    };
    return badges[type] || badges.custom;
  };

  if (loading) {
    return (
      <div className="container">
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <>
      <Header showLogout={true} />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Tasks</h1>
        </div>

      {tasks.length === 0 ? (
        <div className="card">
          <p>No tasks yet. Create your first task to get started!</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {tasks.map((task) => {
            const badge = getTaskTypeBadge(task.task_type);
            return (
              <div key={task.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0 }}>{task.title}</h3>
                  <span className={badge.class}>{badge.label}</span>
                </div>
                {task.description && <p style={{ margin: '8px 0' }}>{task.description}</p>}
                {task.deadline && (
                  <div className="deadline" style={{ marginTop: '12px' }}>
                    Deadline: {new Date(task.deadline).toLocaleDateString()}
                  </div>
                )}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="badge">Status: {task.status}</span>
                  <span className="badge">Importance: {task.importance}/5</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </>
  );
}

