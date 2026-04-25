'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  XMarkIcon,
  MicrophoneIcon,
  StopIcon,
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

  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playbackCursorRef = useRef<number>(0);
  const isMutedRef = useRef<boolean>(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (!transcriptEndRef.current) return;
    transcriptEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcript]);

  const teardown = useCallback(() => {
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
        setStatus('listening');
        break;
      }
      case 'response.created': {
        setStatus('speaking');
        break;
      }
      case 'response.done': {
        setStatus('listening');
        break;
      }
      case 'response.output_audio.delta': {
        if (!outputAudioCtxRef.current || !data.delta) return;
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
        throw new Error(err.error || 'Failed to obtain voice session');
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

  const statusLabel = (() => {
    switch (status) {
      case 'connecting':
        return 'Connecting…';
      case 'listening':
        return isMuted ? 'Muted' : 'Listening…';
      case 'speaking':
        return 'Grok is speaking…';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  })();

  const ringClass =
    status === 'speaking'
      ? 'ring-4 ring-blue-400 animate-pulse'
      : status === 'listening' && !isMuted
        ? 'ring-4 ring-green-400'
        : status === 'error'
          ? 'ring-4 ring-red-400'
          : 'ring-2 ring-border';

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[90]">
      <div className="bg-card border border-border p-6 rounded-sm w-[560px] max-w-[92vw] max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <MicrophoneIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Ask a question about this content
            </h2>
          </div>
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
              Ask a question about the content above — answers are grounded only in this material.
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
            className="px-4 py-2 border border-border text-foreground rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
