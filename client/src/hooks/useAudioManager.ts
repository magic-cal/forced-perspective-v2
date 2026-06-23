import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSocket } from '@/sockets/SocketProvider';
import { useTrickStore } from '@/store/useTrickStore';
import type { TrickState } from '@/types/trick';

const MUSIC_URL = '/audio/background.mp3';

// ─── AudioEngine ─────────────────────────────────────────────────────────────

class AudioEngine {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly musicBus: GainNode;

  private musicBuffer: AudioBuffer | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  // True when startMusic() was called before the buffer finished loading
  private pendingPlay = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);

    if (ctx.state === 'suspended') {
      const resume = () => {
        void ctx.resume();
        window.removeEventListener('click',      resume, true);
        window.removeEventListener('touchstart', resume, true);
        window.removeEventListener('keydown',    resume, true);
      };
      window.addEventListener('click',      resume, true);
      window.addEventListener('touchstart', resume, true);
      window.addEventListener('keydown',    resume, true);
    }

    void this.loadMusic();
  }

  private async loadMusic(): Promise<void> {
    try {
      const res    = await fetch(MUSIC_URL);
      const buf    = await res.arrayBuffer();
      this.musicBuffer = await this.ctx.decodeAudioData(buf);
      if (this.pendingPlay) {
        this.pendingPlay = false;
        this.playBuffer();
      }
    } catch (err) {
      console.warn('[audio] failed to load background music', err);
    }
  }

  // ─── Background music ─────────────────────────────────────────────────────
  // One consistent quiet loop — starts when the trick begins, stops on reset.
  // Volume is intentionally low so it sits beneath the SFX without competing.

  private playBuffer(): void {
    void this.ctx.resume();
    if (!this.musicBuffer) return;

    // BufferSourceNode can only be started once — create a fresh one each time.
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch { /* already stopped */ }
    }

    const src = this.ctx.createBufferSource();
    src.buffer = this.musicBuffer;
    src.loop = true;
    src.connect(this.musicBus);
    src.start();
    this.musicSource = src;

    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(0, now);
    this.musicBus.gain.linearRampToValueAtTime(0.3, now + 4); // gentle fade-in
  }

  startMusic(): void {
    if (!this.musicBuffer) {
      this.pendingPlay = true; // will play once loaded
      return;
    }
    this.playBuffer();
  }

  stopMusic(fadeSecs = 4): void {
    this.pendingPlay = false;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(0, now + fadeSecs);
    // Release the source after fade so the scheduler doesn't keep it alive
    if (this.musicSource) {
      const src = this.musicSource;
      this.musicSource = null;
      try { src.stop(now + fadeSecs + 0.1); } catch { /* already stopped */ }
    }
  }

  // ─── Foley SFX helpers ────────────────────────────────────────────────────
  // Noise + bandpass filter is the core primitive for all whoosh-type sounds.
  // Each call builds and immediately plays a one-shot graph; nodes are GC'd
  // automatically once the buffer source reaches its stop time.

  private noise(seconds: number): AudioBufferSourceNode {
    const rate = this.ctx.sampleRate;
    const buf  = this.ctx.createBuffer(1, Math.ceil(rate * seconds), rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src  = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  // ─── Foley SFX ────────────────────────────────────────────────────────────
  // Each sound covers an entire animation phase — one whoosh, not per-card.

  // Cards home to sphere (~5 s) — slow-rising atmospheric whoosh that settles.
  sfxCardFormation(): void {
    void this.ctx.resume();
    const duration = 5;
    const src  = this.noise(duration);
    const filt = this.ctx.createBiquadFilter();
    const env  = this.ctx.createGain();
    const t    = this.ctx.currentTime;

    filt.type    = 'bandpass';
    filt.Q.value = 1.5;
    filt.frequency.setValueAtTime(120, t);
    filt.frequency.exponentialRampToValueAtTime(900, t + duration * 0.55);
    filt.frequency.exponentialRampToValueAtTime(350, t + duration);

    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.22, t + 1.2);
    env.gain.setValueAtTime(0.18, t + duration - 1.5);
    env.gain.linearRampToValueAtTime(0, t + duration);

    src.connect(filt); filt.connect(env); env.connect(this.master);
    src.start(); src.stop(t + duration);
  }

  // Staggered flip wave (~3 s) — a single sweeping swoosh across the whole wave.
  sfxCardFlip(): void {
    void this.ctx.resume();
    const duration = 3;
    const src  = this.noise(duration);
    const filt = this.ctx.createBiquadFilter();
    const env  = this.ctx.createGain();
    const t    = this.ctx.currentTime;

    filt.type    = 'bandpass';
    filt.Q.value = 1.2;
    filt.frequency.setValueAtTime(300, t);
    filt.frequency.exponentialRampToValueAtTime(2400, t + duration * 0.5);
    filt.frequency.exponentialRampToValueAtTime(700, t + duration);

    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.2, t + 0.3);
    env.gain.setValueAtTime(0.16, t + duration - 0.6);
    env.gain.linearRampToValueAtTime(0, t + duration);

    src.connect(filt); filt.connect(env); env.connect(this.master);
    src.start(); src.stop(t + duration);
  }

  // Participant taps a card — one quiet, airy chime, nothing forceful.
  sfxCardSelect(): void {
    void this.ctx.resume();
    const t   = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880; // A5 — present but not piercing
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.12, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    osc.connect(env); env.connect(this.master);
    osc.start(t); osc.stop(t + 1.5);
  }

  // Cards scatter outward (~3.5 s) — an opening burst that fades into silence.
  sfxCardScatter(): void {
    void this.ctx.resume();
    const duration = 3.5;
    const src  = this.noise(duration);
    const filt = this.ctx.createBiquadFilter();
    const env  = this.ctx.createGain();
    const t    = this.ctx.currentTime;

    filt.type    = 'bandpass';
    filt.Q.value = 0.9;
    filt.frequency.setValueAtTime(250, t);
    filt.frequency.exponentialRampToValueAtTime(4200, t + duration);

    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.25, t + 0.15);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    src.connect(filt); filt.connect(env); env.connect(this.master);
    src.start(); src.stop(t + duration);
  }

  // ─── State dispatcher ─────────────────────────────────────────────────────

  onStateChange(state: TrickState): void {
    switch (state) {
      case 'setup':
        this.stopMusic(4);
        break;

      case 'forming':
        this.startMusic();
        this.sfxCardFormation();
        break;

      case 'cards-flipping':
        this.sfxCardFlip();
        break;

      // Music continues unchanged through selection and alignment phases
      case 'participant-selection':
      case 'sphere-aligned':
        break;

      case 'final-flip':
        this.sfxCardFlip();
        break;

      case 'scatter':
        this.sfxCardScatter();
        this.stopMusic(4);
        break;
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  dispose(): void {
    this.stopMusic(0.1);
  }
}

// ─── React hook ──────────────────────────────────────────────────────────────

export function useAudioManager(): void {
  const role      = useGameStore((s) => s.role);
  const socket    = useSocket();
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    if (role !== 'audience' && role !== 'spectator') return;

    const ctx    = new AudioContext();
    const engine = new AudioEngine(ctx);
    engineRef.current = engine;

    const unsubscribe = useTrickStore.subscribe((state, prev) => {
      if (state.currentState !== prev.currentState) {
        engine.onStateChange(state.currentState);
      }
    });

    return () => {
      unsubscribe();
      engine.dispose();
      void ctx.close();
      engineRef.current = null;
    };
  }, [role]);

  useEffect(() => {
    if (!socket || (role !== 'audience' && role !== 'spectator')) return;
    const handle = () => engineRef.current?.sfxCardSelect();
    socket.on('card-selected', handle);
    return () => { socket.off('card-selected', handle); };
  }, [socket, role]);
}
