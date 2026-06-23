import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSocket } from '@/sockets/SocketProvider';
import { useTrickStore } from '@/store/useTrickStore';
import type { TrickState } from '@/types/trick';

// Sparse pentatonic chimes — C5 … E6 spread across two octaves.
// Same scale throughout; the music never switches character.
const CHIME_FREQS = [523.25, 659.25, 783.99, 880, 1046.5, 1318.5];

// ─── AudioEngine ─────────────────────────────────────────────────────────────
// All Web Audio state lives here. The React hook is just lifecycle glue.

class AudioEngine {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly musicBus: GainNode;

  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private nextNoteTime = 0;
  private running = false;

  private static readonly LOOK_AHEAD_S = 0.1;
  private static readonly TICK_MS      = 30;
  // Note gap range in seconds — very sparse so it sits well under the SFX
  private static readonly GAP_MIN      = 1.2;
  private static readonly GAP_MAX      = 3.5;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);

    // Browsers suspend AudioContext until a user gesture has occurred.
    // By the time 'forming' fires the audience/spectator will have already
    // interacted with the page to reach this screen.
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
  }

  // ─── Bell synthesis ───────────────────────────────────────────────────────
  // Three inharmonic partials approximate the sound of a struck bell or
  // crotale.  Higher partials decay faster, matching real bell physics.

  private bell(freq: number, gain: number, when: number, dest: AudioNode): void {
    const partials: [ratio: number, relGain: number, decay: number][] = [
      [1,     1,    2.0],
      [2.756, 0.4,  0.9],
      [5.404, 0.15, 0.4],
    ];
    for (const [ratio, relGain, decay] of partials) {
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      env.gain.setValueAtTime(0, when);
      env.gain.linearRampToValueAtTime(gain * relGain, when + 0.003);
      env.gain.exponentialRampToValueAtTime(0.0001, when + decay);
      osc.connect(env);
      env.connect(dest);
      osc.start(when);
      osc.stop(when + decay + 0.02);
    }
  }

  // ─── Ambient chime scheduler ──────────────────────────────────────────────
  // Uses the AudioContext clock for glitch-free timing; setTimeout just
  // keeps the look-ahead window filled.

  private tick(): void {
    if (!this.running) { this.schedulerTimer = null; return; }

    const horizon = this.ctx.currentTime + AudioEngine.LOOK_AHEAD_S;
    while (this.nextNoteTime < horizon) {
      let freq = CHIME_FREQS[Math.floor(Math.random() * CHIME_FREQS.length)];
      // Occasional octave drop for depth without changing the key
      if (Math.random() < 0.2) freq *= 0.5;

      const pan = this.ctx.createStereoPanner();
      pan.pan.value = (Math.random() - 0.5) * 0.55;
      pan.connect(this.musicBus);

      this.bell(freq, 0.16, this.nextNoteTime, pan);

      const gap = AudioEngine.GAP_MIN + Math.random() * (AudioEngine.GAP_MAX - AudioEngine.GAP_MIN);
      this.nextNoteTime += gap;
    }

    this.schedulerTimer = setTimeout(() => this.tick(), AudioEngine.TICK_MS);
  }

  startMusic(): void {
    void this.ctx.resume();
    this.running = true;
    this.nextNoteTime = this.ctx.currentTime + 0.3;

    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(1, now + 3.5); // gentle fade-in

    if (this.schedulerTimer === null) this.tick();
  }

  stopMusic(fadeTime = 4): void {
    this.running = false;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(0, now + fadeTime);
  }

  // ─── Foley SFX ────────────────────────────────────────────────────────────
  // Each sound represents an entire animation phase, not individual cards.

  // Cards homing to sphere positions (~5 s) — soft paper-on-air rustle that
  // rises and settles.  Brown noise keeps it warm and non-metallic.
  sfxCardFormation(): void {
    void this.ctx.resume();
    const duration = 5;
    const rate     = this.ctx.sampleRate;
    const buf      = this.ctx.createBuffer(1, Math.ceil(rate * duration), rate);
    const data     = buf.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      prev = data[i] = (prev + 0.04 * white) / 1.04;  // brown-noise integrator
    }

    const src  = this.ctx.createBufferSource();
    src.buffer = buf;

    // Bandpass sweeps upward then eases back — like cards arcing through air
    const filt = this.ctx.createBiquadFilter();
    filt.type  = 'bandpass';
    filt.Q.value = 2.2;
    const t = this.ctx.currentTime;
    filt.frequency.setValueAtTime(300, t);
    filt.frequency.exponentialRampToValueAtTime(1800, t + duration * 0.6);
    filt.frequency.exponentialRampToValueAtTime(600,  t + duration);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0,    t);
    env.gain.linearRampToValueAtTime(0.32, t + 0.8);
    env.gain.setValueAtTime(0.26, t + duration - 1.2);
    env.gain.linearRampToValueAtTime(0, t + duration);

    src.connect(filt); filt.connect(env); env.connect(this.master);
    src.start(); src.stop(t + duration);
  }

  // Staggered flip wave (~3 s) — amplitude-modulated noise at an accelerating
  // riffle rate gives the physical feel of cards flicking one after another.
  sfxCardRiffle(): void {
    void this.ctx.resume();
    const duration = 3;
    const rate     = this.ctx.sampleRate;
    const buf      = this.ctx.createBuffer(1, Math.ceil(rate * duration), rate);
    const data     = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t      = i / rate;
      // Riffle rate accelerates from ~8 cards/s to ~20 cards/s over the wave
      const riffle = Math.abs(Math.sin(Math.PI * (8 + t * 8) * t));
      data[i]      = (Math.random() * 2 - 1) * riffle;
    }

    const src  = this.ctx.createBufferSource();
    src.buffer = buf;

    // Papery bandpass — card stock lives around 1–4 kHz
    const filt = this.ctx.createBiquadFilter();
    filt.type  = 'bandpass';
    filt.frequency.value = 1800;
    filt.Q.value = 0.9;

    const env = this.ctx.createGain();
    const t   = this.ctx.currentTime;
    env.gain.setValueAtTime(0.28, t);
    env.gain.linearRampToValueAtTime(0, t + duration);

    src.connect(filt); filt.connect(env); env.connect(this.master);
    src.start(); src.stop(t + duration);
  }

  // Single card tapped — one bright bell chime, quiet and precise
  sfxCardSelect(): void {
    void this.ctx.resume();
    const t = this.ctx.currentTime;
    this.bell(1318.5, 0.38, t,        this.master); // E6
    this.bell(1975.5, 0.16, t + 0.04, this.master); // B6 shimmer
  }

  // Cards flying outward in a wave (~3 s) — a broadening whoosh, like a
  // single gust that expands and dissipates.
  sfxCardScatter(): void {
    void this.ctx.resume();
    const duration = 3.5;
    const rate     = this.ctx.sampleRate;
    const buf      = this.ctx.createBuffer(1, Math.ceil(rate * duration), rate);
    const data     = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const src  = this.ctx.createBufferSource();
    src.buffer = buf;

    // Bandpass sweeps up then opens out to a highpass shimmer
    const filt = this.ctx.createBiquadFilter();
    filt.type  = 'bandpass';
    filt.Q.value = 0.8;
    const t = this.ctx.currentTime;
    filt.frequency.setValueAtTime(400, t);
    filt.frequency.exponentialRampToValueAtTime(4500, t + duration);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.22, t + 0.2);
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
        this.sfxCardRiffle();
        break;

      // Ambient music continues unchanged through selection and sphere phases
      case 'participant-selection':
      case 'sphere-aligned':
        break;

      case 'final-flip':
        this.sfxCardRiffle();
        break;

      case 'scatter':
        this.sfxCardScatter();
        this.stopMusic(4);
        break;
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

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

  // Card-select chime is driven by the socket event rather than the store
  // so it fires tight to the actual interaction, not a derived state poll.
  useEffect(() => {
    if (!socket || (role !== 'audience' && role !== 'spectator')) return;
    const handle = () => engineRef.current?.sfxCardSelect();
    socket.on('card-selected', handle);
    return () => { socket.off('card-selected', handle); };
  }, [socket, role]);
}
