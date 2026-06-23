import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSocket } from '@/sockets/SocketProvider';
import { useTrickStore } from '@/store/useTrickStore';
import type { TrickState } from '@/types/trick';

// C major pentatonic spread over two octaves — bright, open
const AMBIENT_SCALE = [523.25, 659.25, 783.99, 880, 1046.5, 1318.5];
// Natural minor pentatonic — darker, expectant
const TENSION_SCALE = [493.88, 587.33, 698.46, 830.61, 987.77];

// ─── Audio synthesis engine ──────────────────────────────────────────────────
// Encapsulates all Web Audio API state so the React hook stays trivial.

class AudioEngine {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly musicBus: GainNode;

  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private nextNoteTime = 0;
  private mode: 'silent' | 'ambient' | 'tension' = 'silent';

  private static readonly LOOK_AHEAD = 0.1; // seconds to schedule ahead
  private static readonly TICK_MS    = 25;  // scheduler poll interval (ms)

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.65;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);

    // Resume context on first user gesture — browsers suspend AudioContext
    // until interaction, but by the time 'forming' fires the audience/spectator
    // will have already interacted with the page (navigated, tapped, etc.).
    if (ctx.state === 'suspended') {
      const resume = () => {
        void ctx.resume();
        window.removeEventListener('click', resume, true);
        window.removeEventListener('touchstart', resume, true);
        window.removeEventListener('keydown', resume, true);
      };
      window.addEventListener('click', resume, true);
      window.addEventListener('touchstart', resume, true);
      window.addEventListener('keydown', resume, true);
    }
  }

  // ─── Bell synthesis ─────────────────────────────────────────────────────────
  // Three inharmonic partials (1×, 2.756×, 5.404×) approximate a struck bell.
  // Higher partials decay faster, matching real bell physics.

  private scheduleBell(freq: number, gain: number, when: number, dest: AudioNode): void {
    const partials: [ratio: number, g: number, decay: number][] = [
      [1,     gain,        2.2 ],
      [2.756, gain * 0.45, 1.0 ],
      [5.404, gain * 0.18, 0.45],
    ];
    for (const [ratio, g, decay] of partials) {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(g, when + 0.003);
      env.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      osc.connect(env);
      env.connect(dest);
      osc.start(when);
      osc.stop(when + decay + 0.02);
    }
  }

  // ─── Music scheduler ────────────────────────────────────────────────────────
  // Uses the AudioContext clock for sub-millisecond note timing, with a fast
  // setTimeout loop just to push notes into the look-ahead window.

  private tick(): void {
    if (this.mode === 'silent') {
      this.schedulerTimer = null;
      return;
    }

    while (this.nextNoteTime < this.ctx.currentTime + AudioEngine.LOOK_AHEAD) {
      const isAmbient           = this.mode === 'ambient';
      const scale               = isAmbient ? AMBIENT_SCALE : TENSION_SCALE;
      const [minGap, maxGap]    = isAmbient ? [0.7, 2.2] : [1.5, 3.5];
      const gain                = isAmbient ? 0.18 : 0.12;

      let freq = scale[Math.floor(Math.random() * scale.length)];
      if (Math.random() < 0.25) freq *= 0.5; // occasional octave drop for depth

      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 0.6;
      panner.connect(this.musicBus);

      this.scheduleBell(freq, gain, this.nextNoteTime, panner);
      this.nextNoteTime += minGap + Math.random() * (maxGap - minGap);
    }

    this.schedulerTimer = setTimeout(() => this.tick(), AudioEngine.TICK_MS);
  }

  startAmbient(delay = 0): void {
    void this.ctx.resume();
    this.mode = 'ambient';
    this.nextNoteTime = this.ctx.currentTime + delay;

    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(1, now + delay + 2.5);

    if (this.schedulerTimer === null) this.tick();
  }

  setMode(mode: 'ambient' | 'tension'): void {
    // Only switch if music is already running; mode is picked up by next note
    if (this.mode !== 'silent') this.mode = mode;
  }

  stopMusic(fadeTime = 3): void {
    const now = this.ctx.currentTime;
    this.mode = 'silent'; // tick() self-terminates when mode is silent
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(0, now + fadeTime);
  }

  // ─── Sound effects ──────────────────────────────────────────────────────────

  playSfxTrickStart(): void {
    void this.ctx.resume();
    // Rising pentatonic arpeggio: C5 → E5 → G5 → C6
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.scheduleBell(f, 0.35, this.ctx.currentTime + i * 0.13, this.master),
    );
  }

  playSfxFormation(): void {
    void this.ctx.resume();
    // One long brown-noise whoosh with a bandpass sweep — covers the full 5s
    // window where all cards home to their sphere positions.
    const duration = 5;
    const rate     = this.ctx.sampleRate;
    const buf      = this.ctx.createBuffer(1, Math.ceil(rate * duration), rate);
    const data     = buf.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      prev = data[i] = ((prev + 0.02 * w) / 1.02) * 3.5;
    }

    const src  = this.ctx.createBufferSource();
    src.buffer = buf;

    const filt = this.ctx.createBiquadFilter();
    filt.type  = 'bandpass';
    filt.Q.value = 1.8;
    const t = this.ctx.currentTime;
    filt.frequency.setValueAtTime(250, t);
    filt.frequency.exponentialRampToValueAtTime(2800, t + duration * 0.65);
    filt.frequency.exponentialRampToValueAtTime(550,  t + duration);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.28, t + 0.5);
    env.gain.setValueAtTime(0.22, t + duration - 0.8);
    env.gain.linearRampToValueAtTime(0, t + duration);

    src.connect(filt);
    filt.connect(env);
    env.connect(this.master);
    src.start();
    src.stop(t + duration);
  }

  playSfxFlipPhase(): void {
    void this.ctx.resume();
    // Amplitude-modulated white noise with an accelerating riffle rate — one
    // sustained sound covers the full 3-second staggered flip wave.
    const duration = 3;
    const rate     = this.ctx.sampleRate;
    const buf      = this.ctx.createBuffer(1, Math.ceil(rate * duration), rate);
    const data     = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t      = i / rate;
      const riffle = Math.abs(Math.sin(Math.PI * (10 + t * 10) * t));
      data[i]      = (Math.random() * 2 - 1) * riffle;
    }

    const src  = this.ctx.createBufferSource();
    src.buffer = buf;

    const filt   = this.ctx.createBiquadFilter();
    filt.type    = 'bandpass';
    filt.frequency.value = 2200;
    filt.Q.value = 1.0;

    const env = this.ctx.createGain();
    const t   = this.ctx.currentTime;
    env.gain.setValueAtTime(0.38, t);
    env.gain.linearRampToValueAtTime(0, t + duration);

    src.connect(filt);
    filt.connect(env);
    env.connect(this.master);
    src.start();
    src.stop(t + duration);
  }

  playSfxCardSelect(): void {
    void this.ctx.resume();
    const t = this.ctx.currentTime;
    this.scheduleBell(1318.5, 0.45, t,        this.master); // E6 — clear, crystalline
    this.scheduleBell(1975.5, 0.22, t + 0.04, this.master); // B6 — high shimmer
  }

  playSfxScatter(): void {
    void this.ctx.resume();
    // Descending bell cascade over 0.6s, then high shimmer noise fades out
    [1046.5, 880, 784, 659, 523, 440, 392].forEach((f, i) =>
      this.scheduleBell(f, Math.max(0.3 - i * 0.03, 0.06), this.ctx.currentTime + i * 0.09, this.master),
    );

    const duration = 3;
    const rate     = this.ctx.sampleRate;
    const buf      = this.ctx.createBuffer(1, Math.ceil(rate * duration), rate);
    const data     = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src  = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type  = 'highpass';
    filt.frequency.value = 5500;
    const env = this.ctx.createGain();
    const t   = this.ctx.currentTime;
    env.gain.setValueAtTime(0.1, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filt);
    filt.connect(env);
    env.connect(this.master);
    src.start();
    src.stop(t + duration);
  }

  // ─── State dispatcher ────────────────────────────────────────────────────────

  onStateChange(state: TrickState): void {
    switch (state) {
      case 'setup':
        this.stopMusic(2);
        break;

      case 'forming':
        this.playSfxTrickStart();
        this.startAmbient(0.7); // begin after the rising sting settles
        this.playSfxFormation();
        break;

      case 'cards-flipping':
        this.playSfxFlipPhase();
        break;

      case 'participant-selection':
        this.setMode('tension');
        break;

      case 'sphere-aligned':
        // tension music continues unchanged
        break;

      case 'final-flip':
        this.playSfxFlipPhase();
        this.setMode('ambient');
        break;

      case 'scatter':
        this.playSfxScatter();
        this.stopMusic(3);
        break;
    }
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  dispose(): void {
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }
}

// ─── React hook ──────────────────────────────────────────────────────────────

export function useAudioManager(): void {
  const role      = useGameStore((s) => s.role);
  const socket    = useSocket();
  const engineRef = useRef<AudioEngine | null>(null);

  // Create + wire the engine for audible roles; destroy on role change or unmount
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

  // Card-selection chime — driven by socket so the sound fires on the event
  // rather than polling the store, keeping it tight to the interaction moment
  useEffect(() => {
    if (!socket || (role !== 'audience' && role !== 'spectator')) return;
    const handle = () => engineRef.current?.playSfxCardSelect();
    socket.on('card-selected', handle);
    return () => { socket.off('card-selected', handle); };
  }, [socket, role]);
}
