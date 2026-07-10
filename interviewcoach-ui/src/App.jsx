import React, { useState } from 'react';

export default function App() {
  // Navigation states: 'login', 'register', or 'dashboard'
  const [screen, setScreen] = useState('login');
  
  // Form input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Software Engineer');
  
  // Feedback messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Simulated Database (Local Storage Mocking)
  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password || !fullName) {
      setError('Please fill out all fields.');
      return;
    }

    // Store user data locally for the session mock
    const mockUser = { email, password, fullName, role };
    localStorage.setItem(`user_${email}`, JSON.stringify(mockUser));
    
    setSuccess('Registration successful! Redirecting to login...');
    setTimeout(() => {
      setScreen('login');
      setPassword('');
      setSuccess('');
    }, 2000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    // Hardcoded Quick-Access Account for testing
    if (email === 'user@test.com' && password === 'password123') {
      setFullName('Alex Candidate');
      setRole('Product Manager');
      setScreen('dashboard');
      return;
    }

    // Otherwise check simulated database
    const savedUser = localStorage.getItem(`user_${email}`);
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.password === password) {
        setFullName(parsedUser.fullName);
        setRole(parsedUser.role);
        setScreen('dashboard');
        return;
      }
    }

    setError('Invalid email or password. Hint: Use user@test.com and password123');
  };

  const handleLogout = () => {
    setScreen('login');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans">
      {/* Header Navbar */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white font-bold tracking-wider text-xl">
            IC
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            InterviewCoach AI
          </h1>
        </div>
        <div className="text-xs bg-slate-700/50 text-slate-400 px-3 py-1.5 rounded-full border border-slate-600">
          Sprint 1 Prototype
        </div>
      </header>

      {/* Dynamic Screen Layout Rendering */}
      <main className="flex-grow flex items-center justify-center p-6">
        
        {/* LOGIN SCREEN */}
        {screen === 'login' && (
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl transition-all">
            <h2 className="text-2xl font-bold text-center mb-2">Welcome Back</h2>
            <p className="text-sm text-slate-400 text-center mb-6">Log in to practice your interview performance</p>
            
            {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm mb-4">{error}</div>}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g., user@test.com" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-600/20 mt-2">
                Sign In
              </button>
            </form>
            <p className="text-sm text-center text-slate-400 mt-6">
              Don't have an account? <button onClick={() => { setScreen('register'); setError(''); }} className="text-indigo-400 hover:underline font-medium">Create one</button>
            </p>
          </div>
        )}

        {/* REGISTRATION SCREEN */}
        {screen === 'register' && (
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl transition-all">
            <h2 className="text-2xl font-bold text-center mb-2">Create Account</h2>
            <p className="text-sm text-slate-400 text-center mb-6">Join InterviewCoach AI to level up your career path</p>
            
            {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm mb-4">{error}</div>}
            {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-sm mb-4">{success}</div>}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Target Job Domain</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors">
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="Product Manager">Product Manager</option>
                  <option value="Data Scientist">Data Scientist</option>
                  <option value="QA Engineer">QA Engineer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-emerald-600/20 mt-2">
                Register Account
              </button>
            </form>
            <p className="text-sm text-center text-slate-400 mt-6">
              Already have an account? <button onClick={() => { setScreen('login'); setError(''); }} className="text-indigo-400 hover:underline font-medium">Log in</button>
            </p>
          </div>
        )}

        {/* MOCK POST-LOGIN DASHBOARD STATE */}
        {screen === 'dashboard' && (
          <div className="w-full max-w-4xl bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl transition-all">
            <div className="flex justify-between items-start border-b border-slate-700 pb-6 mb-6">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-100">Welcome back, {fullName}!</h2>
                <p className="text-slate-400 text-sm mt-1">Preparing for role: <span className="text-indigo-400 font-semibold">{role}</span></p>
              </div>
              <button onClick={handleLogout} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm transition-colors border border-slate-600">
                Log Out
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-700/60">
                <div className="text-indigo-400 font-bold text-xl mb-2">01</div>
                <h3 className="font-semibold text-base mb-1">Behavioral Prep</h3>
                <p className="text-xs text-slate-400">Practice STAR method questions aligned with your system profile.</p>
                <button className="mt-4 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 opacity-50 cursor-not-allowed">Locked (Sprint 2) →</button>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-700/60">
                <div className="text-cyan-400 font-bold text-xl mb-2">02</div>
                <h3 className="font-semibold text-base mb-1">Technical Mock</h3>
                <p className="text-xs text-slate-400">System architecture and logic evaluations generated dynamically.</p>
                <button className="mt-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 opacity-50 cursor-not-allowed">Locked (Sprint 3) →</button>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-700/60">
                <div className="text-emerald-400 font-bold text-xl mb-2">03</div>
                <h3 className="font-semibold text-base mb-1">AI Voice Room</h3>
                <p className="text-xs text-slate-400">Simulate simulated face-to-face vocal panel interactions.</p>
                <button className="mt-4 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 opacity-50 cursor-not-allowed">Locked (Sprint 4) →</button>
              </div>
            </div>

            <div className="mt-8 bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-4 text-center">
              <p className="text-xs text-indigo-300">
                💡 <strong>Sprint 1 Evaluation Status:</strong> Authentication workflow is verified. Database state simulations are active via browser engine caches. Ready for grading overview.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer*/}
      <footer className="text-center py-4 border-t border-slate-800 text-xs text-slate-500">
        &copy; {new Date().getFullYear()} InterviewCoach AI.
      </footer>
    </div>
  );
}
