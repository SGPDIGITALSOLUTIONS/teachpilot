'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';

interface Question {
  id: number;
  type: string;
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

export default function TakeExamPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const examId = parseInt(params.id as string);
  const examType = searchParams.get('type') || 'exam';
  
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showQuestionOverview, setShowQuestionOverview] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }

    loadExam();
  }, [router, examId]);

  // Keyboard navigation
  useEffect(() => {
    if (submitted || loading || questions.length === 0) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't interfere with text inputs
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') {
        return;
      }

      if (e.key === 'ArrowLeft' && currentQuestion > 0) {
        setCurrentQuestion(currentQuestion - 1);
      } else if (e.key === 'ArrowRight' && currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentQuestion, questions.length, submitted, loading]);

  const loadExam = async () => {
    try {
      const response = await fetch(`/api/exams/${examId}`);
      const data = await response.json();
      if (data.success) {
        setExam(data.data);
        
        // Parse questions - handle both string and already parsed JSON
        let questionsData;
        if (typeof data.data.questions === 'string') {
          try {
            questionsData = JSON.parse(data.data.questions);
          } catch (parseError) {
            console.error('Failed to parse questions JSON:', parseError);
            console.error('Questions data:', data.data.questions);
            alert('Failed to load exam questions. Please try again.');
            return;
          }
        } else {
          questionsData = data.data.questions;
        }
        
        // Ensure questions is an array
        if (Array.isArray(questionsData)) {
          console.log('Loaded questions (array):', questionsData.length, 'questions');
          console.log('First question:', questionsData[0]);
          setQuestions(questionsData);
        } else if (questionsData && Array.isArray(questionsData.questions)) {
          // Handle case where OpenAI returns { questions: [...] }
          console.log('Loaded questions (nested):', questionsData.questions.length, 'questions');
          console.log('First question:', questionsData.questions[0]);
          setQuestions(questionsData.questions);
        } else {
          console.error('Invalid questions format:', questionsData);
          console.error('Type:', typeof questionsData);
          console.error('Is array:', Array.isArray(questionsData));
          alert('Exam questions are in an invalid format. Please contact support.');
        }
      } else {
        alert(data.message || 'Failed to load exam');
      }
    } catch (error) {
      console.error('Failed to load exam:', error);
      alert('Failed to load exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: number, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleDeleteAttempt = async (attemptId: number) => {
    if (!window.confirm('Are you sure you want to delete this exam attempt?\n\nThis will remove:\n- Your answers and score\n- Associated performance data\n\nThis action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/exams/attempts/${attemptId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        alert('Exam attempt deleted successfully.');
        // Navigate back to the topic or subjects page
        if (exam?.topic_id) {
          const topicRes = await fetch(`/api/topics/${exam.topic_id}`);
          const topicData = await topicRes.json();
          if (topicData.success && topicData.data.subject_id) {
            router.push(`/subjects/${topicData.data.subject_id}/topics/${exam.topic_id}`);
          } else {
            router.push('/subjects');
          }
        } else {
          router.push('/subjects');
        }
      } else {
        alert(data.message || 'Failed to delete exam attempt. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete exam attempt:', error);
      alert('Failed to delete exam attempt. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (submitting) return; // Prevent double submission
    
    // Confirm submission
    const unansweredCount = questions.length - Object.keys(answers).length;
    if (unansweredCount > 0) {
      const confirmMessage = `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Are you sure you want to submit?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    } else {
      if (!window.confirm('Are you sure you want to submit your exam?')) {
        return;
      }
    }
    
    setSubmitting(true);
    setSubmitError(null);
    
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    
    console.log('Submitting exam:', {
      examId,
      examType,
      answersCount: Object.keys(answers).length,
      questionsCount: questions.length,
      timeTaken,
      answers
    });
    
    try {
      const response = await fetch(`/api/exams/${examId}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_type: examType,
          answers: answers,
          time_taken: timeTaken,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Submit response:', data);
      
      if (data.success) {
        setResults(data.data);
        setSubmitted(true);
      } else {
        setSubmitError(data.message || 'Failed to submit exam. Please try again.');
        console.error('Submit failed:', data);
      }
    } catch (error: any) {
      console.error('Failed to submit exam:', error);
      setSubmitError(error.message || 'Failed to submit exam. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header showLogout={true} />
        <div className="container">
          <p>Loading exam...</p>
        </div>
      </>
    );
  }

  if (submitted && results) {
    return (
      <>
        <Header showLogout={true} />
        <div className="container">
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0 }}>Exam Results</h1>
              <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--brand-500)', margin: '20px 0' }}>
                {results.score}%
              </div>
              <p>
                You got {results.total_correct} out of {results.total_questions} questions correct.
              </p>
              {results.average_score !== undefined && results.average_score !== results.score && (
                <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '8px' }}>
                  Average score: {results.average_score}% (weighted by answer quality)
                </p>
              )}
            </div>
            <button
              onClick={() => handleDeleteAttempt(results.attempt.id)}
              className="btn btn-quiet"
              style={{ padding: '8px 12px', color: 'var(--danger)' }}
              title="Delete this exam attempt"
            >
              🗑️ Delete
            </button>
          </div>
        </div>

          <div className="card" style={{ marginBottom: '24px' }}>
            <h2>Question Review</h2>
            {results.results.map((result: any, index: number) => {
              const question = questions[index];
              return (
                <div
                  key={index}
                  className="card"
                  style={{
                    marginBottom: '16px',
                    borderLeft: `4px solid ${result.is_correct ? 'var(--success)' : 'var(--danger)'}`,
                    margin: '0 0 16px 0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <strong>Question {index + 1}</strong>
                    {result.is_correct ? (
                      <span className="badge" style={{ backgroundColor: 'var(--success)', color: 'white' }}>
                        ✓ Correct
                      </span>
                    ) : (
                      <span className="badge" style={{ backgroundColor: 'var(--danger)', color: 'white' }}>
                        ✗ Incorrect
                      </span>
                    )}
                  </div>
                  <p style={{ marginBottom: '8px' }}>{question.question}</p>
                  <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                    <div>Your answer: <strong>{result.user_answer || 'No answer'}</strong></div>
                    <div>Correct answer: <strong>{result.correct_answer}</strong></div>
                    {result.score !== undefined && (
                      <div style={{ marginTop: '4px' }}>
                        Score: <strong>{result.score}/100</strong>
                      </div>
                    )}
                    {result.feedback && (
                      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--brand-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-200)' }}>
                        <strong>Feedback:</strong> {result.feedback}
                      </div>
                    )}
                    {result.explanation && (
                      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                        <strong>Explanation:</strong> {result.explanation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <ConfidenceQuestion
            topicId={exam.topic_id}
            examAttemptId={results.attempt.id}
            onComplete={async () => {
              // Get subject_id from topic
              const topicRes = await fetch(`/api/topics/${exam.topic_id}`);
              const topicData = await topicRes.json();
              if (topicData.success && topicData.data.subject_id) {
                router.push(`/subjects/${topicData.data.subject_id}/topics/${exam.topic_id}`);
              } else {
                router.push('/subjects');
              }
            }}
          />
        </div>
      </>
    );
  }

  if (questions.length === 0 && !loading) {
    return (
      <>
        <Header showLogout={true} />
        <div className="container">
          <div className="card">
            <h1>No Questions Available</h1>
            <p>This exam doesn't have any questions loaded. Please try refreshing or contact support.</p>
            <button onClick={() => router.push('/subjects')} className="btn btn-primary" style={{ marginTop: '16px' }}>
              Back to Subjects
            </button>
          </div>
        </div>
      </>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <>
      <Header showLogout={true} />
      <div className="container">
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1>{exam?.title}</h1>
            <span className={`badge ${examType === 'mock' ? 'badge-daisy' : 'badge-blue'}`}>
              {examType === 'mock' ? 'Mock Exam' : 'Real Exam'}
            </span>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px' }}>Question {currentQuestion + 1} of {questions.length}</span>
                <button
                  onClick={() => setShowQuestionOverview(!showQuestionOverview)}
                  className="btn btn-quiet"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  {showQuestionOverview ? 'Hide' : 'Show'} Overview
                </button>
              </div>
              <span style={{ fontSize: '14px' }}>{Math.round(progress)}%</span>
            </div>
            <div className="progress">
              <span style={{ width: `${progress}%` }}></span>
            </div>
          </div>

          {showQuestionOverview && (
            <div style={{ 
              marginTop: '16px', 
              padding: '16px', 
              backgroundColor: 'var(--surface-2)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', 
                gap: '8px' 
              }}>
                {questions.map((q, index) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = index === currentQuestion;
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentQuestion(index);
                        setShowQuestionOverview(false);
                      }}
                      className="btn"
                      style={{
                        padding: '8px',
                        minWidth: '44px',
                        backgroundColor: isCurrent 
                          ? 'var(--brand-500)' 
                          : isAnswered 
                            ? 'var(--success)' 
                            : 'var(--surface)',
                        color: isCurrent || isAnswered ? 'white' : 'var(--text)',
                        borderColor: isCurrent ? 'var(--brand-500)' : 'var(--line)',
                        fontWeight: isCurrent ? '700' : '500',
                        fontSize: '14px',
                      }}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--muted)', display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--brand-500)', borderRadius: '4px' }}></div>
                  <span>Current</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--success)', borderRadius: '4px' }}></div>
                  <span>Answered</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '4px' }}></div>
                  <span>Not answered</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {question ? (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>{question.question || 'Question'}</h2>

            {question.type === 'multiple_choice' && question.options && Array.isArray(question.options) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {question.options.map((option, index) => (
                  <label
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: `2px solid ${answers[question.id] === option ? 'var(--brand-500)' : 'var(--line)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      backgroundColor: answers[question.id] === option ? 'var(--brand-50)' : 'var(--surface)',
                    }}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={(e) => handleAnswer(question.id, e.target.value)}
                      style={{ marginRight: '12px' }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === 'short_answer' && (
              <textarea
                className="input"
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                rows={4}
                placeholder="Type your answer here..."
              />
            )}

            {question.type === 'true_false' && (
              <div style={{ display: 'flex', gap: '12px' }}>
                {['True', 'False'].map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 24px',
                      border: `2px solid ${answers[question.id] === option ? 'var(--brand-500)' : 'var(--line)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      backgroundColor: answers[question.id] === option ? 'var(--brand-50)' : 'var(--surface)',
                    }}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={(e) => handleAnswer(question.id, e.target.value)}
                      style={{ marginRight: '8px' }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {(!question.type || (question.type !== 'multiple_choice' && question.type !== 'short_answer' && question.type !== 'true_false')) && (
              <div style={{ padding: '16px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-md)', marginTop: '16px' }}>
                <p style={{ color: 'var(--muted)', marginBottom: '12px' }}>
                  <strong>Question Type:</strong> {question.type || 'Unknown'}
                </p>
                <p style={{ color: 'var(--muted)', marginBottom: '12px' }}>
                  <strong>Question ID:</strong> {question.id}
                </p>
                <textarea
                  className="input"
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswer(question.id, e.target.value)}
                  rows={4}
                  placeholder="Type your answer here..."
                />
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                  This question type is not fully supported. Please type your answer above.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ marginBottom: '24px' }}>
            <p>Loading question...</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            className="btn btn-secondary"
            disabled={currentQuestion === 0}
          >
            ← Previous
          </button>
          
          {currentQuestion < questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              className="btn btn-primary"
            >
              Next →
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>
                {Object.keys(answers).length} of {questions.length} questions answered
              </div>
              {submitError && (
                <div className="alert danger" style={{ marginBottom: '8px', fontSize: '13px', padding: '8px 12px' }}>
                  {submitError}
                </div>
              )}
              <button
                onClick={handleSubmit}
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ConfidenceQuestion({ topicId, examAttemptId, onComplete }: any) {
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [comparison, setComparison] = useState<string>('');

  const handleSubmit = async () => {
    if (confidenceLevel === null) return;

    try {
      const response = await fetch('/api/confidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: topicId,
          exam_attempt_id: examAttemptId,
          confidence_level: confidenceLevel,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setComparison(data.data.comparison);
        setSubmitted(true);
      } else {
        alert(data.message || 'Failed to save confidence');
      }
    } catch (error) {
      console.error('Failed to save confidence:', error);
      alert('Failed to save confidence. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="card" style={{ backgroundColor: 'var(--brand-50)', borderColor: 'var(--brand-300)' }}>
        <h2 style={{ marginBottom: '12px' }}>Confidence Saved! 💪</h2>
        <p style={{ marginBottom: '8px' }}>
          <strong>Your confidence level:</strong> {confidenceLevel}/5
        </p>
        {comparison && (
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>{comparison}</p>
        )}
        <button onClick={onComplete} className="btn btn-primary" style={{ marginTop: '16px' }}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '12px' }}>How confident do you feel with this topic now? 💭</h2>
      <p style={{ marginBottom: '16px', color: 'var(--muted)' }}>
        Rate your confidence level from 1 (not confident at all) to 5 (extremely confident)
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
            {confidenceLevel === 1 && 'Not confident at all'}
            {confidenceLevel === 2 && 'Slightly confident'}
            {confidenceLevel === 3 && 'Moderately confident'}
            {confidenceLevel === 4 && 'Very confident'}
            {confidenceLevel === 5 && 'Extremely confident'}
          </p>
        )}
      </div>
      
      <button
        onClick={handleSubmit}
        className="btn btn-primary"
        disabled={confidenceLevel === null}
        style={{ width: '100%' }}
      >
        Save Confidence
      </button>
    </div>
  );
}


