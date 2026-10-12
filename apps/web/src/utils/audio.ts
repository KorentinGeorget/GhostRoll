// Synthesized Web Audio API sound generator for Ghostroll (Zero external asset dependencies)

class SoundFX {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Continuous rolling synth
  private rollingGain: GainNode | null = null;
  private rollingFilter: BiquadFilterNode | null = null;
  private rollingSource: AudioBufferSourceNode | null = null;
  private isRollingSetup: boolean = false;

  private lastImpactTime: number = 0;
  private lastBoostTime: number = 0;
  private lastJumpPadTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('gr_muted');
      this.isMuted = storedMute === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public get muted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('gr_muted', String(this.isMuted));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  private setupRolling(): void {
    if (this.isRollingSetup || !this.ctx || !this.masterGain) return;
    this.isRollingSetup = true;

    // Create 2 seconds of pink/brownian noise for rolling contact
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.95 * b1 + white * 0.1;
      b2 = 0.85 * b2 + white * 0.2;
      output[i] = (b0 + b1 + b2) * 0.55;
    }

    this.rollingSource = this.ctx.createBufferSource();
    this.rollingSource.buffer = noiseBuffer;
    this.rollingSource.loop = true;

    this.rollingFilter = this.ctx.createBiquadFilter();
    this.rollingFilter.type = 'bandpass';
    this.rollingFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
    this.rollingFilter.Q.setValueAtTime(2.4, this.ctx.currentTime);

    this.rollingGain = this.ctx.createGain();
    this.rollingGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.rollingSource.connect(this.rollingFilter);
    this.rollingFilter.connect(this.rollingGain);
    this.rollingGain.connect(this.masterGain);

    try {
      this.rollingSource.start();
    } catch {
      // Autoplay restriction fallback
    }
  }

  /**
   * Continuous rolling hum tracking ball speed and ground contact.
   */
  public updateRolling(speed: number, isGrounded: boolean): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted) return;

    if (!this.isRollingSetup) {
      this.setupRolling();
    }
    if (!this.rollingGain || !this.rollingFilter) return;

    const t = ctx.currentTime;
    if (!isGrounded || speed < 0.3) {
      this.rollingGain.gain.setTargetAtTime(0, t, 0.08);
      return;
    }

    const normalized = Math.min(1.0, speed / 14.0);
    const targetGain = 0.05 + normalized * 0.3;
    const targetFreq = 120 + normalized * 520;

    this.rollingGain.gain.setTargetAtTime(targetGain, t, 0.05);
    this.rollingFilter.frequency.setTargetAtTime(targetFreq, t, 0.05);
  }

  /**
   * Resonant bumper bounce chime
   */
  public playBumper(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(1160, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Jump pop sound
   */
  public playJump(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Trackmania Boost Pad turbo whoosh!
   */
  public playBoost(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const nowMs = performance.now();
    if (nowMs - this.lastBoostTime < 280) return;
    this.lastBoostTime = nowMs;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(3400, now + 0.24);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.44);
  }

  /**
   * Trackmania Super-Jump Pad launch sound
   */
  public playJumpPad(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const nowMs = performance.now();
    if (nowMs - this.lastJumpPadTime < 280) return;
    this.lastJumpPadTime = nowMs;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.35);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.38);
  }

  /**
   * Trackmania Sector Checkpoint Chime
   */
  public playCheckpoint(isAhead: boolean = true): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const f1 = isAhead ? 880 : 587.33; // A5 vs D5
    const f2 = isAhead ? 1318.51 : 523.25; // E6 vs C5

    [f1, f2].forEach((freq, idx) => {
      if (!ctx || !this.masterGain) return;
      const noteTime = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.46);
    });
  }

  /**
   * Physical landing / collision impact thump
   */
  public playImpact(intensity: number = 1.0): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const nowMs = performance.now();
    if (nowMs - this.lastImpactTime < 80) return;
    this.lastImpactTime = nowMs;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const clampedIntensity = Math.min(2.0, Math.max(0.2, intensity));
    const startFreq = 140 + clampedIntensity * 40;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

    const impactVol = Math.min(0.65, 0.18 + clampedIntensity * 0.25);
    gain.gain.setValueAtTime(impactVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  /**
   * Harmonious major arpeggio victory fanfare
   */
  public playVictory(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    freqs.forEach((freq, i) => {
      if (!ctx || !this.masterGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + i * 0.09;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  }

  /**
   * Downward fall slide whoosh
   */
  public playFall(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.45);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.5);
  }
}

export const soundFX = new SoundFX();
