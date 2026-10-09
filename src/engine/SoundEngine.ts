export interface AudioSettings {
  masterVolume: number; // 0 to 1
  sfxVolume: number;    // 0 to 1
  crowdVolume: number;  // 0 to 1
  uiVolume: number;     // 0 to 1
  muted: boolean;
}

class SoundEngineService {
  private ctx: AudioContext | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;
  public settings: AudioSettings = {
    masterVolume: 0.8,
    sfxVolume: 0.85,
    crowdVolume: 0.75,
    uiVolume: 0.7,
    muted: false,
  };

  private getContext(): AudioContext | null {
    if (this.settings.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    if (this.ambienceGain && this.ctx) {
      const vol = this.settings.muted ? 0 : this.settings.masterVolume * this.settings.crowdVolume * 0.14;
      this.ambienceGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
    }
  }

  public startStadiumAmbience() {
    const ctx = this.getContext();
    if (!ctx || this.ambienceSource) return;

    try {
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink-brownish noise for warm stadium murmur
        data[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = data[i];
        data[i] *= 2.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 480;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      const vol = this.settings.muted ? 0 : this.settings.masterVolume * this.settings.crowdVolume * 0.14;
      gain.gain.value = vol;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      this.ambienceSource = source;
      this.ambienceGain = gain;
    } catch {
      // Ignore audio autoplay block until user interaction
    }
  }

  public stopStadiumAmbience() {
    if (this.ambienceSource) {
      try {
        this.ambienceSource.stop();
        this.ambienceSource.disconnect();
      } catch {
        // Ignore
      }
      this.ambienceSource = null;
      this.ambienceGain = null;
    }
  }

  public playKick(power = 0.7, isCurve = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gainLevel = this.settings.masterVolume * this.settings.sfxVolume * Math.min(1, 0.4 + power * 0.6);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCurve ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(135 + power * 45, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.14);

    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playPass() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gainLevel = this.settings.masterVolume * this.settings.sfxVolume * 0.45;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);

    gain.gain.setValueAtTime(gainLevel, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playPostHit() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gainLevel = this.settings.masterVolume * this.settings.sfxVolume * 0.65;

    // Metallic crossbar ring
    [420, 790, 1180].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainLevel / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  public playNetSwish() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.22);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.value = this.settings.masterVolume * this.settings.sfxVolume * 0.4;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  public playWhistle(type: 'kickoff' | 'foul' | 'fulltime' = 'kickoff') {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gainLevel = this.settings.masterVolume * this.settings.sfxVolume * 0.32;

    const playBlast = (startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const gain = ctx.createGain();

      // Pea whistle trill around 2850 Hz
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2850, now + startOffset);

      mod.type = 'sine';
      mod.frequency.setValueAtTime(48, now + startOffset);
      modGain.gain.setValueAtTime(140, now + startOffset);

      mod.connect(modGain);
      modGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.linearRampToValueAtTime(gainLevel, now + startOffset + 0.03);
      gain.gain.setValueAtTime(gainLevel, now + startOffset + duration - 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + startOffset);
      mod.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.01);
      mod.stop(now + startOffset + duration + 0.01);
    };

    if (type === 'kickoff') {
      playBlast(0, 0.45);
    } else if (type === 'foul') {
      playBlast(0, 0.28);
    } else {
      playBlast(0, 0.25);
      playBlast(0.32, 0.25);
      playBlast(0.64, 0.65);
    }
  }

  public playGoalRoar() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.playNetSwish();

    // Roaring crowd noise burst
    const duration = 2.6;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.96 * b0 + 0.04 * white;
      data[i] = b0 * 3.2;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(550, now);
    filter.frequency.linearRampToValueAtTime(950, now + 0.5);
    filter.frequency.linearRampToValueAtTime(600, now + duration);

    const gain = ctx.createGain();
    const peak = this.settings.masterVolume * this.settings.crowdVolume * 0.65;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.25);
    gain.gain.setValueAtTime(peak, now + 1.4);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);

    // Celebratory stadium brass chord
    [261.63, 329.63, 392.0, 523.25].forEach((freq) => {
      const osc = ctx.createOscillator();
      const cGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + 0.15);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1200;

      cGain.gain.setValueAtTime(0.001, now + 0.15);
      cGain.gain.linearRampToValueAtTime(this.settings.masterVolume * this.settings.sfxVolume * 0.08, now + 0.35);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);

      osc.connect(lp);
      lp.connect(cGain);
      cGain.connect(ctx.destination);
      osc.start(now + 0.15);
      osc.stop(now + 1.95);
    });
  }

  public playCrowdReaction(type: 'cheer' | 'ooh') {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 0.9;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(type === 'cheer' ? 750 : 420, now);

    const gain = ctx.createGain();
    const peak = this.settings.masterVolume * this.settings.crowdVolume * 0.28;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  }

  public playUIClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.045);

    gain.gain.setValueAtTime(this.settings.masterVolume * this.settings.uiVolume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playPackOpen() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(this.settings.masterVolume * this.settings.sfxVolume * 0.18, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.6);
    });
  }
}

export const SoundEngine = new SoundEngineService();
