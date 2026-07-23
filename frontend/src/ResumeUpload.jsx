import React, { useState } from 'react';
import api from './api';

export default function ResumeSection({ profile, onProfileUpdate }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('resume-file-input');
    if (fileInput) fileInput.value = '';
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('resume', selectedFile);

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await api.post('/profile/resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setMessage('Resume uploaded successfully!');
      setSelectedFile(null);
      
      const fileInput = document.getElementById('resume-file-input');
      if (fileInput) fileInput.value = '';

      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      setMessage('Failed to upload resume.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm("Are you sure you want to delete your resume?")) return;

    try {
      const token = localStorage.getItem('token');
      await api.delete('/profile/resume', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Resume deleted successfully.');
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      setMessage('Failed to delete resume.');
    }
  };

  const handleViewResume = () => {
    if (!profile?.resume_text) return;

    try {
      const byteCharacters = atob(profile.resume_text);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      //dynamically detect file type to handle viewing
      let mimeType = 'application/pdf';
      let fileName = 'resume.pdf';
      if (byteArray.length > 2 && byteArray[0] === 0x50 && byteArray[1] === 0x4B) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileName = 'resume.docx';
      }

      const blob = new Blob([byteArray], { type: mimeType });
      const fileURL = URL.createObjectURL(blob);
      
      if (mimeType.includes('wordprocessingml')) {
        const link = document.createElement('a');
        link.href = fileURL;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(fileURL, '_blank');
      }
    } catch (e) {
      console.error("Error opening resume preview", e);
      setMessage("Could not preview resume format.");
    }
  };

const hasResume = profile && profile.resume_text;

  return (
    <div style={{ 
      backgroundColor: '#0f172a', 
      border: '2px solid #a855f7', 
      borderRadius: '14px', 
      padding: '20px', 
      marginTop: '20px' 
    }}>
      <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>
        Resume Management
      </label>
      <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '16px', fontWeight: '500' }}>
        Upload your resume to power up AI interview context and feedback.
      </p>

      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            id="resume-file-input"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600' }}
          />
          {selectedFile && (
            <button
              type="button"
              onClick={handleClearSelection}
              style={{ backgroundColor: '#475569', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}
              title="Clear selection"
            >
              ✕
            </button>
          )}
        </div>

        {selectedFile && (
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: 'linear-gradient(to right, #10b981, #14b8a6)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)' }}
          >
            {loading ? 'Uploading...' : 'Upload Selected Resume'}
          </button>
        )}
      </form>

      {hasResume && !selectedFile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
          <div style={{ flex: 1, backgroundColor: '#10b981', border: '1px solid #ffffff', color: '#ffffff', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', textAlign: 'center' }}>
            Resume uploaded successfully!
          </div>
          <button
            type="button"
            onClick={handleViewResume}
            style={{ backgroundColor: '#3b82f6', color: '#ffffff', fontWeight: '800', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}
          >
            View Resume
          </button>
          <button
            type="button"
            onClick={handleDeleteResume}
            style={{ backgroundColor: '#ef4444', color: '#ffffff', fontWeight: '800', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(239,68,68,0.4)' }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Feedback message for active upload actions */}
      {message && !hasResume && (
        <div style={{ backgroundColor: '#10b981', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginTop: '16px', fontWeight: '700', textAlign: 'center' }}>
          {message}
        </div>
      )}
    </div>
  );
}