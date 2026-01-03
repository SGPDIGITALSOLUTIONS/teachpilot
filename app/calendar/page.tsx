'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface Task {
  id: number;
  task_type: string;
  topic_id: number | null;
  subtopic_id: number | null;
  title: string;
  description: string | null;
  start_date: string | null;
  deadline: string | null;
  status: string;
  importance: number;
  notes: string | null;
}

interface Subject {
  id: number;
  name: string;
  color: string | null;
}

export default function CalendarPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    task_type: 'revision_session',
    topic_id: '',
    title: '',
    description: '',
    start_date: '',
    deadline: '',
    status: 'pending',
    importance: '3',
    notes: '',
  });

  useEffect(() => {
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const [tasksRes, subjectsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/subjects'),
      ]);

      const tasksData = await tasksRes.json();
      const subjectsData = await subjectsRes.json();

      if (tasksData.success) {
        setTasks(tasksData.data || []);
      }
      if (subjectsData.success) {
        setSubjects(subjectsData.data || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          topic_id: formData.topic_id ? parseInt(formData.topic_id) : null,
          importance: parseInt(formData.importance),
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadData();
        setShowTaskForm(false);
        setEditingTask(null);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      task_type: 'revision_session',
      topic_id: '',
      title: '',
      description: '',
      start_date: '',
      deadline: '',
      status: 'pending',
      importance: '3',
      notes: '',
    });
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      task_type: task.task_type,
      topic_id: task.topic_id?.toString() || '',
      title: task.title,
      description: task.description || '',
      start_date: task.start_date || '',
      deadline: task.deadline || '',
      status: task.status,
      importance: task.importance.toString(),
      notes: task.notes || '',
    });
    setShowTaskForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
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

  const getSubjectName = (subjectId: number | null) => {
    if (!subjectId) return null;
    const subject = subjects.find((s) => s.id === subjectId);
    return subject?.name || 'Unknown';
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Calendar & Tasks</h1>
          <button
            onClick={() => {
              resetForm();
              setEditingTask(null);
              setShowTaskForm(true);
            }}
            className="btn btn-primary"
          >
            + New Task
          </button>
        </div>

        {showTaskForm && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2" style={{ marginBottom: '16px' }}>
                <div>
                  <label htmlFor="task_type" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Task Type *
                  </label>
                  <select
                    id="task_type"
                    className="input"
                    value={formData.task_type}
                    onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                    required
                  >
                    <option value="revision_session">Revision Session</option>
                    <option value="exam">Exam</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="topic_id" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Subject
                  </label>
                  <select
                    id="topic_id"
                    className="input"
                    value={formData.topic_id}
                    onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                  >
                    <option value="">Select a subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="title" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  className="input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="description" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Description
                </label>
                <textarea
                  id="description"
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-2" style={{ marginBottom: '16px' }}>
                <div>
                  <label htmlFor="start_date" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Start Date
                  </label>
                  <input
                    id="start_date"
                    type="date"
                    className="input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="deadline" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Deadline
                  </label>
                  <input
                    id="deadline"
                    type="date"
                    className="input"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ marginBottom: '20px' }}>
                <div>
                  <label htmlFor="status" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Status
                  </label>
                  <select
                    id="status"
                    className="input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="importance" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Importance (1-5)
                  </label>
                  <input
                    id="importance"
                    type="number"
                    min="1"
                    max="5"
                    className="input"
                    value={formData.importance}
                    onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary">
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskForm(false);
                    setEditingTask(null);
                    resetForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <h2 style={{ marginBottom: '16px' }}>All Tasks</h2>
          {tasks.length === 0 ? (
            <p>No tasks yet. Create your first task to get started!</p>
          ) : (
            <div className="grid grid-2">
              {tasks.map((task) => {
                const badge = getTaskTypeBadge(task.task_type);
                return (
                  <div key={task.id} className="card" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, flex: 1 }}>{task.title}</h3>
                      <span className={badge.class}>{badge.label}</span>
                    </div>
                    {task.description && <p style={{ margin: '8px 0', fontSize: '14px' }}>{task.description}</p>}
                    {getSubjectName(task.topic_id) && (
                      <div style={{ marginBottom: '8px' }}>
                        <span className="badge badge-blue">{getSubjectName(task.topic_id)}</span>
                      </div>
                    )}
                    {task.deadline && (
                      <div className="deadline" style={{ marginTop: '12px', marginBottom: '12px' }}>
                        Deadline: {new Date(task.deadline).toLocaleDateString()}
                      </div>
                    )}
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="badge">Status: {task.status}</span>
                      <span className="badge">Importance: {task.importance}/5</span>
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(task)}
                        className="btn btn-quiet"
                        style={{ fontSize: '13px', padding: '6px 10px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="btn btn-quiet"
                        style={{ fontSize: '13px', padding: '6px 10px', color: 'var(--danger)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
