import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Create API instance
const api = axios.create({ baseURL: 'http://localhost:8080/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload(); 
    }
    return Promise.reject(error);
  }
);

export default function App() {
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Software Engineer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Timer State: 45 minutes inside portal (45 * 60 = 2700 seconds)
  const [timeLeft, setTimeLeft] = useState(2700);

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn-fallback')) {
      const link = document.createElement('link');
      link.id = 'tailwind-cdn-fallback';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
      document.head.appendChild(link);
    }
  }, []);

 // Countdown timer effect that activates only when inside the dashboard portal
  useEffect(() => {
    if (screen !== 'dashboard') {
      setTimeLeft(2700); // Reset timer if logged out
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

   // Helper function to format seconds into MM:SS format
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
    
      const res = await api.post('/auth/register', { 
        email, 
        password, 
        name: fullName, 
        role 
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
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setScreen('login');
  };

  // Check for existing token on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setScreen('dashboard');
  }, []);

  return (
    <div className="min-h-screen text-white flex flex-col justify-between font-sans relative" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #c026d3 70%, #2563eb 100%)', minHeight: '100vh', color: '#ffffff' }}>
      
      {/* Global Application Header */}
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
        
        {/* CONTEXTUAL BADGE (Timer active in dashboard) */}
        <div style={{ 
          fontSize: '14px', 
          fontWeight: '900', 
          color: '#ffffff', 
          backgroundColor: screen === 'dashboard' ? '#ef4444' : '#3b82f6', 
          padding: '10px 20px', 
          borderRadius: '10px', 
          border: '1px solid rgba(255,255,255,0.3)', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s ease'
        }}>
          {screen === 'dashboard' ? (
            <>⏱️ SESSION TIME: {formatTime(timeLeft)}</>
          ) : (
            <>👤 SESSION: WAITING</>
          )}
        </div>
      </header>

      {/* Main Dynamic View */}
      <main style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        
        {/* VIEW 1: AUTHENTICATION & SIGNIN */}
        {screen === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '64px', maxWidth: '1100px', width: '100%' }} className="flex flex-col lg:flex-row items-center justify-center">
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '28px', maxWidth: '550px', textAlign: 'left' }}>
              <div style={{ width: '140px', height: '140px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', border: '3px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', flexShrink: 0, boxShadow: '0 15px 35px rgba(0,0,0,0.3)' }}>
                <svg style={{ width: '80px', height: '80px', color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2zM9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: '40px', fontWeight: '900', color: '#ffffff', lineHeight: '1.15', margin: '0 0 12px 0', letterSpacing: '-1px', textShadow: '0 4px 15px rgba(0,0,0,0.25)' }}>
                  AI-Powered Interview Practice for Everyone
                </h2>
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
                  
                  <button type="submit" style={{ width: '100%', background: 'linear-gradient(to right, #2563eb, #06b6d4)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', marginTop: '10px', fontSize: '17px', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.5)' }}>
                    Authenticate Access
                  </button>
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

        {/* VIEW 2: REGISTRATION ARCHITECTURE */}
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
                <button type="submit" style={{ width: '100%', background: 'linear-gradient(to right, #10b981, #14b8a6)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', marginTop: '10px', fontSize: '16px', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)' }}>
                  Create Account
                </button>
              </form>
              <p style={{ fontSize: '15px', textAlign: 'center', color: '#cbd5e1', marginTop: '28px', marginBottom: 0, fontWeight: '500' }}>
                Already registered? <button onClick={() => { setScreen('login'); setError(''); }} style={{ color: '#6ee7b7', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontWeight: '700' }}>Return to Verification</button>
              </p>
            </div>
          </div>
        )}

        {/* VIEW 3: POST-LOGIN SECURE INTERACTIVE DASHBOARD */}
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
              <button onClick={() => setScreen('login')} style={{ backgroundColor: '#ef4444', color: '#ffffff', fontWeight: '800', padding: '14px 28px', borderRadius: '14px', fontSize: '14px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', boxShadow: '0 4px 14px rgba(239,68,68,0.4)' }}>
                Logout [→
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
              
              <div style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifycontent: 'space-between', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                <div>
                  <h4 style={{ fontWeight: '900', color: '#ffffff', fontSize: '20px', margin: '0 0 10px 0' }}>Behavioral Matrix</h4>
                  <p style={{ fontSize: '15px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>Dynamic evaluation mapping answers onto precise core evaluation criteria metrics.</p>
                </div>
                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', fontWeight: '900', color: '#ffffff', backgroundColor: '#4f46e5', padding: '10px', borderRadius: '10px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)' }}>PIPELINE LOCKED</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifycontent: 'space-between', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                <div>
                  <h4 style={{ fontWeight: '900', color: '#ffffff', fontSize: '20px', margin: '0 0 10px 0' }}>Technical Workspace</h4>
                  <p style={{ fontSize: '15px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>Interactive architectural coding environments and execution tracking scripts.</p>
                </div>
                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', fontWeight: '900', color: '#ffffff', backgroundColor: '#06b6d4', padding: '10px', borderRadius: '10px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)' }}>PIPELINE LOCKED</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', justifycontent: 'space-between', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                <div>
                  <h4 style={{ fontWeight: '900', color: '#ffffff', fontSize: '20px', margin: '0 0 10px 0' }}>Vocal AI Simulation</h4>
                  <p style={{ fontSize: '15px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>Speech-to-text validation engines analyzing cadence and presentation timelines.</p>
                </div>
                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', fontWeight: '900', color: '#ffffff', backgroundColor: '#10b981', padding: '10px', borderRadius: '10px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)' }}>PIPELINE LOCKED</div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Global Application Footer */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '24px 16px', 
        borderTop: '2px solid rgba(255,255,255,0.15)', 
        color: '#ffffff', 
        fontSize: '15px', 
        fontFamily: 'monospace', 
        backgroundColor: '#0f172a',
        letterSpacing: '0.5px',
        fontWeight: '700'
      }}>
        &copy; {new Date().getFullYear()} InterviewCoach AI
      </footer>
    </div>
  );
}
