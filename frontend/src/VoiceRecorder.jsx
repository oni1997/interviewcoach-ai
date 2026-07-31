import { useState, useRef, useCallback } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VoiceRecorder({ questionId, onTranscript, initialText }) {
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(!!SpeechRecognition);
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const transcriptRef = useRef('');

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    setError('');
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            transcriptRef.current += result[0].transcript.trim() + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
        const full = (transcriptRef.current + interim).trim();
        onTranscript(questionId, full);
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') return;
        if (event.error === 'aborted') return;
        setError(event.error);
        stopAll();
      };

      recognition.onend = () => {
        const text = transcriptRef.current.trim();
        if (text) onTranscript(questionId, text);
        if (listening) {
          try { recognition.start(); } catch (e) { /* restart not possible */ }
        }
      };

      recognition.start();
      setListening(true);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        const url = URL.createObjectURL(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(url);
        setRecording(false);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied');
      } else {
        setError('Microphone not available');
      }
    }
  }, [questionId, onTranscript, listening, audioUrl]);

  const stopAll = useCallback(() => {
    setListening(false);
    cleanup();
  }, [cleanup]);

  const toggleListening = () => {
    if (listening) {
      stopAll();
      transcriptRef.current = '';
    } else {
      transcriptRef.current = initialText || '';
      setRecordingTime(0);
      startListening();
    }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (playing) {
      stopAudio();
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setPlaying(false);
        audioRef.current.onerror = () => setPlaying(false);
      }
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!supported) {
    return (
      <div style={{ marginTop: '8px' }}>
        <p style={{ fontSize: '12px', color: '#f87171', margin: 0, fontWeight: '600' }}>
          Voice mode requires Chrome or Edge browser.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '12px' }}>
      {error && (
        <p style={{ fontSize: '12px', color: '#f87171', margin: '0 0 8px 0', fontWeight: '600' }}>{error}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={toggleListening}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: listening ? '#ef4444' : '#4f46e5',
            color: '#ffffff',
            fontWeight: '700',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.3)',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'monospace',
            transition: 'background-color 0.2s',
            boxShadow: listening ? '0 0 12px rgba(239,68,68,0.5)' : 'none',
          }}
        >
          {listening ? (
            <>
              <span style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'pulse 1s infinite',
              }} />
              <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
              RECORDING {formatTime(recordingTime)}
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
                <path d="M17 11a1 1 0 012 0 7 7 0 01-6 6.93V20h3a1 1 0 010 2H8a1 1 0 010-2h3v-2.07A7 7 0 015 11a1 1 0 012 0 5 5 0 0010 0z" />
              </svg>
              VOICE
            </>
          )}
        </button>

        {audioUrl && !listening && (
          <button
            type="button"
            onClick={togglePlayback}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: playing ? '#10b981' : '#0f172a',
              color: '#ffffff',
              fontWeight: '700',
              padding: '8px 16px',
              borderRadius: '10px',
              border: '2px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          >
            {playing ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                STOP
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                PLAY
              </>
            )}
          </button>
        )}

        {recording && (
          <span style={{
            fontSize: '12px',
            color: '#94a3b8',
            fontFamily: 'monospace',
            fontWeight: '600',
          }}>
            {formatTime(recordingTime)}
          </span>
        )}
      </div>
    </div>
  );
}