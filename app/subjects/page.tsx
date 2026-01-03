'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

import Link from 'next/link';

interface Subject {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  color: string | null;
}

interface Topic {
  id: number;
  name: string;
  description: string | null;
}

export default function SubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topicsBySubject, setTopicsBySubject] = useState<Record<number, Topic[]>>({});
  const [confidenceAverages, setConfidenceAverages] = useState<Record<number, number | null>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingSubject, setProcessingSubject] = useState<number | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionContent, setRevisionContent] = useState('');
  const [showExamModal, setShowExamModal] = useState(false);
  const [examType, setExamType] = useState<'mock' | 'real'>('mock');
  const [numQuestions, setNumQuestions] = useState(10);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    color: '#0EA5E9',
  });

  useEffect(() => {
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }

    loadSubjects();
  }, [router]);

  const loadSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      const data = await response.json();
      if (data.success) {
        const subjectsList = data.data || [];
        setSubjects(subjectsList);
        
        // Load topics and confidence averages for each subject
        const topicsMap: Record<number, Topic[]> = {};
        const confidenceMap: Record<number, number | null> = {};
        
        for (const subject of subjectsList) {
          try {
            const [topicsResponse, confidenceResponse] = await Promise.all([
              fetch(`/api/subjects/${subject.id}/topics`),
              fetch(`/api/subjects/${subject.id}/confidence-average`),
            ]);
            
            const topicsData = await topicsResponse.json();
            const confidenceData = await confidenceResponse.json();
            
            if (topicsData.success) {
              topicsMap[subject.id] = topicsData.data || [];
            }
            if (confidenceData.success) {
              confidenceMap[subject.id] = confidenceData.data.average_confidence;
            }
          } catch (error) {
            console.error(`Failed to load data for subject ${subject.id}:`, error);
            topicsMap[subject.id] = [];
            confidenceMap[subject.id] = null;
          }
        }
        setTopicsBySubject(topicsMap);
        setConfidenceAverages(confidenceMap);
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId: number) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);
  };

  const handleReviseAllTopics = async (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const topics = topicsBySubject[subjectId] || [];
    if (topics.length === 0) {
      alert('This subject has no topics. Add topics with materials first.');
      return;
    }

    setProcessingSubject(subjectId);
    setProcessingAction('revise');
    try {
      const response = await fetch('/api/revision/subject-revise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: subjectId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setRevisionContent(data.data.revision_summary);
        setShowRevisionModal(true);
      } else {
        alert(data.message || 'Failed to generate revision summary. Please try again.');
      }
    } catch (error) {
      console.error('Failed to generate revision:', error);
      alert('Failed to generate revision summary. Please try again.');
    } finally {
      setProcessingSubject(null);
      setProcessingAction(null);
    }
  };

  const handleTakeExam = async (subjectId: number, type: 'mock' | 'real') => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const topics = topicsBySubject[subjectId] || [];
    if (topics.length === 0) {
      alert('This subject has no topics. Add topics with materials first.');
      return;
    }

    setSelectedSubjectId(subjectId);
    setExamType(type);
    setShowExamModal(true);
  };

  const handleDeleteTopic = async (subjectId: number, topicId: number, topicName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${topicName}"?\n\nThis will delete:\n- All learning materials in this topic\n\nThis will KEEP:\n- All exam scores and performance data\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/topics/${topicId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        alert('Topic deleted successfully.');
        await loadSubjects(); // Reload to refresh the list
      } else {
        alert(data.message || 'Failed to delete topic. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete topic:', error);
      alert('Failed to delete topic. Please try again.');
    }
  };

  const handleDeleteSubject = async (subjectId: number, subjectName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${subjectName}"?\n\nThis will delete:\n- All topics in this subject\n- All learning materials\n\nThis will KEEP:\n- All exam scores and performance data\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/subjects/${subjectId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        alert('Subject deleted successfully. Exam scores have been preserved.');
        await loadSubjects(); // Reload to refresh the list
      } else {
        alert(data.message || 'Failed to delete subject. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete subject:', error);
      alert('Failed to delete subject. Please try again.');
    }
  };

  const handleGenerateSubjectExam = async () => {
    if (!selectedSubjectId) return;

    setProcessingSubject(selectedSubjectId);
    setProcessingAction(examType === 'mock' ? 'mock-exam' : 'real-exam');
    
    try {
      const endpoint = examType === 'mock'
        ? '/api/exams/generate-subject-mock'
        : '/api/exams/generate-subject';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_id: selectedSubjectId,
          num_questions: numQuestions,
          additional_instructions: '',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowExamModal(false);
        router.push(`/exams/${data.data.exam.id}/take?type=${examType}`);
      } else {
        alert(data.message || 'Failed to generate exam. Please try again.');
      }
    } catch (error) {
      console.error('Failed to generate exam:', error);
      alert('Failed to generate exam. Please try again.');
    } finally {
      setProcessingSubject(null);
      setProcessingAction(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Form submitted with data:', formData);
    setError(null);
    setSubmitting(true);

    try {
      console.log('Sending request to /api/subjects');
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        console.log('Subject created successfully, reloading...');
        await loadSubjects();
        setShowForm(false);
        setFormData({
          name: '',
          category: '',
          description: '',
          color: '#0EA5E9',
        });
      } else {
        const errorMsg = data.message || 'Failed to create subject. Please try again.';
        console.error('API returned error:', errorMsg);
        setError(errorMsg);
      }
    } catch (error: any) {
      console.error('Failed to create subject:', error);
      setError(`An error occurred: ${error.message || 'Please check your connection and try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header showLogout={true} />
        <div className="container">
          <p>Loading subjects...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header showLogout={true} />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Subjects</h1>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : '+ New Subject'}
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>Add New Subject</h2>
            {error && (
              <div className="alert danger" style={{ marginBottom: '16px' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="name" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Subject Name *
                </label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Mathematics, Science, English"
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="category" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Category (Optional)
                </label>
                <input
                  id="category"
                  type="text"
                  className="input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Core, Elective"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="description" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Add a description for this subject"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="color" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Color
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    style={{ width: '60px', height: '44px', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    className="input"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    style={{ flex: 1 }}
                    placeholder="#0EA5E9"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Subject'}
              </button>
            </form>
          </div>
        )}

        {subjects.length === 0 ? (
          <div className="card">
            <p>No subjects yet. Create your first subject to get started!</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {subjects.map((subject) => {
              const topics = topicsBySubject[subject.id] || [];
              const isExpanded = expandedSubjects.has(subject.id);
              
              return (
                <div
                  key={subject.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${subject.color || 'var(--brand-500)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}>{subject.name}</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleDeleteSubject(subject.id, subject.name)}
                        className="btn btn-quiet"
                        style={{ padding: '4px 8px', fontSize: '14px', color: 'var(--danger)' }}
                        title="Delete subject"
                      >
                        🗑️
                      </button>
                      <button
                        onClick={() => toggleSubject(subject.id)}
                        className="btn btn-quiet"
                        style={{ padding: '4px 8px', fontSize: '14px' }}
                      >
                        {isExpanded ? '▼' : '▶'} Topics ({topics.length})
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {subject.category && (
                      <span className="badge badge-blue">
                        {subject.category}
                      </span>
                    )}
                    {confidenceAverages[subject.id] !== null && confidenceAverages[subject.id] !== undefined && (
                      <span className="badge" style={{ 
                        backgroundColor: confidenceAverages[subject.id]! >= 4 ? 'var(--success)' : 
                                         confidenceAverages[subject.id]! >= 3 ? 'var(--warning)' : 'var(--danger)',
                        color: 'white'
                      }}>
                        Avg Confidence: {confidenceAverages[subject.id]}/5
                      </span>
                    )}
                  </div>
                  
                  {subject.description && <p style={{ margin: '0 0 12px 0' }}>{subject.description}</p>}
                  
                  {isExpanded && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                      {/* Action Buttons at Top */}
                      {topics.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                          <button
                            onClick={() => handleReviseAllTopics(subject.id)}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                            disabled={processingSubject === subject.id && processingAction === 'revise'}
                          >
                            {processingSubject === subject.id && processingAction === 'revise' ? 'Generating...' : '📖 Revise All Topics'}
                          </button>
                          <button
                            onClick={() => handleTakeExam(subject.id, 'mock')}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                            disabled={processingSubject === subject.id}
                          >
                            🎯 Take Mock on All Topics
                          </button>
                          <button
                            onClick={() => handleTakeExam(subject.id, 'real')}
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            disabled={processingSubject === subject.id}
                          >
                            📝 Take Exam on All Topics
                          </button>
                        </div>
                      )}

                      {/* Topics List */}
                      {topics.length === 0 ? (
                        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '12px' }}>No topics yet. Add one below.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                            {topics.map((topic) => (
                              <div
                                key={topic.id}
                                className="card"
                                style={{
                                  padding: '12px',
                                  border: '1px solid var(--line)',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: 'var(--surface-2)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Link
                                  href={`/subjects/${subject.id}/topics/${topic.id}`}
                                  style={{
                                    textDecoration: 'none',
                                    flex: 1,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                >
                                  <div>
                                    <strong>{topic.name}</strong>
                                    {topic.description && (
                                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                                        {topic.description}
                                      </p>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '18px' }}>→</span>
                                </Link>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTopic(subject.id, topic.id, topic.name);
                                  }}
                                  className="btn btn-quiet"
                                  style={{ padding: '4px 8px', fontSize: '14px', color: 'var(--danger)', marginLeft: '8px' }}
                                  title="Delete topic"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Add Topic Button at Bottom */}
                      <Link
                        href={`/subjects/${subject.id}/topics/new`}
                        className="btn btn-secondary"
                        style={{ width: '100%', textAlign: 'center' }}
                      >
                        + Add Topic
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revision Modal */}
      {showRevisionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowRevisionModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Revision Summary - All Topics</h2>
              <button
                onClick={() => setShowRevisionModal(false)}
                className="btn btn-quiet"
              >
                ✕ Close
              </button>
            </div>
            <div
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                color: 'var(--text)',
              }}
            >
              {revisionContent}
            </div>
          </div>
        </div>
      )}

      {/* Exam Generation Modal */}
      {showExamModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowExamModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '500px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '16px' }}>
              {examType === 'mock' ? 'Take Mock Exam' : 'Take Real Exam'}
            </h2>
            <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
              {examType === 'mock'
                ? 'Mock exams are for practice. Your score will not be saved to your performance tracking.'
                : 'Real exams will save your score and contribute to your performance tracking.'}
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="num-questions" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                Number of Questions
              </label>
              <select
                id="num-questions"
                className="input"
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
              >
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={15}>15 questions</option>
                <option value={20}>20 questions</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleGenerateSubjectExam}
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={processingSubject !== null}
              >
                {processingSubject !== null ? 'Generating...' : 'Generate & Start Exam'}
              </button>
              <button
                onClick={() => setShowExamModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
