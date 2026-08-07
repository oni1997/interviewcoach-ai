import React, { useState, useEffect, useRef } from 'react';
import api from './api';
import ResumeUpload from './ResumeUpload';
import DarkModeToggle from './DarkModeToggle';
import VoiceRecorder from './VoiceRecorder';

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
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState([]);
  const [results, setResults] = useState(null);
  const [viewSession, setViewSession] = useState(null);
  const [viewSessionDetail, setViewSessionDetail] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [voiceOn, setVoiceOn] = useState(true);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [askingFollowUp, setAskingFollowUp] = useState(false);

  const [voicePhase, setVoicePhase] = useState('question');
  const [countdown, setCountdown] = useState(60);
  const [voiceMainIdx, setVoiceMainIdx] = useState(0);
  const [voiceIsFollowUp, setVoiceIsFollowUp] = useState(false);
  const [baseQuestionCount, setBaseQuestionCount] = useState(0);
  const [stopSignal, setStopSignal] = useState(0);

  const questionsRef = useRef([]);
  const evaluationsRef = useRef([]);
  const convHistoryRef = useRef([]);
  const currentQIdxRef = useRef(0);
  const voiceMainIdxRef = useRef(0);
  const voiceIsFollowUpRef = useRef(false);
  const baseCountRef = useRef(0);
  const voiceBusyRef = useRef(false);
  const currentSessionRef = useRef(null);
  const roleRef = useRef('Software Engineer');
  const typeRef = useRef('');
  const retriedForRef = useRef(null);

  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { evaluationsRef.current = evaluations; }, [evaluations]);
  useEffect(() => { convHistoryRef.current = conversationHistory; }, [conversationHistory]);
  useEffect(() => { currentSessionRef.current = currentSession; }, [currentSession]);
  useEffect(() => { roleRef.current = role; }, [role]);
  useEffect(() => { typeRef.current = selectedType; }, [selectedType]);

  const [profileForm, setProfileForm] = useState({ headline: '', bio: '', target_role: '', experience_level: '', skills: '' });
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
  };

  const openSessionDetail = async (session) => {
    setViewSession(session);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/sessions/${session.id}/feedback`);
      setViewSessionDetail(res.data || []);
      setScreen('history-detail');
    } catch (err) {
      setError('Failed to load session details');
      setTimeout(() => setError(''), 2000);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
      setSuccess('Password reset link sent to your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process password reset.');
    }
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
      setCurrentQIndex(0);
      setCurrentAnswer('');
      setCurrentAttempt(1);
      setAiFeedback(null);
      setEvaluations([]);
      setResults(null);
      setScreen('interview');
    } catch (err) {
      setError('Failed to create interview session');
      setTimeout(() => setError(''), 2000);
    }
  };

  const handleTranscript = (questionId, text) => {
    if (questionId === questions[currentQIndex]?.id) {
      setCurrentAnswer(text);
    }
  };

  const speak = (text, onDone) => {
    if (!text || !voiceOn || !window.speechSynthesis) {
      if (onDone) onDone();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      utterance.voice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
    }
    if (onDone) {
      utterance.onend = () => onDone();
      utterance.onerror = () => onDone();
    }
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  useEffect(() => {
    if (screen === 'interview' && questions[currentQIndex] && aiFeedback === null) {
      const t = setTimeout(() => speak(questions[currentQIndex].question_text), 600);
      return () => { clearTimeout(t); };
    }
  }, [screen, currentQIndex, questions, aiFeedback, voiceOn]);

  const askFollowUp = async () => {
    if (!currentSession || askingFollowUp) return;
    const q = questions[currentQIndex];
    const answer = aiFeedback?.answer || currentAnswer;
    if (!answer.trim()) {
      setError('Please answer the question before continuing the conversation.');
      setTimeout(() => setError(''), 2500);
      return;
    }
    setAskingFollowUp(true);
    setError('');
    try {
      const res = await api.post('/ai/follow-up', {
        question: q.question_text,
        answer,
        job_role: role,
        interview_type: selectedType,
        session_id: currentSession.id,
        history: conversationHistory,
      });
      const followUp = res.data.question;
      if (!followUp) throw new Error('Empty follow-up');

      const historyTurn = { question: q.question_text, answer };
      setConversationHistory([...conversationHistory, historyTurn]);

      const newQuestion = { id: res.data.question_id || `followup-${Date.now()}`, question_text: followUp, question_order: questions.length + 1 };
      setQuestions([...questions, newQuestion]);
      setCurrentQIndex(questions.length);
      setCurrentAnswer('');
      setCurrentAttempt(1);
      setAiFeedback(null);
      setError('');
    } catch (err) {
      setError('Failed to generate follow-up question. Try again.');
      setTimeout(() => setError(''), 2500);
    } finally {
      setAskingFollowUp(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentSession || evaluating) return;
    const q = questions[currentQIndex];
    if (!currentAnswer.trim()) {
      setError('Please type an answer before submitting');
      setTimeout(() => setError(''), 2000);
      return;
    }
    setEvaluating(true);
    setError('');
    try {
      const res = await api.post('/ai/evaluate', {
        question: q.question_text,
        answer: currentAnswer,
        role: role,
      });
      setAiFeedback({
        score: Number(res.data.score) || 0,
        feedback: res.data.feedback || 'No feedback provided.',
        strengths: res.data.strengths || [],
        weaknesses: res.data.weaknesses || [],
        answer: currentAnswer,
        attempt: currentAttempt,
      });
    } catch (err) {
      setError('AI evaluation failed. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setEvaluating(false);
    }
  };

  const tryAgain = () => {
    setCurrentAttempt(2);
    setAiFeedback(null);
    setCurrentAnswer('');
    setAnswers((prev) => ({ ...prev, [questions[currentQIndex].id]: '' }));
  };

  const nextQuestion = async () => {
    const q = questions[currentQIndex];
    const finalFeedback = aiFeedback || {
      score: 0,
      feedback: 'Not evaluated',
      strengths: [],
      weaknesses: [],
      answer: currentAnswer || '',
      attempt: currentAttempt,
    };

    const updated = [
      ...evaluations,
      {
        question_id: q.id,
        question: q.question_text,
        score: finalFeedback.score,
        feedback: finalFeedback.feedback,
        strengths: Array.isArray(finalFeedback.strengths) ? finalFeedback.strengths.join('; ') : String(finalFeedback.strengths || ''),
        improvements: Array.isArray(finalFeedback.weaknesses) ? finalFeedback.weaknesses.join('; ') : String(finalFeedback.weaknesses || ''),
        answer: finalFeedback.answer,
      },
    ];
    setEvaluations(updated);

    if (currentQIndex + 1 >= questions.length) {
      await finishInterview(updated);
    } else {
      setCurrentQIndex((i) => i + 1);
      setCurrentAnswer('');
      setCurrentAttempt(1);
      setAiFeedback(null);
    }
  };

  const finishInterview = async (finalEvals) => {
    if (!currentSession) return;
    const evals = finalEvals || evaluations;
    try {
      const answerPayload = evals.map((e) => ({
        question_id: e.question_id,
        answer_text: e.answer || '',
      }));
      await api.post(`/sessions/${currentSession.id}/answers`, { answers: answerPayload });
      await api.post(`/sessions/${currentSession.id}/evaluation`, {
        items: evals.map((e) => ({
          question_id: e.question_id,
          score: e.score,
          feedback: e.feedback,
          strengths: e.strengths,
          improvements: e.improvements,
        })),
      });
    } catch (err) {
      console.error('Failed to save session results:', err);
    }
    const total = evals.reduce((sum, e) => sum + (Number(e.score) || 0), 0);
    const avg = evals.length ? Math.round(total / evals.length) : 0;
    setResults({ items: evals, overall: avg });
    setCurrentSession(null);
    setQuestions([]);
    setAnswers({});
    setAiFeedback(null);
    setConversationHistory([]);
    stopSpeaking();
    setScreen('results');
    fetchDashboardData();
  };

  const addVoiceEval = (item) => {
    const next = [...evaluationsRef.current, item];
    evaluationsRef.current = next;
    setEvaluations(next);
  };

  const pushVoiceQuestion = (q) => {
    const next = [...questionsRef.current, q];
    questionsRef.current = next;
    setQuestions(next);
  };

  const fetchVoiceQuestions = async (type, count) => {
    try {
      const r = await api.post('/ai/generate-questions', {
        job_role: roleRef.current,
        interview_type: type,
        count,
      });
      const qs = r.data && r.data.questions;
      if (Array.isArray(qs) && qs.length) return qs.slice(0, count);
    } catch (err) { /* fall through to empty */ }
    return [];
  };

  const buildVoiceQuestions = async () => {
    const [beh, tech] = await Promise.all([
      fetchVoiceQuestions('behavioral', 3),
      fetchVoiceQuestions('technical', 3),
    ]);
    const mixed = [];
    const n = Math.max(beh.length, tech.length);
    for (let i = 0; i < n; i++) {
      if (beh[i]) mixed.push(beh[i]);
      if (tech[i]) mixed.push(tech[i]);
    }
    if (mixed.length >= 4) return mixed;
    return [
      'Tell me about a time you faced a conflict with a teammate.',
      'How do you handle tight deadlines and pressure?',
      'Describe a situation where you had to adapt to change quickly.',
      'Walk me through a complex project you worked on and your role in it.',
      'How do you approach debugging a difficult issue?',
      'Describe your experience with system design and architecture.',
    ];
  };

  const startVoiceInterview = async () => {
    setSelectedType('behavioral');
    setError('');
    setStopSignal(0);
    setVoicePhase('question');
    setCountdown(60);
    setVoiceMainIdx(0);
    voiceMainIdxRef.current = 0;
    setVoiceIsFollowUp(false);
    voiceIsFollowUpRef.current = false;
    setEvaluations([]);
    evaluationsRef.current = [];
    convHistoryRef.current = [];
    setConversationHistory([]);
    setResults(null);
    setCurrentSession(null);
    setAiFeedback(null);
    setCurrentAnswer('');
    retriedForRef.current = null;
    try {
      try {
        const warm = await navigator.mediaDevices.getUserMedia({ audio: true });
        warm.getTracks().forEach((t) => t.stop());
      } catch (e) { /* mic permission will be handled by the recorder */ }
      const res = await api.post('/sessions', { interview_type: 'behavioral' });
      setCurrentSession(res.data);
      currentSessionRef.current = res.data;
      const voiceQuestions = await buildVoiceQuestions();
      await api.post(`/sessions/${res.data.id}/questions`, { questions: voiceQuestions });
      const sessionRes = await api.get(`/sessions/${res.data.id}`);
      const qs = sessionRes.data.questions || [];
      questionsRef.current = qs;
      setQuestions(qs);
      baseCountRef.current = qs.length;
      setBaseQuestionCount(qs.length);
      currentQIdxRef.current = 0;
      setCurrentQIndex(0);
      setCurrentAttempt(1);
      convHistoryRef.current = [];
      setConversationHistory([]);
      setScreen('voice-interview');
      voiceAskMain(0);
    } catch (err) {
      setError('Failed to start voice session');
      setTimeout(() => setError(''), 2500);
    }
  };

  const voiceAskMain = (idx) => {
    voiceMainIdxRef.current = idx;
    voiceIsFollowUpRef.current = false;
    setVoiceIsFollowUp(false);
    currentQIdxRef.current = idx;
    setCurrentQIndex(idx);
    setCurrentAnswer('');
    setVoicePhase('question');
    setCountdown(60);
    const q = questionsRef.current[idx];
    if (!q) {
      voiceFinish();
      return;
    }
    speak(`Question ${idx + 1}. ${q.question_text}`, () => voiceBeginAnswer());
  };

  const voiceBeginAnswer = () => {
    setVoicePhase('answer');
    setCountdown(60);
  };

  const voiceStop = () => setStopSignal((s) => s + 1);

  const voiceOnAnswerDone = async (questionId, transcript) => {
    if (voiceBusyRef.current) return;
    voiceBusyRef.current = true;
    setCountdown(0);
    setEvaluating(true);
    setError('');
    const q = questionsRef.current[currentQIdxRef.current];
    const answer = (transcript || '').trim();
    setCurrentAnswer(answer);
    if (!answer && retriedForRef.current !== q.id) {
      retriedForRef.current = q.id;
      setVoicePhase('question');
      setEvaluating(false);
      speak("Sorry, I didn't catch that. Please speak again.", () => {
        voiceBusyRef.current = false;
        voiceBeginAnswer();
      });
      return;
    }
    try {
      let fb;
      if (!answer) {
        fb = {
          score: 0,
          feedback: 'No answer was recorded.',
          strengths: [],
          weaknesses: ['No response was given'],
          answer: '',
        };
      } else {
        const res = await api.post('/ai/evaluate', {
          question: q.question_text,
          answer,
          role: roleRef.current,
        });
        fb = {
          score: Number(res.data.score) || 0,
          feedback: res.data.feedback || 'No feedback provided.',
          strengths: Array.isArray(res.data.strengths) ? res.data.strengths : [],
          weaknesses: Array.isArray(res.data.weaknesses) ? res.data.weaknesses : [],
          answer,
        };
      }

      addVoiceEval({
        question_id: q.id,
        question: q.question_text,
        score: fb.score,
        feedback: fb.feedback,
        strengths: Array.isArray(fb.strengths) ? fb.strengths.join('; ') : String(fb.strengths || ''),
        improvements: Array.isArray(fb.weaknesses) ? fb.weaknesses.join('; ') : String(fb.weaknesses || ''),
        answer: fb.answer,
      });
      setVoicePhase('feedback');
      const fbText = `For that answer, I gave you a score of ${Math.round(fb.score)} out of 100. ${fb.feedback}`;

      if (voiceIsFollowUpRef.current) {
        speak(fbText, () => {
          voiceBusyRef.current = false;
          voiceAdvanceMain();
        });
      } else {
        let fupText = '';
        if (answer) {
          try {
            const fupRes = await api.post('/ai/follow-up', {
              question: q.question_text,
              answer,
              job_role: roleRef.current,
              interview_type: typeRef.current || 'behavioral',
              session_id: currentSessionRef.current.id,
              history: convHistoryRef.current,
            });
            fupText = fupRes.data.question;
            if (fupRes.data.question_id) {
              pushVoiceQuestion({
                id: fupRes.data.question_id,
                question_text: fupText,
                question_order: questionsRef.current.length + 1,
              });
              currentQIdxRef.current = questionsRef.current.length - 1;
              setCurrentQIndex(currentQIdxRef.current);
            }
          } catch (err) {
            fupText = '';
          }
        }
        convHistoryRef.current = [...convHistoryRef.current, { question: q.question_text, answer: fb.answer }];
        setConversationHistory(convHistoryRef.current);
        voiceIsFollowUpRef.current = true;
        setVoiceIsFollowUp(true);
        setCurrentAnswer('');
        if (fupText) {
          speak(`${fbText}. ${fupText}`, () => {
            voiceBusyRef.current = false;
            voiceBeginAnswer();
          });
        } else {
          speak(fbText, () => {
            voiceBusyRef.current = false;
            voiceAdvanceMain();
          });
        }
      }
    } catch (err) {
      console.error('Voice evaluation failed:', err);
      setError('AI evaluation failed. Moving on.');
      setTimeout(() => setError(''), 2500);
      voiceBusyRef.current = false;
      voiceAdvanceMain();
    } finally {
      setEvaluating(false);
    }
  };

  const voiceAdvanceMain = () => {
    const next = voiceMainIdxRef.current + 1;
    if (next < baseCountRef.current) {
      voiceAskMain(next);
    } else {
      voiceFinish();
    }
  };

  const voiceFinish = () => {
    setVoicePhase('summary');
    stopSpeaking();
    speak('Interview complete. Thank you. Calculating your results now.');
    finishInterview(evaluationsRef.current);
  };

  useEffect(() => {
    if (screen !== 'voice-interview' || voicePhase !== 'answer') return;
    setCountdown(60);
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [screen, voicePhase]);

  useEffect(() => {
    if (screen === 'voice-interview' && voicePhase === 'answer' && countdown <= 0) {
      voiceStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, screen, voicePhase]);

  const restartInterview = () => {
    setResults(null);
    setEvaluations([]);
    setCurrentQIndex(0);
    setCurrentAnswer('');
    setCurrentAttempt(1);
    setSelectedRole(null);
    setConversationHistory([]);
    stopSpeaking();
    setScreen('dashboard');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setScreen('dashboard');
      fetchDashboardData();
      fetchJobRoles();
    }
  }, []);

  const isAuthenticated = screen !== 'login' && screen !== 'register' && screen !== 'forgot-password';

  return (
    <div id="app-root-container" className="min-h-screen text-white flex flex-col justify-between font-sans relative" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #c026d3 70%, #2563eb 100%)', minHeight: '100vh', color: '#ffffff', overflowX: 'hidden' }}>
      
      {/* Desktop Header */}
      <header className="hidden md:flex p-5 justify-between items-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', borderBottom: '2px solid rgba(255, 255, 255, 0.25)', width: '100%', boxSizing: 'border-box' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {isAuthenticated && (
            <>
              <button onClick={() => { setScreen('dashboard'); fetchDashboardData(); setError(''); }} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>Home</button>
              <button onClick={() => { setScreen('profile'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>Profile</button>
              <button onClick={() => { setScreen('history'); setError(''); }} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>History</button>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#f43f5e', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>Logout</button>
            </>
          )}
          <DarkModeToggle />
        </div>
      </header>

      {/* Mobile Navigation Header */}
      <header className="md:hidden flex justify-between items-center" style={{ padding: '16px 20px', backgroundColor: '#0f172a', borderBottom: '2px solid rgba(255,255,255,0.1)', width: '100%', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0 }}>InterviewCoach AI</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <DarkModeToggle />
          {isAuthenticated && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ background: 'none', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: '#ffffff', padding: '8px 12px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          )}
        </div>
      </header>

      {/* Collapsible Mobile Menu Dropdown */}
      {mobileMenuOpen && isAuthenticated && (
        <nav className="md:hidden flex flex-col" style={{ backgroundColor: '#0f172a', padding: '16px 20px', gap: '12px', borderBottom: '2px solid rgba(255,255,255,0.1)', width: '100%', boxSizing: 'border-box' }}>
          <button
            onClick={() => { setScreen('dashboard'); fetchDashboardData(); setMobileMenuOpen(false); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#38bdf8', textAlign: 'left', fontSize: '16px', fontWeight: '700', cursor: 'pointer', padding: '6px 0' }}
          >
            Home
          </button>
          <button
            onClick={() => { setScreen('profile'); setMobileMenuOpen(false); setError(''); setSuccess(''); }}
            style={{ background: 'none', border: 'none', color: '#38bdf8', textAlign: 'left', fontSize: '16px', fontWeight: '700', cursor: 'pointer', padding: '6px 0' }}
          >
            Profile
          </button>
          <button
            onClick={() => { setScreen('history'); setMobileMenuOpen(false); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#38bdf8', textAlign: 'left', fontSize: '16px', fontWeight: '700', cursor: 'pointer', padding: '6px 0' }}
          >
            History
          </button>
          <button
            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
            style={{ background: 'none', border: 'none', color: '#f43f5e', textAlign: 'left', fontSize: '16px', fontWeight: '700', cursor: 'pointer', padding: '6px 0' }}
          >
            Logout
          </button>
        </nav>
      )}

      <main style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: '40px 16px', width: '100%', boxSizing: 'border-box' }}>
        {screen === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '64px', maxWidth: '1100px', width: '100%', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '28px', maxWidth: '550px', width: '100%', textAlign: 'left', flexWrap: 'wrap' }}>
              <div style={{ width: '140px', height: '140px', borderRadius: '28px', backgroundColor: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', border: '3px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', flexShrink: 0, boxShadow: '0 15px 35px rgba(0,0,0,0.3)' }}>
                <svg style={{ width: '80px', height: '80px', color: '#ffffff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2zM9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h6" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: '900', color: '#ffffff', lineHeight: '1.15', margin: '0 0 12px 0', letterSpacing: '-1px', textShadow: '0 4px 15px rgba(0,0,0,0.25)' }}>AI-Powered Interview Practice for Everyone</h2>
                <p style={{ fontSize: '18px', color: '#f3e8ff', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>Log in to practice your interview performance and access custom telemetry maps.</p>
              </div>
            </div>
            <div style={{ maxWidth: '460px', width: '100%', boxSizing: 'border-box' }}>
              <div className="app-card-box dark:bg-slate-900/95 dark:border-white/50 dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', width: '100%', boxSizing: 'border-box' }}>
                <h3 style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0' }}>Initialize Session</h3>
                <p style={{ fontSize: '14px', color: '#cbd5e1', margin: '0 0 28px 0' }}>Enter system credentials to activate standard validation metrics</p>
                {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', letterSpacing: '0.75px', fontWeight: '800' }}>User Identity (Email)</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@test.com" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', boxSizing: 'border-box' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', letterSpacing: '0.75px', fontWeight: '800' }}>Security Cipher (Password)</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', boxSizing: 'border-box' }} required />
                  </div>

                  <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '-5px' }}>
                    <button
                      type="button"
                      onClick={() => { setScreen('forgot-password'); setError(''); setSuccess(''); }}
                      style={{ color: '#38bdf8', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button type="submit" style={{ width: '100%', background: 'linear-gradient(to right, #2563eb, #06b6d4)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', marginTop: '10px', fontSize: '17px', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.5)', boxSizing: 'border-box' }}>Authenticate Access</button>
                </form>
                <p style={{ fontSize: '15px', textAlign: 'center', color: '#cbd5e1', marginTop: '28px', marginBottom: 0, fontWeight: '500' }}>
                  New evaluation candidate? <button onClick={() => { setScreen('register'); setError(''); }} style={{ color: '#38bdf8', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontWeight: '700' }}>Create Account</button>
                </p>
              </div>
            </div>
          </div>
        )}

        {screen === 'register' && (
          <div style={{ maxWidth: '460px', width: '100%', boxSizing: 'border-box' }}>
            <div className="app-card-box dark:bg-slate-900/95 dark:border-white/50 dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', width: '100%', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', textAlign: 'center', margin: '0 0 6px 0' }}>Provision Profile</h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', textAlign: 'center', margin: '0 0 28px 0' }}>Register metrics to the evaluation network</p>
              {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}
              {success && <div style={{ backgroundColor: '#10b981', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{success}</div>}
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Candidate Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Jane Doe" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Target Evaluation Track</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', boxSizing: 'border-box' }}>
                    <option value="Software Engineer">Software Engineer (Core Technical)</option>
                    <option value="Product Manager">Product Manager (Strategic Strategy)</option>
                    <option value="Data Scientist">Data Scientist (Machine Learning Matrices)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>System Email Account</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', boxSizing: 'border-box' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Access Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', boxSizing: 'border-box' }} required />
                </div>
                <button type="submit" style={{ width: '100%', background: 'linear-gradient(to right, #10b981, #14b8a6)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', marginTop: '10px', fontSize: '16px', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)', boxSizing: 'border-box' }}>Create Account</button>
              </form>
              <p style={{ fontSize: '15px', textAlign: 'center', color: '#cbd5e1', marginTop: '28px', marginBottom: 0, fontWeight: '500' }}>
                Already registered? <button onClick={() => { setScreen('login'); setError(''); }} style={{ color: '#6ee7b7', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontWeight: '700' }}>Return to Verification</button>
              </p>
            </div>
          </div>
        )}

        {screen === 'dashboard' && (
          <div className="app-card-box dark:bg-slate-900/95 dark:border-white/50 dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)]" style={{ width: '100%', maxWidth: '1000px', backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.4)', padding: 'clamp(20px, 4vw, 40px)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(255,255,255,0.25)', paddingBottom: '28px', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <p style={{ fontSize: '13px', fontFamily: 'monospace', color: '#cbd5e1', fontWeight: '900', textTransform: 'uppercase', margin: '0 0 6px 0', letterSpacing: '1.5px' }}>Interactive Coaching Matrix Active</p>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '900', color: '#ffffff', margin: 0, letterSpacing: '-0.5px', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>Welcome, {fullName}!</h2>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', color: '#ffffff', fontWeight: '600' }}>Target Track:</span>
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: '900', backgroundColor: '#2563eb', color: '#ffffff', padding: '4px 14px', borderRadius: '9999px', border: '1px solid #ffffff', boxShadow: '0 4px 10px rgba(37,99,235,0.4)' }}>{role}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.25)', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 8px 0', fontWeight: '700' }}>Total Sessions</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: '#3b82f6', margin: 0 }}>{stats.total_sessions}</p>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.25)', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 8px 0', fontWeight: '700' }}>Completed</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: '#10b981', margin: 0 }}>{stats.completed_sessions}</p>
              </div>
              <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.25)', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 8px 0', fontWeight: '700' }}>Avg Score</p>
                <p style={{ fontSize: '36px', fontWeight: '900', color: '#eab308', margin: 0 }}>{stats.average_score ? Number(stats.average_score).toFixed(1) : '—'}</p>
              </div>
            </div>

            {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
              <div onClick={() => startInterview('behavioral')} style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', cursor: 'pointer', transition: 'transform 0.2s' }}>
                <div>
                  <h4 style={{ fontWeight: '900', color: '#ffffff', fontSize: '20px', margin: '0 0 10px 0' }}>Behavioral Matrix</h4>
                  <p style={{ fontSize: '15px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>Dynamic evaluation mapping answers onto precise core evaluation criteria metrics.</p>
                </div>
                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', fontWeight: '900', color: '#ffffff', backgroundColor: '#4f46e5', padding: '12px', borderRadius: '10px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.4)' }}>START SESSION →</div>
              </div>

              <div onClick={() => startInterview('technical')} style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', cursor: 'pointer', transition: 'transform 0.2s' }}>
                <div>
                  <h4 style={{ fontWeight: '900', color: '#ffffff', fontSize: '20px', margin: '0 0 10px 0' }}>Technical Workspace</h4>
                  <p style={{ fontSize: '15px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>Interactive architectural coding environments and execution tracking scripts.</p>
                </div>
                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', fontWeight: '900', color: '#ffffff', backgroundColor: '#06b6d4', padding: '12px', borderRadius: '10px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.4)' }}>START SESSION →</div>
              </div>

              <div onClick={startVoiceInterview} style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '20px', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 20px rgba(0,0,0,0.3)', cursor: 'pointer', transition: 'transform 0.2s' }}>
                <div>
                  <h4 style={{ fontWeight: '900', color: '#ffffff', fontSize: '20px', margin: '0 0 10px 0' }}>Vocal AI Simulation</h4>
                  <p style={{ fontSize: '15px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>Speech-to-text validation engines analyzing cadence and presentation timelines. Answer questions using your voice.</p>
                </div>
                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', fontWeight: '900', color: '#ffffff', backgroundColor: '#10b981', padding: '12px', borderRadius: '10px', fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.4)' }}>START VOICE SESSION →</div>
              </div>
            </div>
          </div>
        )}

        {screen === 'profile' && (
          <div style={{ width: '100%', maxWidth: '700px', boxSizing: 'border-box' }}>
            <div className="app-card-box dark:bg-slate-900/95 dark:border-white/50 dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', width: '100%', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0' }}>Edit Profile</h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', margin: '0 0 28px 0' }}>Update your interview profile information</p>
              {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}
              {success && <div style={{ backgroundColor: '#10b981', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{success}</div>}
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Headline</label>
                  <input type="text" value={profileForm.headline} onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })} placeholder="e.g., Senior Software Engineer" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Bio</label>
                  <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Tell us about yourself..." rows={4} style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Target Role</label>
                  <input type="text" value={profileForm.target_role} onChange={(e) => setProfileForm({ ...profileForm, target_role: e.target.value })} placeholder="e.g., Backend Developer" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Experience Level</label>
                  <select value={profileForm.experience_level} onChange={(e) => setProfileForm({ ...profileForm, experience_level: e.target.value })} style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', boxSizing: 'border-box' }}>
                    <option value="">Select level</option>
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="lead">Lead / Principal</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>Skills</label>
                  <input type="text" value={profileForm.skills} onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })} placeholder="e.g., Python, React, System Design" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button type="submit" style={{ flex: 1, minWidth: '140px', background: 'linear-gradient(to right, #10b981, #14b8a6)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)', boxSizing: 'border-box' }}>Save Profile</button>
                  <button type="button" onClick={() => setScreen('dashboard')} style={{ flex: 1, minWidth: '140px', backgroundColor: '#64748b', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', boxSizing: 'border-box' }}>Cancel</button>
                </div>
              </form>

              <div style={{ marginTop: '30px', borderTop: '2px solid rgba(255,255,255,0.25)', paddingTop: '20px' }}>
                <ResumeUpload profile={profile} onProfileUpdate={fetchDashboardData} />
              </div>
            </div>
          </div>
        )}

        {screen === 'history' && (
          <div style={{ width: '100%', maxWidth: '900px', boxSizing: 'border-box' }}>
            <div className="app-card-box dark:bg-slate-900/95 dark:border-white/50 dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', width: '100%', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: '0 0 28px 0' }}>Interview History</h2>
              {history.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '16px' }}>No interview sessions yet. Start one from the dashboard!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {history.map((session) => (
                    <div key={session.id} onClick={() => openSessionDetail(session)} style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s', flexWrap: 'wrap', gap: '12px', boxSizing: 'border-box' }}>
                      <div>
                        <p style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: '0 0 4px 0' }}>{session.role_title || 'Unknown Role'}</p>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: 'monospace' }}>
                          {session.interview_type.toUpperCase()} · {new Date(session.started_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: '900', padding: '4px 12px', borderRadius: '8px', backgroundColor: session.status === 'completed' ? '#10b981' : '#eab308', color: '#000' }}>{session.status}</span>
                        {session.overall_score != null && (
                          <span style={{ fontSize: '18px', fontWeight: '900', color: '#eab308' }}>{Number(session.overall_score).toFixed(1)}</span>
                        )}
                        <span style={{ fontSize: '14px', color: '#38bdf8', fontWeight: '900' }}>View →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setScreen('dashboard')} style={{ width: '100%', marginTop: '24px', backgroundColor: '#64748b', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', boxSizing: 'border-box' }}>Back to Dashboard</button>
            </div>
          </div>
        )}

        {screen === 'history-detail' && viewSession && (
          <div style={{ width: '100%', maxWidth: '900px', boxSizing: 'border-box' }}>
            <div className="app-card-box dark:bg-slate-900/95 dark:border-white/50 dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: 0 }}>{viewSession.role_title || 'Interview Session'}</h2>
                {viewSession.overall_score != null && (
                  <span style={{ fontSize: '32px', fontWeight: '900', color: Number(viewSession.overall_score) >= 70 ? '#10b981' : Number(viewSession.overall_score) >= 40 ? '#eab308' : '#ef4444' }}>{Number(viewSession.overall_score).toFixed(1)}%</span>
                )}
              </div>
              <p style={{ fontSize: '15px', color: '#cbd5e1', margin: '0 0 28px 0' }}>
                {viewSession.interview_type?.toUpperCase()} · {new Date(viewSession.started_at).toLocaleDateString()}
                {viewSession.status && <span style={{ marginLeft: '12px', fontSize: '13px', fontFamily: 'monospace', fontWeight: '900', padding: '4px 12px', borderRadius: '8px', backgroundColor: viewSession.status === 'completed' ? '#10b981' : '#eab308', color: '#000' }}>{viewSession.status}</span>}
              </p>

              {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}

              {loadingDetail ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '16px' }}>Loading session details...</p>
              ) : viewSessionDetail.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', fontSize: '16px' }}>No answers were recorded for this session.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {viewSessionDetail.map((item, idx) => (
                    <div key={idx} style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.25)', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '14px', fontWeight: '800', color: '#38bdf8', margin: 0, fontFamily: 'monospace' }}>QUESTION {idx + 1}</p>
                        {item.score != null && (
                          <span style={{ fontSize: '18px', fontWeight: '900', color: item.score >= 70 ? '#10b981' : item.score >= 40 ? '#eab308' : '#ef4444' }}>{Math.round(item.score)}%</span>
                        )}
                      </div>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff', margin: '0 0 12px 0', lineHeight: '1.5' }}>{item.question}</p>

                      <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', marginBottom: '12px' }}>
                        <p style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Your Answer</p>
                        <p style={{ fontSize: '14px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>{item.answer || <span style={{ color: '#94a3b8' }}>No answer recorded</span>}</p>
                      </div>

                      {item.feedback && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', margin: '0 0 6px 0', textTransform: 'uppercase' }}>AI Feedback</p>
                          <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>{item.feedback}</p>
                        </div>
                      )}

                      {(item.strengths || item.improvements) && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                          {item.strengths && (
                            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                              <p style={{ fontSize: '12px', fontWeight: '900', color: '#10b981', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Strengths</p>
                              <p style={{ fontSize: '13px', color: '#d1fae5', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>{item.strengths}</p>
                            </div>
                          )}
                          {item.improvements && (
                            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                              <p style={{ fontSize: '12px', fontWeight: '900', color: '#f87171', margin: '0 0 6px 0', textTransform: 'uppercase' }}>Improve</p>
                              <p style={{ fontSize: '13px', color: '#fee2e2', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>{item.improvements}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setScreen('history')} style={{ width: '100%', marginTop: '24px', backgroundColor: '#64748b', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', boxSizing: 'border-box' }}>Back to History</button>
            </div>
          </div>
        )}

        {screen === 'interview-setup' && (
          <div style={{ width: '100%', maxWidth: '600px', boxSizing: 'border-box' }}>
            <div className="app-card-box dark:bg-slate-900/95 dark:border-white/50 dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', width: '100%', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0' }}>New {selectedType === 'technical' ? 'Technical' : 'Behavioral'} Interview</h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', margin: '0 0 28px 0' }}>Select a job role for this session</p>
              {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px', maxHeight: '300px', overflowY: 'auto' }}>
                {jobRoles.map((r) => (
                  <button key={r.id} onClick={() => setSelectedRole(r.id)} style={{ textAlign: 'left', padding: '16px', borderRadius: '14px', border: selectedRole === r.id ? '2px solid #06b6d4' : '2px solid rgba(255,255,255,0.2)', backgroundColor: selectedRole === r.id ? 'rgba(6, 182, 212, 0.25)' : '#0f172a', color: '#ffffff', cursor: 'pointer', fontWeight: '700', fontSize: '15px', boxSizing: 'border-box' }}>
                    {r.title} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>· {r.category}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={createSession} disabled={!selectedRole} style={{ flex: 1, minWidth: '140px', background: selectedRole ? 'linear-gradient(to right, #2563eb, #06b6d4)' : '#475569', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: selectedRole ? 'pointer' : 'not-allowed', fontSize: '16px', boxShadow: selectedRole ? '0 6px 20px rgba(37, 99, 235, 0.5)' : 'none', boxSizing: 'border-box' }}>Start Interview</button>
                <button onClick={() => { setScreen('dashboard'); setSelectedRole(null); }} style={{ flex: 1, minWidth: '140px', backgroundColor: '#64748b', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', boxSizing: 'border-box' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {screen === 'interview' && (
          <div style={{ width: '100%', maxWidth: '900px', boxSizing: 'border-box' }}>
            <div className="app-card-box dark:bg-slate-900/95 dark:border-white/50 dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', width: '100%', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0' }}>{selectedType === 'technical' ? 'Technical' : 'Behavioral'} Interview</h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', margin: '0 0 12px 0' }}>
                Question {currentQIndex + 1} of {questions.length} · Attempt {currentAttempt} of 2
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button onClick={() => { setVoiceOn((v) => !v); stopSpeaking(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: voiceOn ? 'rgba(16, 185, 129, 0.2)' : '#334155', color: '#ffffff', fontWeight: '700', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${voiceOn ? 'rgba(16, 185, 129, 0.6)' : 'rgba(255,255,255,0.3)'}`, cursor: 'pointer', fontSize: '13px' }}>
                  {voiceOn ? 'Voice On' : 'Voice Off'}
                </button>
                <button onClick={() => speak(questions[currentQIndex]?.question_text)} disabled={!questions[currentQIndex]} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#ffffff', fontWeight: '700', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.6)', cursor: 'pointer', fontSize: '13px' }}>
                  Read Question Aloud
                </button>
              </div>
              {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
                {questions.map((_, idx) => (
                  <div key={idx} style={{ flex: 1, height: '8px', borderRadius: '6px', backgroundColor: idx <= currentQIndex ? '#06b6d4' : 'rgba(255,255,255,0.15)' }} />
                ))}
              </div>

              {questions[currentQIndex] && (
                <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.25)', boxSizing: 'border-box' }}>
                  <p style={{ fontSize: '16px', fontWeight: '800', color: '#38bdf8', margin: '0 0 8px 0', fontFamily: 'monospace' }}>QUESTION {currentQIndex + 1}</p>
                  <p style={{ fontSize: '17px', fontWeight: '600', color: '#ffffff', margin: '0 0 16px 0', lineHeight: '1.5' }}>{questions[currentQIndex].question_text}</p>

                  {!aiFeedback ? (
                    <>
                      <textarea value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} placeholder={`Your answer (${currentAttempt === 1 ? 'first' : 'second'} attempt)...`} rows={5} style={{ width: '100%', backgroundColor: '#1e293b', border: '2px solid #475569', borderRadius: '12px', padding: '14px', color: '#ffffff', fontSize: '15px', fontWeight: '500', resize: 'vertical', boxSizing: 'border-box' }} />
                      <VoiceRecorder
                        questionId={questions[currentQIndex].id}
                        onTranscript={handleTranscript}
                        initialText={currentAnswer}
                      />
                      <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                        <button onClick={submitAnswer} disabled={evaluating} style={{ flex: 1, minWidth: '160px', background: 'linear-gradient(to right, #2563eb, #06b6d4)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: evaluating ? 'wait' : 'pointer', fontSize: '16px', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.5)', boxSizing: 'border-box' }}>
                          {evaluating ? 'Evaluating...' : currentAttempt === 1 ? 'Submit Answer' : 'Submit Improved Answer'}
                        </button>
                        <button onClick={() => { stopSpeaking(); setScreen('dashboard'); setCurrentSession(null); setQuestions([]); setConversationHistory([]); }} style={{ backgroundColor: '#64748b', color: '#ffffff', fontWeight: '800', padding: '16px 24px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', boxSizing: 'border-box' }}>Quit</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <div style={{ width: '84px', height: '84px', borderRadius: '50%', border: `6px solid ${aiFeedback.score >= 70 ? '#10b981' : aiFeedback.score >= 40 ? '#eab308' : '#ef4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: '#0f172a' }}>
                          <span style={{ fontSize: '22px', fontWeight: '900', color: '#ffffff' }}>{aiFeedback.score}%</span>
                        </div>
                        <div>
                          <p style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', margin: 0 }}>AI Feedback</p>
                          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>Attempt {aiFeedback.attempt} of 2</p>
                        </div>
                      </div>

                      <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', marginBottom: '16px' }}>
                        <p style={{ fontSize: '15px', color: '#e2e8f0', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>{aiFeedback.feedback}</p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                          <p style={{ fontSize: '13px', fontWeight: '900', color: '#10b981', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Strengths</p>
                          {(Array.isArray(aiFeedback.strengths) ? aiFeedback.strengths : []).map((s, i) => (
                            <p key={i} style={{ fontSize: '14px', color: '#d1fae5', margin: '0 0 6px 0', fontWeight: '500' }}>• {s}</p>
                          ))}
                        </div>
                        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                          <p style={{ fontSize: '13px', fontWeight: '900', color: '#f87171', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Improve</p>
                          {(Array.isArray(aiFeedback.weaknesses) ? aiFeedback.weaknesses : []).map((w, i) => (
                            <p key={i} style={{ fontSize: '14px', color: '#fee2e2', margin: '0 0 6px 0', fontWeight: '500' }}>• {w}</p>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {currentAttempt === 1 && (
                          <button onClick={tryAgain} style={{ flex: 1, minWidth: '140px', background: 'linear-gradient(to right, #8b5cf6, #d946ef)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', boxShadow: '0 6px 20px rgba(139, 92, 246, 0.5)', boxSizing: 'border-box' }}>
                            Improve My Answer
                          </button>
                        )}
                        <button onClick={nextQuestion} style={{ flex: 1, minWidth: '140px', background: 'linear-gradient(to right, #10b981, #14b8a6)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)', boxSizing: 'border-box' }}>
                          {currentQIndex + 1 >= questions.length ? 'Finish Interview' : 'Next Question'}
                        </button>
                        <button onClick={askFollowUp} disabled={askingFollowUp} style={{ flex: 1, minWidth: '140px', background: 'linear-gradient(to right, #8b5cf6, #06b6d4)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: askingFollowUp ? 'wait' : 'pointer', fontSize: '16px', boxShadow: '0 6px 20px rgba(139, 92, 246, 0.5)', boxSizing: 'border-box' }}>
                          {askingFollowUp ? 'Thinking...' : 'Ask AI Follow-up'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {screen === 'voice-interview' && (
          <div style={{ width: '100%', maxWidth: '900px', boxSizing: 'border-box' }}>
            <div className="app-card-box dark:bg-slate-900/95 dark:border-white/50 dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: 0 }}>Vocal AI Interview</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => { setVoiceOn((v) => !v); stopSpeaking(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: voiceOn ? 'rgba(16, 185, 129, 0.2)' : '#334155', color: '#ffffff', fontWeight: '700', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${voiceOn ? 'rgba(16, 185, 129, 0.6)' : 'rgba(255,255,255,0.3)'}`, cursor: 'pointer', fontSize: '13px' }}>
                    {voiceOn ? 'Voice On' : 'Voice Off'}
                  </button>
                  <button onClick={() => { stopSpeaking(); setScreen('dashboard'); setCurrentSession(null); setQuestions([]); setConversationHistory([]); }} style={{ backgroundColor: '#64748b', color: '#ffffff', fontWeight: '800', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '13px' }}>Quit</button>
                </div>
              </div>
              <p style={{ fontSize: '15px', color: '#cbd5e1', margin: '0 0 20px 0' }}>
                The AI reads each question aloud. You get <span style={{ color: '#eab308', fontWeight: '900' }}>1 minute</span> to answer out loud — no typing needed.
              </p>
              {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
                {Array.from({ length: baseQuestionCount }).map((_, idx) => (
                  <div key={idx} style={{ flex: 1, height: '8px', borderRadius: '6px', backgroundColor: idx < voiceMainIdx ? '#06b6d4' : idx === voiceMainIdx ? '#38bdf8' : 'rgba(255,255,255,0.15)' }} />
                ))}
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: 'clamp(20px, 4vw, 32px)', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.25)', boxSizing: 'border-box', textAlign: 'center' }}>
                {questions[currentQIndex] && (
                  <p style={{ fontSize: '17px', fontWeight: '600', color: '#ffffff', margin: '0 0 20px 0', lineHeight: '1.5' }}>{questions[currentQIndex].question_text}</p>
                )}

                {voicePhase === 'question' && (
                  <div>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#38bdf8', animation: 'pulse 1s infinite', marginBottom: '12px' }} />
                    <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
                    <p style={{ color: '#94a3b8', fontSize: '15px', fontWeight: '600', margin: 0 }}>The AI is reading the question — listen carefully...</p>
                  </div>
                )}

                {voicePhase === 'answer' && (
                  <div>
                    <div style={{ width: '150px', height: '150px', borderRadius: '50%', border: `8px solid ${countdown > 15 ? '#10b981' : '#ef4444'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', margin: '0 0 14px 0', boxShadow: countdown <= 15 ? '0 0 20px rgba(239,68,68,0.4)' : '0 0 20px rgba(16,185,129,0.25)' }}>
                      <span style={{ fontSize: '42px', fontWeight: '900', color: '#ffffff', fontFamily: 'monospace' }}>0:{String(countdown).padStart(2, '0')}</span>
                    </div>
                    <p style={{ color: '#38bdf8', fontSize: '16px', fontWeight: '800', margin: '0 0 6px 0' }}>Your turn — speak your answer</p>
                    <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 8px 0', fontWeight: '500' }}>
                      {currentAnswer ? `Heard: "${currentAnswer}"` : 'Listening...'}
                    </p>
                    <VoiceRecorder
                      key={questions[currentQIndex]?.id}
                      questionId={questions[currentQIndex]?.id}
                      onTranscript={handleTranscript}
                      autoStart
                      durationSeconds={60}
                      onDone={voiceOnAnswerDone}
                      stopSignal={stopSignal}
                    />
                    <div style={{ marginTop: '16px' }}>
                      <button onClick={voiceStop} style={{ backgroundColor: '#ef4444', color: '#ffffff', fontWeight: '800', padding: '14px 30px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '15px', boxShadow: '0 6px 18px rgba(239,68,68,0.4)' }}>Stop &amp; Continue</button>
                    </div>
                  </div>
                )}

                {voicePhase === 'feedback' && (
                  <div>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#8b5cf6', animation: 'pulse 1s infinite', marginBottom: '12px' }} />
                    <p style={{ color: '#94a3b8', fontSize: '15px', fontWeight: '600', margin: 0 }}>The AI is reviewing your answer and preparing the next question...</p>
                  </div>
                )}

                {voicePhase === 'summary' && (
                  <p style={{ color: '#eab308', fontSize: '16px', fontWeight: '800', margin: 0 }}>Interview complete — calculating your results...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {screen === 'results' && results && (
          <div style={{ width: '100%', maxWidth: '900px', boxSizing: 'border-box' }}>
            <div className="app-card-box dark:bg-slate-900/95 dark:border-white/50 dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', width: '100%', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0', textAlign: 'center' }}>Interview Results</h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', textAlign: 'center', margin: '0 0 28px 0' }}>Your performance on this {selectedType === 'technical' ? 'Technical' : 'Behavioral'} interview</p>

              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ width: '140px', height: '140px', borderRadius: '50%', border: `10px solid ${results.overall >= 70 ? '#10b981' : results.overall >= 40 ? '#eab308' : '#ef4444'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                  <span style={{ fontSize: '40px', fontWeight: '900', color: '#ffffff' }}>{results.overall}%</span>
                </div>
                <p style={{ fontSize: '16px', color: '#94a3b8', margin: '16px 0 0 0', fontWeight: '700' }}>
                  {results.overall >= 70 ? 'Great job! You are interview-ready.' : results.overall >= 40 ? 'Good effort! Keep practicing to improve.' : 'Keep practicing — review the feedback below.'}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
                {results.items.map((e, i) => (
                  <div key={e.question_id} style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.25)', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <p style={{ fontSize: '14px', fontWeight: '800', color: '#38bdf8', margin: 0, fontFamily: 'monospace' }}>QUESTION {i + 1}</p>
                      <span style={{ fontSize: '18px', fontWeight: '900', color: e.score >= 70 ? '#10b981' : e.score >= 40 ? '#eab308' : '#ef4444' }}>{Math.round(e.score)}%</span>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff', margin: '0 0 10px 0', lineHeight: '1.5' }}>{e.question}</p>
                    {e.feedback && <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>{e.feedback}</p>}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button onClick={restartInterview} style={{ flex: 1, background: 'linear-gradient(to right, #2563eb, #06b6d4)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.5)', boxSizing: 'border-box' }}>Back to Dashboard</button>
              </div>
            </div>
          </div>
        )}

        {screen === 'forgot-password' && (
          <div style={{ maxWidth: '460px', width: '100%', boxSizing: 'border-box' }}>
            <div className="app-card-box dark:bg-slate-900/95 dark:border-white/50 dark:shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_25px_rgba(168,85,247,0.2)]" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: '28px', border: '2px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)', width: '100%', boxSizing: 'border-box' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', textAlign: 'center', margin: '0 0 6px 0' }}>Reset Password</h2>
              <p style={{ fontSize: '15px', color: '#cbd5e1', textAlign: 'center', margin: '0 0 28px 0' }}>Enter your account email to receive recovery instructions</p>
              {error && <div style={{ backgroundColor: '#f43f5e', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{error}</div>}
              {success && <div style={{ backgroundColor: '#10b981', border: '1px solid #ffffff', color: '#ffffff', padding: '14px', borderRadius: '12px', fontSize: '14px', marginBottom: '20px', fontWeight: '700' }}>{success}</div>}
              
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', textTransform: 'uppercase', color: '#f3e8ff', marginBottom: '8px', fontWeight: '800' }}>System Email Account</label>
                  <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="name@domain.com" style={{ width: '100%', backgroundColor: '#0f172a', border: '2px solid #a855f7', borderRadius: '14px', padding: '16px', color: '#ffffff', fontSize: '16px', fontWeight: '600', boxSizing: 'border-box' }} required />
                </div>
                <button type="submit" style={{ width: '100%', background: 'linear-gradient(to right, #2563eb, #06b6d4)', color: '#ffffff', fontWeight: '800', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.4)', cursor: 'pointer', marginTop: '10px', fontSize: '16px', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.5)', boxSizing: 'border-box' }}>Send Reset Link</button>
              </form>

              <p style={{ fontSize: '15px', textAlign: 'center', color: '#cbd5e1', marginTop: '28px', marginBottom: 0, fontWeight: '500' }}>
                Remembered your password? <button onClick={() => { setScreen('login'); setError(''); setSuccess(''); }} style={{ color: '#38bdf8', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontWeight: '700' }}>Return to Login</button>
              </p>
            </div>
          </div>
        )}

      </main>

      <footer style={{ textAlign: 'center', padding: '24px 16px', borderTop: '2px solid rgba(255,255,255,0.25)', color: '#ffffff', fontSize: '15px', fontFamily: 'monospace', backgroundColor: '#0f172a', letterSpacing: '0.5px', fontWeight: '700', boxSizing: 'border-box' }}>
        &copy; {new Date().getFullYear()} InterviewCoach AI
      </footer>
    </div>
  );
}