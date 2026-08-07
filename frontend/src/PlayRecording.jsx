import { useState, useEffect, useRef } from 'react';
import api from './api';

export function PlayRecording({ sessionId, questionId }) {
  const [status, setStatus] = useState('idle');
  const [playing, setPlaying] = useState(false);
  const urlRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const load = async () => {
    setStatus('loading');
    try {
      const res = await api.get(`/sessions/${sessionId}/recordings/${questionId}`, { responseType: 'blob' });
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(res.data);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
    }
  };

  const toggle = async () => {
    if (!urlRef.current) {
      if (status === 'loading') return;
      await load();
    }
    if (!urlRef.current || status === 'error') {
      setStatus('idle');
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(urlRef.current);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onerror = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={status === 'loading'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: playing ? '#ef4444' : '#06b6d4',
        color: '#ffffff',
        fontWeight: '700',
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.4)',
        cursor: status === 'loading' ? 'wait' : 'pointer',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    >
      {status === 'loading' ? (
        'LOADING…'
      ) : playing ? (
        <>⏸ STOP</>
      ) : (
        <>▶ PLAY ANSWER</>
      )}
    </button>
  );
}

export function ReplayConversation({ sessionId, items }) {
  const [running, setRunning] = useState(false);
  const [idx, setIdx] = useState(-1);
  const runRef = useRef(false);
  const audioRef = useRef(null);
  const itemsRef = useRef(items);

  itemsRef.current = items;

  const stop = () => {
    runRef.current = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIdx(-1);
    setRunning(false);
  };

  useEffect(() => () => stop(), []);

  const speakText = (text) =>
    new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        u.voice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      }
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });

  const playAudio = (questionId) =>
    new Promise((resolve) => {
      (async () => {
        try {
          const res = await api.get(`/sessions/${sessionId}/recordings/${questionId}`, { responseType: 'blob' });
          if (!runRef.current) { resolve(); return; }
          const url = URL.createObjectURL(res.data);
          if (audioRef.current) audioRef.current.pause();
          const a = new Audio(url);
          audioRef.current = a;
          a.onended = () => { URL.revokeObjectURL(url); resolve(); };
          a.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          a.play().catch(() => { URL.revokeObjectURL(url); resolve(); });
        } catch (err) {
          resolve();
        }
      })();
    });

  const start = async () => {
    if (running) { stop(); return; }
    runRef.current = true;
    setRunning(true);
    const list = itemsRef.current.filter((it) => it.question_id);
    for (let i = 0; i < list.length; i++) {
      if (!runRef.current) break;
      setIdx(i);
      await speakText(list[i].question);
      if (!runRef.current) break;
      await playAudio(list[i].question_id);
    }
    setIdx(-1);
    setRunning(false);
    runRef.current = false;
  };

  return (
    <div style={{ textAlign: 'center', margin: '18px 0' }}>
      <button
        type="button"
        onClick={start}
        style={{
          backgroundColor: running ? '#ef4444' : '#10b981',
          color: '#ffffff',
          fontWeight: '800',
          padding: '12px 22px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.4)',
          cursor: 'pointer',
          fontSize: '14px',
          fontFamily: 'monospace',
          boxShadow: running ? '0 6px 18px rgba(239,68,68,0.4)' : '0 6px 18px rgba(16,185,129,0.4)',
        }}
      >
        {running ? '■ STOP REPLAY' : '▶ REPLAY FULL INTERVIEW (AI + YOUR VOICE)'}
      </button>
      {running && idx >= 0 && (
        <p style={{ color: '#cbd5e1', fontSize: '13px', margin: '10px 0 0 0', fontWeight: '600' }}>
          Playing question {idx + 1} of {itemsRef.current.length}…
        </p>
      )}
    </div>
  );
}
