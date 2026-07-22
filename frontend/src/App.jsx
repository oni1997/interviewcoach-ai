import React, { useState, useEffect } from 'react';
import api from './api';
import ResumeUpload from './ResumeUpload';

export default function App() {
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Software Engineer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [timeLeft, setTimeLeft] = useState(2700);

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ total_sessions: 0, completed_sessions: 0, average_score: null });
  const [history, setHistory] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);

  const [selectedType, setSelectedType] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  const [profileForm, setProfileForm] = useState({ headline: '', bio: '', target_role: '', experience_level: '', skills: '' });

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn-fallback')) {
      const link = document.createElement('link');
      link.id = 'tailwind-cdn-fallback';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (screen !== 'dashboard') {
      setTimeLeft(2700);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          handleLogout();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [screen]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchDashboardData = async () => {
    try {
      const [statsRes, historyRes, profileRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/history'),
        api.get('/profile').catch(() => null),
      ]);
      setStats(statsRes.data);
      setHistory(historyRes.data || []);
      if (profileRes?.data) {
        setProfile(profileRes.data);
        setProfileForm({
          headline: profileRes.data.headline || '',
          bio: profileRes.data.bio || '',
          target_role: profileRes.data.target_role || '',
          experience_level: profileRes.data.experience_level || '',
          skills: profileRes.data.skills || '',
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const fetchJobRoles = async () => {
    try {
      const res = await api.get('/job-roles');
      setJobRoles(res.data || []);
    } catch (err) {
      console.error('Failed to load job roles:', err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/register', {
        email,
        password,
        name: fullName,
        role,
      });
      setSuccess('Account created! Redirecting...');
      setTimeout(() => {
        setScreen('login');
        setSuccess('');
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please check your data.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setFullName(res.data.user.name);
      setScreen('dashboard');
      fetchDashboardData();
      fetchJobRoles();
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setScreen('login');
    setProfile(null);
    setHistory([]);
    setStats({ total_sessions: 0, completed_sessions: 0, average_score: null });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/profile', profileForm);
      setProfile(res.data);
      setSuccess('Profile updated!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
      setTimeout(() => setError(''), 2000);
    }
  };

  const startInterview = async (type) => {
    setSelectedType(type);
    setScreen('interview-setup');
    fetchJobRoles();
  };

  const createSession = async () => {
    try {
      const body = { interview_type: selectedType };
      if (selectedRole) {
        body.job_role_id = selectedRole;
      }
      const res = await api.post('/sessions', body);
      setCurrentSession(res.data);

      const sampleQuestions = selectedType === 'technical'
        ? [
            'Tell me about a complex project you worked on and your role in it.',
            'How do you approach debugging a difficult issue?',
            'Describe your experience with system design and architecture.',
          ]
        : [
            'Tell me about a time you faced a conflict with a teammate.',
            'How do you handle tight deadlines and pressure?',
            'Describe a situation where you had to adapt to change quickly.',
          ];

      await api.post(`/sessions/${res.data.id}/questions`, { questions: sampleQuestions });
      const sessionRes = await api.get(`/sessions/${res.data.id}`);
      setCurrentSession(sessionRes.data);
      setQuestions(sessionRes.data.questions || []);
      setAnswers({});
      setScreen('interview');
    } catch (err) {
      setError('Failed to create interview session');
      setTimeout(() => setError(''), 2000);
    }
  };

  const submitInterview = async () => {
    if (!currentSession) return;
    try {
      const answerPayload = Object.entries(answers).map(([question_id, answer_text]) => ({
        question_id,
        answer_text,
      }));
      if (answerPayload.length === 0) {
        setError('Please answer at least one question');
        setTimeout(() => setError(''), 2000);
        return;
      }
      await api.post(`/sessions/${currentSession.id}/answers`, { answers: answerPayload });
      setScreen('dashboard');
      setCurrentSession(null);
      setQuestions([]);
      setAnswers({});
      fetchDashboardData();
    } catch (err) {
      setError('Failed to submit answers');
      setTimeout(() => setError(''), 2000);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setScreen('dashboard');
      fetchDashboardData();
      fetchJobRoles();
    }
  }, []);

  return (
    <div className="min-h-screen text-white flex flex-col justify-between font-sans relative" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #c026d3 70%, #2563eb 100%)', minHeight: '100vh', color: '#ffffff' }}>

      <header className="p-5 flex justify-between items-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', borderBottom: '2px solid rgba(255, 255, 255, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#06b6d4', padding: '10px', borderRadius: '14px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.6)' }}>
            <svg style={{ width: '28px', height: '28px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: '#ffffff', letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>InterviewCoach AI</h1>
            <p style={{ fontSize: '11px', color: '#93c5fd', margin: 0, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '800' }}>Autonomous Assessment Platform</p>
          </div>
        </div>
        <div style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff', backgroundColor: screen === 'dashboard' ? '#ef4444' : '#3b82f6', padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s ease' }}>
          {screen === 'dashboard' ? (
            <>⏱️ SESSION TIME: {formatTime(timeLeft)}</>
          ) : (
            <>👤 SESSION: WAITING</>
          )}
        </div>
      </header>

      <main style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>

        {screen === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '64px', maxWidth: '1100px', width: '100%' }} className="flex flex-col lg:flex-row items-center justify-center">
            <div style={{ display: 'flex', alignItems: 'center', gap: '28px', maxWidth: '550px', textAlign: 'left' }}>
              <div style={{ width: '140px', height: '140px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', border: '3px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', flexShrink: 0, boxShadow: '0 15px 35px rgba(0,0,0,0.3)' }}>
                <svg style={{ width: '80px', height: '80px', color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2zM9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: '40px', fontWeight: '900', color: '#ffffff', lineHeight: '1.15', margin: '0 0 12px 0', letterSpacing: '-1px', textShadow: '0 4px 15px rgba(0,0,0,0.25)' }}>AI-Powered Interview Practice for Everyone</h2>
                <p style={{ fontSize: '18px', color: '#f3e8ff', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>Log in to practice your interview performance and access custom telemetry maps.</p>
              </div>
            </div>
            <div style={{ maxWidth: '460px', width: '100%' }}>
              <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
                <h3 style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0' }}>Initialize Session</h3>
                <p style={{ fontSize: '14px', color: '#cbd5e1', margin: '0 0 28px 0' }}>Enter system credentials to activate standard validation metrics</p>
                {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', letterSpacing: '0.75px', fontWeight: '800' }}>User Identity (Email)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@test.com" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', letterSpacing: '0.75px', fontWeight: '800' }}>Security Cipher (Password)</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600' }} required />
                  </div>
                  <button type="submit" style={{ width: '100%', background: 'linear-gradient(to right, #2563eb, #06b6d4)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', marginTop: '10px', fontSize: '17px', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.5)' }}>Authenticate Access</button>
                </form>
                <p style={{ fontSize: '15px', textAlign: 'center', color: '#cbd5e1', marginTop: '28px', marginBottom: 0, fontWeight: '500' }}>
                  New evaluation candidate? <button onClick={() => { setScreen('register'); setError(''); }} style={{ color: '#38bdf8', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontWeight: '700' }}>Create Account</button>
                </p>
              </div>
              <div style={{ marginTop: '20px', backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', border: '2px solid #eab308', borderRadius: '20px', padding: '20px', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <span style={{ backgroundColor: '#eab308', color: '#0f172a', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '900', fontFamily: 'monospace' }}>DEMO ACCESS</span>
                  <div style={{ fontSize: '14px', fontFamily: 'monospace', color: '#ffffff', lineHeight: '1.4' }}>
                    <span style={{ marginRight: '16px' }}>Email: <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>user@test.com</span></span>
                    <span>Pass: <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>password123</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === 'register' && (
          <div style={{ maxWidth: '460px', width: '100%' }}>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', textAlign: 'center', margin: '0 0 6px 0' }}>Provision Profile</h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', textAlign: 'center', margin: '0 0 28px 0' }}>Register metrics to the evaluation network</p>
              {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}
              {success && <div style={{ backgroundColor: '#10b981', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{success}</div>}
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Candidate Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Jane Doe" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Target Evaluation Track</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>
                    <option value="Software Engineer">Software Engineer (Core Technical)</option>
                    <option value="Product Manager">Product Manager (Strategic Strategy)</option>
                    <option value="Data Scientist">Data Scientist (Machine Learning Matrices)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>System Email Account</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Access Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600' }} required />
                </div>
                <button type="submit" style={{ width: '100%', background: 'linear-gradient(to right, #10b981, #14b8a6)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', marginTop: '10px', fontSize: '16px', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)' }}>Create Account</button>
              </form>
              <p style={{ fontSize: '15px', textAlign: 'center', color: '#cbd5e1', marginTop: '28px', marginBottom: 0, fontWeight: '500' }}>
                Already registered? <button onClick={() => { setScreen('login'); setError(''); }} style={{ color: '#6ee7b7', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontWeight: '700' }}>Return to Verification</button>
              </p>
            </div>
          </div>
        )}

        {screen === 'dashboard' && (
          <div style={{ width: '100%', maxWidth: '1000px', backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.2)', padding: '40px', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(255,255,255,0.15)', paddingBottom: '28px', marginBottom: '40px' }}>
              <div>
                <p style={{ fontSize: '13px', fontFamily: 'monospace', color: '#cbd5e1', fontWeight: '900', textTransform: 'uppercase', margin: '0 0 6px 0', letterSpacing: '1.5px' }}>Interactive Coaching Matrix Active</p>
                <h2 style={{ fontSize: '42px', fontWeight: '900', color: '#ffffff', margin: 0, letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>Welcome, {fullName}!</h2>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '15px', color: '#ffffff', fontWeight: '600' }}>Target Track:</span>
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: '900', backgroundColor: '#2563eb', color: '#ffffff', padding: '4px 14px', borderRadius: '9999px', border: '1px solid #ffffff', boxShadow: '0 4px 10px rgba(37,99,235,0.4)' }}>{role}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setScreen('profile'); setError(''); setSuccess(''); }} style={{ backgroundColor: '#8b5cf6', color: '#ffffff', fontWeight: '800', padding: '14px 28px', borderRadius: '14px', fontSize: '14px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', boxShadow: '0 4px 14px rgba(139,92,246,0.4)' }}>Profile</button>
                <button onClick={() => { setScreen('history'); setError(''); }} style={{ backgroundColor: '#3b82f6', color: '#ffffff', fontWeight: '800', padding: '14px 28px', borderRadius: '14px', fontSize: '14px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}>History</button>
                <button onClick={handleLogout} style={{ backgroundColor: '#ef4444', color: '#ffffff', fontWeight: '800', padding: '14px 28px', borderRadius: '14px', fontSize: '14px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', boxShadow: '0 4px 14px rgba(239,68,68,0.4)' }}>Logout</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 8px 0', fontWeight: '700' }}>Total Sessions</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: '#3b82f6', margin: 0 }}>{stats.total_sessions}</p>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 8px 0', fontWeight: '700' }}>Completed</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: '#10b981', margin: 0 }}>{stats.completed_sessions}</p>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 8px 0', fontWeight: '700' }}>Avg Score</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: '#eab308', margin: 0 }}>{stats.average_score ? Number(stats.average_score).toFixed(1) : '—'}</p>
              </div>
            </div>

            {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
              <div onClick={() => startInterview('behavioral')} style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'transform 0.2s' }}>
                <div>
                  <h4 style={{ fontWeight: '900', color: '#ffffff', fontSize: '20px', margin: '0 0 10px 0' }}>Behavioral Matrix</h4>
                  <p style={{ fontSize: '15px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>Dynamic evaluation mapping answers onto precise core evaluation criteria metrics.</p>
                </div>
                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', fontWeight: '900', color: '#ffffff', backgroundColor: '#4f46e5', padding: '12px', borderRadius: '10px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)' }}>START SESSION →</div>
              </div>

              <div onClick={() => startInterview('technical')} style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'transform 0.2s' }}>
                <div>
                  <h4 style={{ fontWeight: '900', color: '#ffffff', fontSize: '20px', margin: '0 0 10px 0' }}>Technical Workspace</h4>
                  <p style={{ fontSize: '15px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>Interactive architectural coding environments and execution tracking scripts.</p>
                </div>
                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', fontWeight: '900', color: '#ffffff', backgroundColor: '#06b6d4', padding: '12px', borderRadius: '10px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)' }}>START SESSION →</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                <div>
                  <h4 style={{ fontWeight: '900', color: '#ffffff', fontSize: '20px', margin: '0 0 10px 0' }}>Vocal AI Simulation</h4>
                  <p style={{ fontSize: '15px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>Speech-to-text validation engines analyzing cadence and presentation timelines.</p>
                </div>
                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', fontWeight: '900', color: '#ffffff', backgroundColor: '#10b981', padding: '10px', borderRadius: '10px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)' }}>PIPELINE LOCKED</div>
              </div>
            </div>
          </div>
        )}

        {screen === 'profile' && (
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0' }}>Edit Profile</h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', margin: '0 0 28px 0' }}>Update your interview profile information</p>
              {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}
              {success && <div style={{ backgroundColor: '#10b981', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{success}</div>}
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Headline</label>
                  <input type="text" value={profileForm.headline} onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })} placeholder="e.g., Senior Software Engineer" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Bio</label>
                  <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Tell us about yourself..." rows={4} style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Target Role</label>
                  <input type="text" value={profileForm.target_role} onChange={(e) => setProfileForm({ ...profileForm, target_role: e.target.value })} placeholder="e.g., Backend Developer" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Experience Level</label>
                  <select value={profileForm.experience_level} onChange={(e) => setProfileForm({ ...profileForm, experience_level: e.target.value })} style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>
                    <option value="">Select level</option>
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="lead">Lead / Principal</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Skills</label>
                  <input type="text" value={profileForm.skills} onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })} placeholder="e.g., Python, React, System Design" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="submit" style={{ flex: 1, background: 'linear-gradient(to right, #10b981, #14b8a6)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)' }}>Save Profile</button>
                  <button type="button" onClick={() => setScreen('dashboard')} style={{ flex: 1, backgroundColor: '#64748b', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px' }}>Cancel</button>
                </div>
              </form>
              
            <div style={{ marginTop: '30px', borderTop: '2px solid rgba(255,255,255,0.15)', paddingTop: '20px' }}>
                <ResumeUpload profile={profile} onProfileUpdate={fetchDashboardData} />
              </div>
            </div>
          </div>
        )}

        {screen === 'history' && (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: '0 0 28px 0' }}>Interview History</h2>
              {history.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '16px' }}>No interview sessions yet. Start one from the dashboard!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {history.map((session) => (
                    <div key={session.id} style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: '0 0 4px 0' }}>{session.role_title || 'Unknown Role'}</p>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: 'monospace' }}>
                          {session.interview_type.toUpperCase()} · {new Date(session.started_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: '900', padding: '4px 12px', borderRadius: '8px', backgroundColor: session.status === 'completed' ? '#10b981' : '#eab308', color: '#000' }}>{session.status}</span>
                        {session.overall_score != null && (
                          <span style={{ fontSize: '18px', fontWeight: '900', color: '#eab308' }}>{Number(session.overall_score).toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setScreen('dashboard')} style={{ width: '100%', marginTop: '24px', backgroundColor: '#64748b', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px' }}>Back to Dashboard</button>
            </div>
          </div>
        )}

        {screen === 'interview-setup' && (
          <div style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0' }}>New {selectedType === 'technical' ? 'Technical' : 'Behavioral'} Interview</h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', margin: '0 0 28px 0' }}>Select a job role for this session</p>
              {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px', maxHeight: '300px', overflowY: 'auto' }}>
                {jobRoles.map((r) => (
                  <button key={r.id} onClick={() => setSelectedRole(r.id)} style={{ textAlign: 'left', padding: '16px', borderRadius: '14px', border: selectedRole === r.id ? '2px solid #06b6d4' : '2px solid rgba(255,255,255,0.1)', backgroundColor: selectedRole === r.id ? 'rgba(6, 182, 212, 0.2)' : '#0f172a', color: '#ffffff', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}>
                    {r.title} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>· {r.category}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={createSession} disabled={!selectedRole} style={{ flex: 1, background: selectedRole ? 'linear-gradient(to right, #2563eb, #06b6d4)' : '#475569', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: selectedRole ? 'pointer' : 'not-allowed', fontSize: '16px', boxShadow: selectedRole ? '0 6px 20px rgba(37, 99, 235, 0.5)' : 'none' }}>Start Interview</button>
                <button onClick={() => { setScreen('dashboard'); setSelectedRole(null); }} style={{ flex: 1, backgroundColor: '#64748b', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {screen === 'interview' && (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0' }}>{selectedType === 'technical' ? 'Technical' : 'Behavioral'} Interview</h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', margin: '0 0 28px 0' }}>Answer each question below, then submit when ready.</p>
              {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {questions.map((q, idx) => (
                  <div key={q.id} style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ fontSize: '16px', fontWeight: '800', color: '#38bdf8', margin: '0 0 8px 0', fontFamily: 'monospace' }}>QUESTION {idx + 1}</p>
                    <p style={{ fontSize: '17px', fontWeight: '600', color: '#ffffff', margin: '0 0 16px 0', lineHeight: '1.5' }}>{q.question_text}</p>
                    <textarea value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Type your answer here..." rows={4} style={{ width: '100%', backgroundColor: '#1e293b', border: '2px solid #475569', borderRadius: '12px', padding: '14px', color: '#ffffff', fontSize: '15px', fontWeight: '500', resize: 'vertical' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
                <button onClick={submitInterview} style={{ flex: 1, background: 'linear-gradient(to right, #10b981, #14b8a6)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)' }}>Submit Answers</button>
                <button onClick={() => { setScreen('dashboard'); setCurrentSession(null); setQuestions([]); setAnswers({}); }} style={{ flex: 1, backgroundColor: '#64748b', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '16px' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={{ textAlign: 'center', padding: '24px 16px', borderTop: '2px solid rgba(255,255,255,0.15)', color: '#ffffff', fontSize: '15px', fontFamily: 'monospace', backgroundColor: '#0f172a', letterSpacing: '0.5px', fontWeight: '700' }}>
        &copy; {new Date().getFullYear()} InterviewCoach AI
      </footer>
    </div>
  );
}
