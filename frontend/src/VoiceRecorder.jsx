import { useState, useRef, useCallback, useEffect } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VoiceRecorder({
  questionId,
  onTranscript,
  initialText,
  autoStart = false,
  durationSeconds = 0,
  onDone,
  stopSignal = 0,
}) {
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
  const interimRef = useRef('');
  const secondsRef = useRef(0);
  const doneFiredRef = useRef(false);
  const listeningRef = useRef(false);
  const lastStopRef = useRef(0);
  const lastBlobRef = useRef(null);
  const pendingStopRef = useRef(false);

  listeningRef.current = listening;

  const stopAllRef = useRef(null);

  const fireDone = useCallback((blob) => {
    if (doneFiredRef.current) return;
    doneFiredRef.current = true;
    const full = (transcriptRef.current + ' ' + interimRef.current).trim();
    if (onDone) onDone(questionId, full, blob || lastBlobRef.current || null);
  }, [questionId, onDone]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
  }, []);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
    }
    releaseStream();
  }, [releaseStream]);

  const stopAll = useCallback(() => {
    setListening(false);
    setRecording(false);
    if (pendingStopRef.current) return;
    pendingStopRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === 'recording') {
      try { rec.stop(); } catch (e) {
        pendingStopRef.current = false;
        releaseStream();
        fireDone();
      }
    } else {
      pendingStopRef.current = false;
      releaseStream();
      fireDone();
    }
  }, [cleanup, fireDone, releaseStream]);

  stopAllRef.current = stopAll;

  // Stop the microphone/stream if the component unmounts mid-recording.
  useEffect(() => () => cleanup(), [cleanup]);

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
        interimRef.current = interim;
        const full = (transcriptRef.current + interim).trim();
        onTranscript(questionId, full);
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        setError('Speech recognition issue — keep speaking, still recording');
      };

      recognition.onend = () => {
        const text = (transcriptRef.current + interimRef.current).trim();
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
        lastBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(url);
        setRecording(false);
        releaseStream();
        if (pendingStopRef.current) {
          pendingStopRef.current = false;
          fireDone(blob);
        }
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);

      secondsRef.current = 0;
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setRecordingTime(secondsRef.current);
        if (durationSeconds > 0 && secondsRef.current >= durationSeconds) {
          stopAllRef.current();
        }
      }, 1000);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied');
      } else {
        setError('Microphone not available');
      }
    }
  }, [questionId, onTranscript, listening, audioUrl, durationSeconds, releaseStream, fireDone]);

  const begin = useCallback(() => {
    setError('');
    transcriptRef.current = '';
    interimRef.current = '';
    doneFiredRef.current = false;
    secondsRef.current = 0;
    setRecordingTime(0);
    startListening();
  }, [startListening]);

  useEffect(() => {
    if (autoStart && SpeechRecognition) {
      const t = setTimeout(() => begin(), 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (stopSignal > 0 && stopSignal !== lastStopRef.current) {
      lastStopRef.current = stopSignal;
      stopAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopSignal]);

  const toggleListening = () => {
    if (listening) {
      stopAll();
    } else {
      begin();
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {!autoStart && (
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
        )}

        {autoStart && listening && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#f87171',
            fontFamily: 'monospace',
            fontWeight: '800',
          }}>
            <span style={{
              width: '10px',
              height: '10px',
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'pulse 1s infinite',
            }} />
            <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
            LISTENING · {formatTime(recordingTime)}
          </span>
        )}

        {audioUrl && !listening && !autoStart && (
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
      </div>
    </div>
  );
}
