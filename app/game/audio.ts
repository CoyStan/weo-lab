"use client";

// Sound for the campaign. Interface effects are short CC0 samples from Kenney's
// Interface Sounds pack (public/audio). The ambience and the win/lose stingers
// are synthesised here with the Web Audio API, so their mood is deliberate and
// there is nothing large to download. Browsers only allow audio after a user
// gesture, so the context is created on the first click.

export type SoundMode = "on" | "effects" | "off";
export type Effect = "tick" | "select" | "toggle" | "confirm" | "choose" | "open" | "alert" | "back" | "pluck";

const FILES: Record<Effect, { file: string; gain: number }> = {
  tick: { file: "tick_002", gain: 0.25 },
  select: { file: "select_002", gain: 0.45 },
  toggle: { file: "toggle_002", gain: 0.35 },
  confirm: { file: "confirmation_001", gain: 0.5 },
  choose: { file: "confirmation_003", gain: 0.5 },
  open: { file: "open_002", gain: 0.45 },
  alert: { file: "bong_001", gain: 0.55 },
  back: { file: "back_002", gain: 0.45 },
  pluck: { file: "pluck_001", gain: 0.5 },
};

/** Minimum gap between repeats of one effect, so slider drags don't buzz. */
const MIN_GAP_MS: Partial<Record<Effect, number>> = { tick: 70, select: 60 };

const STORAGE_KEY = "weo-lab.sound";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Major and minor pentatonic scales (semitones from the root), for calm and tense moods.
const CALM = [0, 2, 4, 7, 9, 12, 14, 16];
const TENSE = [0, 3, 5, 7, 10, 12, 15];
const ROOT_HZ = 293.66; // D4

class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private echo: DelayNode | null = null;
  private buffers = new Map<Effect, AudioBuffer>();
  private loading = new Map<Effect, Promise<AudioBuffer | null>>();
  private last = new Map<Effect, number>();
  private ambient: { stop: () => void } | null = null;
  private noteTimer = 0;
  private droneGain: GainNode | null = null;
  private tense = false;
  private listeners = new Set<(mode: SoundMode) => void>();
  mode: SoundMode = "on";

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "on" || saved === "effects" || saved === "off") this.mode = saved;
    } catch {
      // Storage blocked: default to sound on.
    }
  }

  subscribe(fn: (mode: SoundMode) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  setMode(mode: SoundMode) {
    this.mode = mode;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(mode === "on" ? 1 : 0, this.ctx.currentTime, 0.4);
    if (this.sfxBus && this.ctx) this.sfxBus.gain.setTargetAtTime(mode === "off" ? 0 : 1, this.ctx.currentTime, 0.05);
    this.listeners.forEach((fn) => fn(mode));
  }

  /** Create or resume the audio context. Call from a click or key handler. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = this.mode === "off" ? 0 : 1;
      this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.mode === "on" ? 1 : 0;
      this.musicBus.connect(this.master);
      // A soft echo gives the synthesised notes some room.
      const echo = ctx.createDelay(1);
      echo.delayTime.value = 0.32;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.28;
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      echo.connect(feedback).connect(echo);
      echo.connect(wet).connect(this.musicBus);
      this.echo = echo;
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else void this.ctx.resume();
      });
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private load(effect: Effect): Promise<AudioBuffer | null> {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve(null);
    const cached = this.buffers.get(effect);
    if (cached) return Promise.resolve(cached);
    let pending = this.loading.get(effect);
    if (!pending) {
      pending = fetch(`${base}/audio/${FILES[effect].file}.mp3`)
        .then((r) => r.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .then((buf) => {
          this.buffers.set(effect, buf);
          return buf;
        })
        .catch(() => null);
      this.loading.set(effect, pending);
    }
    return pending;
  }

  /** Warm the cache so the first click isn't silent. */
  preload() {
    (Object.keys(FILES) as Effect[]).forEach((e) => void this.load(e));
  }

  play(effect: Effect, volume = 1) {
    if (this.mode === "off") return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const now = performance.now();
    const gap = MIN_GAP_MS[effect] ?? 0;
    if (now - (this.last.get(effect) ?? 0) < gap) return;
    this.last.set(effect, now);
    void this.load(effect).then((buf) => {
      if (!buf || !this.sfxBus) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = FILES[effect].gain * volume;
      src.connect(g).connect(this.sfxBus);
      src.start();
    });
  }

  /** One soft mallet note: a sine with a quick attack and a long tail. */
  private note(freq: number, when: number, length: number, level: number, bus: AudioNode, type: OscillatorType = "sine") {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const overtone = ctx.createOscillator();
    overtone.type = "sine";
    overtone.frequency.value = freq * 4;
    const g = ctx.createGain();
    const og = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(level, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + length);
    og.gain.setValueAtTime(level * 0.18, when);
    og.gain.exponentialRampToValueAtTime(0.0001, when + 0.25);
    osc.connect(g);
    overtone.connect(og).connect(g);
    g.connect(bus);
    if (this.echo && bus === this.musicBus) g.connect(this.echo);
    osc.start(when);
    overtone.start(when);
    osc.stop(when + length + 0.05);
    overtone.stop(when + length + 0.05);
  }

  /** Short melodic stingers. They play through the effects bus so "effects only" keeps them. */
  stinger(kind: "win" | "lose" | "shock" | "star") {
    if (this.mode === "off") return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime + 0.05;
    const hz = (semi: number, root = ROOT_HZ) => root * Math.pow(2, semi / 12);
    if (kind === "win") [0, 4, 7, 12, 16].forEach((s, i) => this.note(hz(s), t + i * 0.11, 1.1, 0.16, this.sfxBus!, "triangle"));
    if (kind === "lose") [7, 3, 0, -5].forEach((s, i) => this.note(hz(s, ROOT_HZ / 2), t + i * 0.2, 1.3, 0.17, this.sfxBus!, "triangle"));
    if (kind === "shock") [0, 1].forEach((s, i) => this.note(hz(s, ROOT_HZ / 2), t + i * 0.16, 0.9, 0.14, this.sfxBus!, "triangle"));
    if (kind === "star") this.note(hz(24), t, 0.7, 0.12, this.sfxBus, "sine");
  }

  /** Waves on the shore and an occasional music-box note. Tense mode adds a low drone and a minor scale. */
  startAmbient() {
    this.unlock();
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || this.ambient) return;

    // Brown noise, low-passed, swelling slowly: the sea.
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 420;
    const sea = ctx.createGain();
    sea.gain.value = 0.05;
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.09;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.035;
    swell.connect(swellDepth).connect(sea.gain);
    noise.connect(lowpass).connect(sea).connect(this.musicBus);
    noise.start();
    swell.start();

    // A quiet drone that fades in only when goals are at risk.
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = ROOT_HZ / 4;
    const droneGain = ctx.createGain();
    droneGain.gain.value = this.tense ? 0.035 : 0;
    drone.connect(droneGain).connect(this.musicBus);
    drone.start();
    this.droneGain = droneGain;

    const schedule = () => {
      if (!this.ctx || !this.musicBus) return;
      const scale = this.tense ? TENSE : CALM;
      const semi = scale[Math.floor(Math.random() * scale.length)];
      const when = this.ctx.currentTime + 0.05;
      this.note(ROOT_HZ * Math.pow(2, semi / 12), when, 2.4, 0.05, this.musicBus);
      if (Math.random() < 0.35) this.note(ROOT_HZ * Math.pow(2, (scale[Math.floor(Math.random() * scale.length)] - 12) / 12), when + 0.18, 2.8, 0.035, this.musicBus);
      this.noteTimer = window.setTimeout(schedule, (this.tense ? 1800 : 2600) + Math.random() * 3200);
    };
    this.noteTimer = window.setTimeout(schedule, 1200);

    this.ambient = {
      stop: () => {
        window.clearTimeout(this.noteTimer);
        const end = ctx.currentTime + 1.2;
        sea.gain.cancelScheduledValues(ctx.currentTime);
        sea.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
        droneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
        noise.stop(end);
        swell.stop(end);
        drone.stop(end);
        this.droneGain = null;
      },
    };
  }

  stopAmbient() {
    this.ambient?.stop();
    this.ambient = null;
  }

  setTense(tense: boolean) {
    if (tense === this.tense) return;
    this.tense = tense;
    if (this.droneGain && this.ctx) this.droneGain.gain.setTargetAtTime(tense ? 0.035 : 0, this.ctx.currentTime, 1.5);
  }
}

export const sound = new Sound();
