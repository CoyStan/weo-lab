"use client";

// Sound for the campaign.
// - Effects: short CC0 samples from Kenney's Interface Sounds pack (public/audio).
// - Music: public-domain piano and guitar recordings (public/music, see CREDITS.md),
//   streamed through an <audio> element, or a sea and music box synthesised here.
// - Stingers (win, lose, shock, star) are synthesised so their mood is deliberate.
// Browsers only allow audio after a user gesture, so nothing starts before a click.

import { useSettings, type Settings, type TrackId } from "./settings";

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

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Major and minor pentatonic scales (semitones from the root), for calm and tense moods.
const CALM = [0, 2, 4, 7, 9, 12, 14, 16];
const TENSE = [0, 3, 5, 7, 10, 12, 15];
const ROOT_HZ = 293.66; // D4
/** Recorded music sits a little under full volume so the interface stays audible. */
const MUSIC_HEADROOM = 0.6;

class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private seaBus: GainNode | null = null;
  private boxBus: GainNode | null = null;
  private echo: DelayNode | null = null;
  private buffers = new Map<Effect, AudioBuffer>();
  private loading = new Map<Effect, Promise<AudioBuffer | null>>();
  private last = new Map<Effect, number>();
  private ambient: { stop: () => void } | null = null;
  private noteTimer = 0;
  private droneGain: GainNode | null = null;
  private tense = false;
  private player: HTMLAudioElement | null = null;
  private playerTrack: TrackId | null = null;
  private wantMusic = false;
  private subscribed = false;

  private get s(): Settings {
    return useSettings.getState();
  }

  /** Create or resume the audio context. Call from a click or key handler. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.subscribed) {
      this.subscribed = true;
      useSettings.subscribe(() => this.apply());
    }
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.connect(this.master);
      this.seaBus = ctx.createGain();
      this.seaBus.connect(this.master);
      this.boxBus = ctx.createGain();
      this.boxBus.connect(this.master);
      // A soft echo gives the synthesised notes some room.
      const echo = ctx.createDelay(1);
      echo.delayTime.value = 0.32;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.28;
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      echo.connect(feedback).connect(echo);
      echo.connect(wet).connect(this.boxBus);
      this.echo = echo;
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx) return;
        if (document.hidden) {
          void this.ctx.suspend();
          this.player?.pause();
        } else {
          void this.ctx.resume();
          this.apply();
        }
      });
      this.apply();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /** Bring every volume, the track and the sea in line with the settings. */
  apply() {
    const s = this.s;
    const ctx = this.ctx;
    if (ctx && this.master && this.sfxBus && this.seaBus && this.boxBus) {
      const at = ctx.currentTime;
      this.master.gain.setTargetAtTime(s.muted ? 0 : 0.85, at, 0.08);
      this.sfxBus.gain.setTargetAtTime(s.effectsVolume, at, 0.05);
      const seaOn = this.wantMusic && (s.sea || s.track === "sea");
      this.seaBus.gain.setTargetAtTime(seaOn ? s.musicVolume * (s.track === "sea" ? 1 : 0.6) : 0, at, 0.6);
      this.boxBus.gain.setTargetAtTime(this.wantMusic && s.track === "sea" ? s.musicVolume : 0, at, 0.6);
    }
    this.syncPlayer();
  }

  private syncPlayer() {
    if (typeof window === "undefined") return;
    const s = this.s;
    const recorded = s.track !== "sea" && s.track !== "none";
    const shouldPlay = this.wantMusic && recorded && !s.muted && s.musicVolume > 0 && !document.hidden;
    if (!shouldPlay) {
      this.player?.pause();
      return;
    }
    if (!this.player) {
      this.player = new Audio();
      this.player.loop = true;
      this.player.preload = "auto";
    }
    if (this.playerTrack !== s.track) {
      this.playerTrack = s.track;
      this.player.src = `${base}/music/${s.track}.mp3`;
    }
    this.player.volume = Math.min(1, s.musicVolume * MUSIC_HEADROOM);
    if (this.player.paused) void this.player.play().catch(() => undefined);
  }

  /** Play a track briefly from the settings page even if the game isn't in a mission. */
  preview(track: TrackId) {
    this.unlock();
    this.wantMusic = true;
    useSettings.getState().set({ track });
    this.startAmbient();
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
    const s = this.s;
    if (s.muted || s.effectsVolume === 0) return;
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
    if (this.echo && bus === this.boxBus) g.connect(this.echo);
    osc.start(when);
    overtone.start(when);
    osc.stop(when + length + 0.05);
    overtone.stop(when + length + 0.05);
  }

  /** Short melodic stingers, on the effects bus. */
  stinger(kind: "win" | "lose" | "shock" | "star") {
    const s = this.s;
    if (s.muted || s.effectsVolume === 0) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime + 0.05;
    const hz = (semi: number, root = ROOT_HZ) => root * Math.pow(2, semi / 12);
    if (kind === "win") [0, 4, 7, 12, 16].forEach((x, i) => this.note(hz(x), t + i * 0.11, 1.1, 0.16, this.sfxBus!, "triangle"));
    if (kind === "lose") [7, 3, 0, -5].forEach((x, i) => this.note(hz(x, ROOT_HZ / 2), t + i * 0.2, 1.3, 0.17, this.sfxBus!, "triangle"));
    if (kind === "shock") [0, 1].forEach((x, i) => this.note(hz(x, ROOT_HZ / 2), t + i * 0.16, 0.9, 0.14, this.sfxBus!, "triangle"));
    if (kind === "star") this.note(hz(24), t, 0.7, 0.12, this.sfxBus, "sine");
  }

  /** Start the background: the chosen track, the sea, and (for the generated track) the music box. */
  startAmbient() {
    this.unlock();
    this.wantMusic = true;
    const ctx = this.ctx;
    if (!ctx || !this.seaBus || !this.boxBus) return;
    if (!this.ambient) {
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
      noise.connect(lowpass).connect(sea).connect(this.seaBus);
      noise.start();
      swell.start();

      // A quiet drone under the music box that fades in only when goals are at risk.
      const drone = ctx.createOscillator();
      drone.type = "sine";
      drone.frequency.value = ROOT_HZ / 4;
      const droneGain = ctx.createGain();
      droneGain.gain.value = this.tense ? 0.035 : 0;
      drone.connect(droneGain).connect(this.boxBus);
      drone.start();
      this.droneGain = droneGain;

      const schedule = () => {
        if (!this.ctx || !this.boxBus) return;
        if (this.s.track === "sea") {
          const scale = this.tense ? TENSE : CALM;
          const semi = scale[Math.floor(Math.random() * scale.length)];
          const when = this.ctx.currentTime + 0.05;
          this.note(ROOT_HZ * Math.pow(2, semi / 12), when, 2.4, 0.05, this.boxBus);
          if (Math.random() < 0.35) this.note(ROOT_HZ * Math.pow(2, (scale[Math.floor(Math.random() * scale.length)] - 12) / 12), when + 0.18, 2.8, 0.035, this.boxBus);
        }
        this.noteTimer = window.setTimeout(schedule, (this.tense ? 1800 : 2600) + Math.random() * 3200);
      };
      this.noteTimer = window.setTimeout(schedule, 1200);

      this.ambient = {
        stop: () => {
          window.clearTimeout(this.noteTimer);
          const end = ctx.currentTime + 1.2;
          sea.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
          droneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
          noise.stop(end);
          swell.stop(end);
          drone.stop(end);
          this.droneGain = null;
        },
      };
    }
    this.apply();
  }

  stopAmbient() {
    this.wantMusic = false;
    this.ambient?.stop();
    this.ambient = null;
    this.apply();
  }

  setTense(tense: boolean) {
    if (tense === this.tense) return;
    this.tense = tense;
    if (this.droneGain && this.ctx) this.droneGain.gain.setTargetAtTime(tense ? 0.035 : 0, this.ctx.currentTime, 1.5);
  }
}

export const sound = new Sound();
