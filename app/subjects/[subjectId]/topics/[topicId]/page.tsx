'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';

interface Material {
  id: number;
  title: string;
  content: string;
  file_name: string | null;
  file_type: string | null;
  uploaded_at: string;
}

interface Confidence {
  level: number;
  date: string;
}

export default function TopicDetailPage() {
  const router = useRouter();
  const params = useParams();
  const subjectId = parseInt(params.subjectId as string);
  const topicId = parseInt(params.topicId as string);
  
  const [topic, setTopic] = useState<any>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showRevision, setShowRevision] = useState(false);
  const [revisionContent, setRevisionContent] = useState('');
  const [showExamModal, setShowExamModal] = useState(false);
  const [examType, setExamType] = useState<'mock' | 'real'>('mock');
  const [numQuestions, setNumQuestions] = useState(10);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<number | null>(null);
  const [generatingExam, setGeneratingExam] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    title: '',
    content: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>('text');
  const [uploading, setUploading] = useState(false);
  const [combining, setCombining] = useState(false);

  useEffect(() => {
    const authenticated = localStorage.getItem('teachpilot_authenticated');
    if (authenticated !== 'true') {
      router.push('/');
      return;
    }

    loadTopicData();
  }, [router, topicId]);

  const loadTopicData = async () => {
    try {
      const [topicRes, materialsRes, confidenceRes] = await Promise.all([
        fetch(`/api/topics/${topicId}`),
        fetch(`/api/topics/${topicId}/materials`),
        fetch(`/api/confidence?topic_id=${topicId}`),
      ]);

      const topicData = await topicRes.json();
      const materialsData = await materialsRes.json();
      const confidenceData = await confidenceRes.json();

      if (topicData.success) setTopic(topicData.data);
      if (materialsData.success) setMaterials(materialsData.data || []);
      if (confidenceData.success && confidenceData.data.length > 0) {
        const latest = confidenceData.data[0];
        setConfidence({ level: latest.confidence_level, date: latest.tracked_at });
      }
    } catch (error) {
      console.error('Failed to load topic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('topic_id', topicId.toString());
      formData.append('title', materialForm.title);
      
      if (uploadMode === 'file' && selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('content', materialForm.content);
        formData.append('file_type', 'text');
      }

      const response = await fetch('/api/revision-materials', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        await loadTopicData();
        setShowMaterialForm(false);
        setMaterialForm({ title: '', content: '' });
        setSelectedFile(null);
        setUploadMode('text');
      } else {
        alert(data.message || 'Failed to upload material');
      }
    } catch (error) {
      console.error('Failed to upload material:', error);
      alert('Failed to upload material. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRevise = async (materialId: number) => {
    try {
      setShowRevision(true);
      setRevisionContent('Generating revision summary...');
      
      const response = await fetch('/api/revision/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          topic_id: topicId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setRevisionContent(data.data.revision_summary);
      } else {
        setRevisionContent('Failed to generate revision summary. Please try again.');
      }
    } catch (error) {
      console.error('Failed to generate revision:', error);
      setRevisionContent('Failed to generate revision summary. Please try again.');
    }
  };

  const handleDeleteTopic = async (topicId: number, topicName: string) => {
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
        router.push(`/subjects/${subjectId}`);
      } else {
        alert(data.message || 'Failed to delete topic. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete topic:', error);
      alert('Failed to delete topic. Please try again.');
    }
  };

  const handleDeleteMaterial = async (materialId: number, materialTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${materialTitle}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/revision-materials/${materialId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        alert('Material deleted successfully.');
        await loadTopicData(); // Reload to refresh the list
      } else {
        alert(data.message || 'Failed to delete material. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete material:', error);
      alert('Failed to delete material. Please try again.');
    }
  };

  const handleCombineTopicMaterials = async () => {
    if (materials.length < 2) {
      alert('You need at least 2 materials to combine them.');
      return;
    }

    if (!window.confirm(`This will create a new combined revision material from all ${materials.length} materials in this topic. Continue?`)) {
      return;
    }

    setCombining(true);
    try {
      const response = await fetch('/api/revision/combine-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: topicId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully created combined revision material! It has been added to your materials list.`);
        await loadTopicData(); // Reload to show the new material
      } else {
        alert(data.message || 'Failed to combine materials. Please try again.');
      }
    } catch (error) {
      console.error('Failed to combine materials:', error);
      alert('Failed to combine materials. Please try again.');
    } finally {
      setCombining(false);
    }
  };

  const handleGenerateExam = async () => {
    if (!selectedMaterial) {
      alert('Please select a material first');
      return;
    }

    setGeneratingExam(true);
    try {
      const endpoint = examType === 'mock' 
        ? '/api/exams/generate-mock' 
        : '/api/exams/generate';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: selectedMaterial,
          topic_id: topicId,
          num_questions: numQuestions,
          additional_instructions: additionalInstructions.trim() || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowExamModal(false);
        setAdditionalInstructions('');
        router.push(`/exams/${data.data.exam.id}/take?type=${examType}`);
      } else {
        alert(data.message || 'Failed to generate exam. Please try again.');
      }
    } catch (error) {
      console.error('Failed to generate exam:', error);
      alert('Failed to generate exam. Please check your connection and try again.');
    } finally {
      setGeneratingExam(false);
    }
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
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => router.push('/subjects')}
            className="btn btn-quiet"
            style={{ marginBottom: '16px' }}
          >
            ← Back to Subjects
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <h1 style={{ margin: 0 }}>{topic?.name || 'Topic'}</h1>
              {topic?.description && <p style={{ color: 'var(--muted)', marginTop: '8px' }}>{topic.description}</p>}
            </div>
            <button
              onClick={() => handleDeleteTopic(topicId, topic?.name || 'Topic')}
              className="btn btn-quiet"
              style={{ padding: '8px 12px', color: 'var(--danger)' }}
              title="Delete topic"
            >
              🗑️ Delete Topic
            </button>
          </div>
        </div>

        {/* Confidence Display */}
        {confidence && (
          <div className="card" style={{ marginBottom: '24px', backgroundColor: 'var(--brand-50)', borderColor: 'var(--brand-300)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>💪</span>
              <div>
                <strong>Current Confidence:</strong> {confidence.level}/5
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                  Last updated: {new Date(confidence.date).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Materials Section */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0 }}>Learning Materials</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {materials.length > 1 && (
                <button
                  onClick={handleCombineTopicMaterials}
                  className="btn btn-secondary"
                  disabled={combining}
                >
                  {combining ? 'Combining...' : '📚 Combine All Materials'}
                </button>
              )}
              <button
                onClick={() => setShowMaterialForm(!showMaterialForm)}
                className="btn btn-primary"
              >
                {showMaterialForm ? 'Cancel' : '+ Upload Material'}
              </button>
            </div>
          </div>

          {showMaterialForm && (
            <form onSubmit={handleMaterialSubmit} style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="material-title" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Material Title *
                </label>
                <input
                  id="material-title"
                  type="text"
                  className="input"
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  placeholder="e.g., Chapter 5 Notes, Practice Problems"
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode('text');
                      setSelectedFile(null);
                    }}
                    className="btn"
                    style={{
                      backgroundColor: uploadMode === 'text' ? 'var(--brand-500)' : 'var(--surface)',
                      color: uploadMode === 'text' ? 'white' : 'var(--text)',
                      borderColor: uploadMode === 'text' ? 'var(--brand-500)' : 'var(--line)',
                    }}
                  >
                    📝 Type Text
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode('file');
                      setMaterialForm({ ...materialForm, content: '' });
                    }}
                    className="btn"
                    style={{
                      backgroundColor: uploadMode === 'file' ? 'var(--brand-500)' : 'var(--surface)',
                      color: uploadMode === 'file' ? 'white' : 'var(--text)',
                      borderColor: uploadMode === 'file' ? 'var(--brand-500)' : 'var(--line)',
                    }}
                  >
                    📄 Upload File
                  </button>
                </div>

                {uploadMode === 'text' ? (
                  <>
                    <label htmlFor="material-content" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                      Content *
                    </label>
                    <textarea
                      id="material-content"
                      className="input"
                      value={materialForm.content}
                      onChange={(e) => setMaterialForm({ ...materialForm, content: e.target.value })}
                      rows={8}
                      placeholder="Paste or type your revision material here..."
                      required={uploadMode === 'text'}
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor="material-file" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                      Upload File * (PDF, DOCX, XLS, XLSX, TXT)
                    </label>
                    <input
                      id="material-file"
                      type="file"
                      accept=".pdf,.docx,.xls,.xlsx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const extension = file.name.split('.').pop()?.toLowerCase();
                          if (extension === 'doc') {
                            alert('DOC files (old Word format) are not supported. Please convert to DOCX or PDF first.');
                            e.target.value = '';
                            return;
                          }
                          setSelectedFile(file);
                          if (!materialForm.title) {
                            setMaterialForm({ ...materialForm, title: file.name.replace(/\.[^/.]+$/, '') });
                          }
                        }
                      }}
                      className="input"
                      required={uploadMode === 'file'}
                      style={{ padding: '8px' }}
                    />
                    <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>
                      Note: DOC files (old Word format) are not supported. Please convert to DOCX or PDF.
                    </p>
                    {selectedFile && (
                      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'var(--brand-50)', borderRadius: 'var(--radius-md)', fontSize: '14px' }}>
                        ✓ Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </div>
                    )}
                  </>
                )}
              </div>

              <button type="submit" className="btn btn-primary" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Material'}
              </button>
            </form>
          )}

          {materials.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No materials uploaded yet. Upload your first material to get started!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="card"
                  style={{
                    borderLeft: '4px solid var(--brand-500)',
                    margin: 0,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{material.title}</h3>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                        Uploaded: {new Date(material.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="badge">{material.file_type || 'text'}</span>
                      <button
                        onClick={() => handleDeleteMaterial(material.id, material.title)}
                        className="btn btn-quiet"
                        style={{ padding: '4px 8px', fontSize: '14px', color: 'var(--danger)' }}
                        title="Delete material"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleRevise(material.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '14px' }}
                    >
                      📖 Revise
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMaterial(material.id);
                        setExamType('mock');
                        setAdditionalInstructions('');
                        setShowExamModal(true);
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '14px' }}
                    >
                      🎯 Mock Exam
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMaterial(material.id);
                        setExamType('real');
                        setAdditionalInstructions('');
                        setShowExamModal(true);
                      }}
                      className="btn btn-primary"
                      style={{ fontSize: '14px' }}
                    >
                      📝 Real Exam
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revision Modal */}
        {showRevision && (
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
            onClick={() => setShowRevision(false)}
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
                <h2 style={{ margin: 0 }}>Revision Summary</h2>
                <button
                  onClick={() => setShowRevision(false)}
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
            onClick={() => {
              setShowExamModal(false);
              setAdditionalInstructions('');
            }}
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

              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="additional-instructions" style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Additional Instructions (Optional)
                </label>
                <textarea
                  id="additional-instructions"
                  className="input"
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  rows={4}
                  placeholder="e.g., Focus on chapter 3, include questions about photosynthesis, make questions harder..."
                />
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>
                  Add specific questions you want included or any special instructions for the exam.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleGenerateExam}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={generatingExam}
                >
                  {generatingExam ? 'Generating...' : 'Generate & Start Exam'}
                </button>
                <button
                  onClick={() => {
                    setShowExamModal(false);
                    setAdditionalInstructions('');
                  }}
                  className="btn btn-secondary"
                  disabled={generatingExam}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}


