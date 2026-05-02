'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  XMarkIcon,
  MicrophoneIcon,
  StopIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/solid';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  responseText: string;
  language?: string;
}

interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  done: boolean;
}

type ConnectionStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

const SAMPLE_RATE = 24000;
const CHUNK_SAMPLES = 2048;

function float32ToBase64PCM16(float32: Float32Array): string {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64PCM16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pcm16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;
  return float32;
}

const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  responseText,
  language = 'en',
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  // Tracks whether assistant audio is *actually* playing through speakers,
  // independent of the server's `response.created`/`response.done` lifecycle.
  // The server can finish generating before we finish playing — this state
  // is what gates the Interject button, so users can always cut Grok off
  // for as long as they can hear him.
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playbackCursorRef = useRef<number>(0);
  // Tracks every BufferSource we schedule for assistant playback so we can
  // stop them all on interject (or teardown).
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  // Single timer used to flip `isAudioPlaying` back to false at exactly the
  // moment the last-scheduled chunk finishes playing. Each new audio delta
  // bumps `playbackCursorRef` forward and resets this timer.
  const playbackEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while we're suppressing the current assistant turn after an interject.
  // Late-arriving audio deltas for the cancelled turn are dropped on arrival,
  // since xAI may keep streaming for a beat after we send `response.cancel`.
  // Cleared when the next turn starts (`response.created`) or the user begins
  // speaking (`input_audio_buffer.speech_started`).
  const suppressIncomingAudioRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (!transcriptEndRef.current) return;
    transcriptEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcript]);

  // Schedules `setIsAudioPlaying(false)` to fire exactly when the
  // last-scheduled audio chunk is expected to finish playing. Should be
  // called every time `playbackCursorRef` is advanced.
  const armPlaybackEndTimer = useCallback(() => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;
    if (playbackEndTimerRef.current) {
      clearTimeout(playbackEndTimerRef.current);
      playbackEndTimerRef.current = null;
    }
    const remainingMs = Math.max(0, (playbackCursorRef.current - ctx.currentTime) * 1000);
    // Small grace period (~80ms) absorbs OS/browser audio buffer latency so
    // the button doesn't flip "listening" while the user can still hear the
    // tail of the last chunk.
    playbackEndTimerRef.current = setTimeout(() => {
      playbackEndTimerRef.current = null;
      setIsAudioPlaying(false);
    }, remainingMs + 80);
  }, []);

  const teardown = useCallback(() => {
    if (playbackEndTimerRef.current) {
      clearTimeout(playbackEndTimerRef.current);
      playbackEndTimerRef.current = null;
    }
    setIsAudioPlaying(false);
    suppressIncomingAudioRef.current = false;
    playingSourcesRef.current.clear();
    try {
      processorRef.current?.disconnect();
    } catch {}
    processorRef.current = null;
    try {
      sourceRef.current?.disconnect();
    } catch {}
    sourceRef.current = null;
    try {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    micStreamRef.current = null;
    try {
      inputAudioCtxRef.current?.close();
    } catch {}
    inputAudioCtxRef.current = null;
    try {
      outputAudioCtxRef.current?.close();
    } catch {}
    outputAudioCtxRef.current = null;
    try {
      if (wsRef.current && wsRef.current.readyState <= 1) {
        wsRef.current.close();
      }
    } catch {}
    wsRef.current = null;
    playbackCursorRef.current = 0;
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    let data: any;
    try {
      data = JSON.parse(event.data as string);
    } catch {
      return;
    }

    switch (data.type) {
      case 'input_audio_buffer.speech_started': {
        // User started talking — any leftover suppression for the previous
        // assistant turn is no longer relevant.
        suppressIncomingAudioRef.current = false;
        setStatus('listening');
        break;
      }
      case 'response.created': {
        // Brand new assistant turn — open the playback gate again.
        suppressIncomingAudioRef.current = false;
        setStatus('speaking');
        break;
      }
      case 'response.done': {
        suppressIncomingAudioRef.current = false;
        setStatus('listening');
        break;
      }
      case 'response.output_audio.delta': {
        if (!outputAudioCtxRef.current || !data.delta) return;
        // Drop any deltas for an interrupted turn. xAI may keep streaming
        // for a beat after we send `response.cancel`; we don't want to
        // schedule those into the output context.
        if (suppressIncomingAudioRef.current) return;
        const float32 = base64PCM16ToFloat32(data.delta);
        const ctx = outputAudioCtxRef.current;
        const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
        buffer.getChannelData(0).set(float32);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        const startAt = Math.max(ctx.currentTime, playbackCursorRef.current);
        src.start(startAt);
        playbackCursorRef.current = startAt + buffer.duration;
        // Track the source so interject can stop it. Auto-clean when it ends.
        playingSourcesRef.current.add(src);
        src.onended = () => {
          playingSourcesRef.current.delete(src);
        };
        // Drive the "is the user actually hearing audio" state off the
        // playback timeline, not server lifecycle events — the server may
        // finish generating well before we finish playing.
        setIsAudioPlaying(true);
        armPlaybackEndTimer();
        break;
      }
      case 'response.output_audio.done': {
        break;
      }
      case 'response.output_audio_transcript.delta': {
        const respId = data.response_id || data.item_id || 'assistant';
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && !last.done && last.id === respId) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + (data.delta || '') },
            ];
          }
          return [
            ...prev,
            { id: respId, role: 'assistant', text: data.delta || '', done: false },
          ];
        });
        break;
      }
      case 'response.output_audio_transcript.done': {
        setTranscript((prev) =>
          prev.map((e, i) => (i === prev.length - 1 && e.role === 'assistant' ? { ...e, done: true } : e))
        );
        break;
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const text: string = data.transcript || '';
        if (!text) break;
        setTranscript((prev) => [
          ...prev,
          { id: data.item_id || `u-${Date.now()}`, role: 'user', text, done: true },
        ]);
        break;
      }
      case 'error': {
        console.error('xAI voice error:', data);
        setErrorMsg(data.error?.message || 'Voice error');
        break;
      }
      default:
        break;
    }
  }, []);

  // Interject: stop the assistant mid-utterance so the user can talk.
  //
  // We can't trust the server to actually halt the in-flight turn — even if
  // it honors `response.cancel`, audio deltas already in flight will still
  // arrive — so the client takes ownership of silencing things:
  //
  //   1. Set a suppression flag so any further deltas for this turn are
  //      dropped at message-handler time.
  //   2. Stop & disconnect every BufferSource we've already scheduled on
  //      the output context.
  //   3. Snap the playback cursor forward so the next legitimate audio
  //      chunk plays immediately rather than queued behind silenced audio.
  //   4. Send `response.cancel` over the WS so the server can save tokens
  //      if it does support cancellation.
  //
  // The flag is cleared on the next `response.created` (new turn) or when
  // the user starts speaking (`input_audio_buffer.speech_started`).
  const handleInterject = useCallback(() => {
    suppressIncomingAudioRef.current = true;
    if (playbackEndTimerRef.current) {
      clearTimeout(playbackEndTimerRef.current);
      playbackEndTimerRef.current = null;
    }
    for (const src of playingSourcesRef.current) {
      try {
        src.stop();
      } catch {}
      try {
        src.disconnect();
      } catch {}
    }
    playingSourcesRef.current.clear();
    if (outputAudioCtxRef.current) {
      playbackCursorRef.current = outputAudioCtxRef.current.currentTime;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'response.cancel' }));
      } catch {}
    }
    setIsAudioPlaying(false);
    setStatus('listening');
  }, []);

  const startSession = useCallback(async () => {
    setErrorMsg(null);
    setStatus('connecting');
    setTranscript([]);

    try {
      const sessionRes = await fetch('/api/xai-voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText, language }),
      });

      if (!sessionRes.ok) {
        const err = await sessionRes.json().catch(() => ({}));
        const msg =
          err.error === 'QUOTA_EXCEEDED' && err.message
            ? err.message
            : err.message || err.error || 'Failed to obtain voice session';
        throw new Error(msg);
      }

      const { value: token, instructions } = await sessionRes.json();
      if (!token) throw new Error('Missing ephemeral token');

      const ws = new WebSocket(
        'wss://api.x.ai/v1/realtime?model=grok-voice-think-fast-1.0',
        [`xai-client-secret.${token}`]
      );
      wsRef.current = ws;

      ws.onopen = async () => {
        ws.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              voice: 'eve',
              instructions,
              turn_detection: { type: 'server_vad' },
              audio: {
                input: { format: { type: 'audio/pcm', rate: SAMPLE_RATE } },
                output: { format: { type: 'audio/pcm', rate: SAMPLE_RATE } },
              },
            },
          })
        );


        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          micStreamRef.current = stream;

          const AudioCtxCtor =
            (window as any).AudioContext || (window as any).webkitAudioContext;
          const inputCtx: AudioContext = new AudioCtxCtor({ sampleRate: SAMPLE_RATE });
          inputAudioCtxRef.current = inputCtx;

          const outputCtx: AudioContext = new AudioCtxCtor({ sampleRate: SAMPLE_RATE });
          outputAudioCtxRef.current = outputCtx;
          playbackCursorRef.current = outputCtx.currentTime;

          const source = inputCtx.createMediaStreamSource(stream);
          sourceRef.current = source;
          const processor = inputCtx.createScriptProcessor(CHUNK_SAMPLES, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (isMutedRef.current) return;
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
            const input = e.inputBuffer.getChannelData(0);
            const base64 = float32ToBase64PCM16(new Float32Array(input));
            wsRef.current.send(
              JSON.stringify({ type: 'input_audio_buffer.append', audio: base64 })
            );
          };

          source.connect(processor);
          processor.connect(inputCtx.destination);

          setStatus('listening');
        } catch (micErr: any) {
          console.error('Mic error:', micErr);
          setErrorMsg('Microphone access is required.');
          setStatus('error');
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        setErrorMsg('Connection error');
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('idle');
      };
    } catch (err: any) {
      console.error('Voice session error:', err);
      setErrorMsg(err?.message || 'Failed to start voice session');
      setStatus('error');
    }
  }, [responseText, language, handleMessage]);

  useEffect(() => {
    if (!isOpen) {
      teardown();
      setStatus('idle');
      setTranscript([]);
      setErrorMsg(null);
      return;
    }
    startSession();
    return () => {
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // Treat the assistant as "speaking" for UI purposes whenever audio is
  // actually playing OR the server has signaled an in-flight response.
  // Server lifecycle alone is not sufficient — `response.done` can fire
  // seconds before the queued audio actually finishes playing.
  const isAssistantSpeaking = isAudioPlaying || status === 'speaking';

  const statusLabel = (() => {
    if (status === 'connecting') return 'Connecting…';
    if (status === 'error') return 'Error';
    if (status === 'idle') return 'Idle';
    if (isAssistantSpeaking) return 'Grok is speaking…';
    return isMuted ? 'Muted' : 'Listening…';
  })();

  const ringClass = isAssistantSpeaking
    ? 'ring-4 ring-blue-400 animate-pulse'
    : status === 'listening' && !isMuted
      ? 'ring-4 ring-green-400'
      : status === 'error'
        ? 'ring-4 ring-red-400'
        : 'ring-2 ring-border';

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[90]">
      <div className="bg-card border border-border p-6 rounded-sm w-[560px] max-w-[92vw] max-h-[85vh] flex flex-col">
        <div className="flex justify-end items-center pb-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close voice chat"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-3 flex-shrink-0">
          <div
            className={`h-14 w-14 rounded-full flex items-center justify-center bg-muted ${ringClass} transition-all`}
          >
            <MicrophoneIcon className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{statusLabel}</p>
          {errorMsg && (
            <p className="mt-1 text-xs text-red-500">{errorMsg}</p>
          )}
        </div>

        {/* Reference content - the material the user can ask about */}
        {responseText && (
          <div className="mb-3 flex-shrink-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Reference
            </div>
            <div className="bg-background border border-border rounded-md p-3 text-sm text-foreground whitespace-pre-wrap overflow-y-auto max-h-[140px]">
              {responseText
                .replace(/^\s*<>\s*/gm, '• ')
                .replace(/^\s*-\s*/gm, '• ')
                .trim()}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mb-4 bg-background border border-border rounded-md p-3 min-h-[120px] max-h-[220px]">
          {transcript.length === 0 ? (
            <p className="text-muted-foreground italic text-sm">
              Ask a question about the content above, or repeat the phrase aloud to test your pronunciation.
            </p>
          ) : (
            <div className="space-y-3">
              {transcript.map((entry) => (
                <div key={`${entry.id}-${entry.role}`} className="text-sm">
                  <div
                    className={`text-xs uppercase tracking-wide mb-1 ${
                      entry.role === 'user' ? 'text-blue-500' : 'text-primary'
                    }`}
                  >
                    {entry.role === 'user' ? 'You' : 'Grok'}
                  </div>
                  <div className="text-foreground whitespace-pre-wrap">{entry.text}</div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border flex-shrink-0">
          <button
            onClick={() => setIsMuted((m) => !m)}
            disabled={status !== 'listening' && status !== 'speaking'}
            className="px-4 py-2 border border-border text-foreground rounded hover:bg-accent disabled:opacity-50 disabled:cursor-default transition-colors flex items-center gap-2"
          >
            {isMuted ? (
              <>
                <MicrophoneIcon className="h-4 w-4" />
                <span>Unmute</span>
              </>
            ) : (
              <>
                <StopIcon className="h-4 w-4" />
                <span>Mute</span>
              </>
            )}
          </button>
          <button
            onClick={handleInterject}
            disabled={!isAssistantSpeaking}
            aria-label="Interject"
            title="Cut Grok off so you can talk"
            className={`px-4 py-2 rounded transition-colors flex items-center gap-2 ${
              isAssistantSpeaking
                ? 'bg-red-500 text-white hover:bg-red-600 border border-red-500'
                : 'border border-border text-foreground opacity-50 cursor-default'
            }`}
          >
            <HandRaisedIcon className="h-4 w-4" />
            <span>Interject</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            End
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceChatModal;
