import React from 'react';

export default function ProfileButtons({ onViewResume, onDeleteAccount, onCancel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', width: '100%' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          type="submit" 
          style={{ flex: '1 1 125px', background: 'linear-gradient(to right, #10b981, #14b8a6)', color: '#ffffff', fontWeight: '800', padding: '14px 10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '14px', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)' }}
        >
          Save Profile
        </button>
        <button 
          type="button" 
          onClick={onViewResume} 
          style={{ flex: '1 1 125px', backgroundColor: '#0ea5e9', color: '#ffffff', fontWeight: '800', padding: '14px 10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '14px', boxShadow: '0 6px 20px rgba(14, 165, 233, 0.5)' }}
        >
          View Resume
        </button>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          type="button" 
          onClick={onDeleteAccount} 
          style={{ flex: '1 1 125px', backgroundColor: '#f43f5e', color: '#ffffff', fontWeight: '800', padding: '14px 10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '14px', boxShadow: '0 6px 20px rgba(244, 63, 94, 0.5)' }}
        >
          Delete Account
        </button>
        <button 
          type="button" 
          onClick={onCancel} 
          style={{ flex: '1 1 125px', backgroundColor: '#64748b', color: '#ffffff', fontWeight: '800', padding: '14px 10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '14px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}