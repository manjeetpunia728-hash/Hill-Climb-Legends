import type { VehicleSpec } from "./types";

export type SoundCue =
  | "coin"
  | "fuel"
  | "stunt"
  | "milestone"
  | "low_fuel"
  | "crash"
  | "upgrade"
  | "click"
  | "land";

export class HillAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private oscMain?: OscillatorNode;
  private oscSub?: OscillatorNode;
  private oscTurbo?: OscillatorNode;
  private filter?: BiquadFilterNode;
  private engineGain?: GainNode;
  private turboGain?: GainNode;
  private enabled = true;
  private initialized = false;
  private coinCombo = 0;
  private lastCoinTime = 0;
  private currentProfile: VehicleSpec["engineSound"] = "diesel_suv";

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) this.ensureContext();
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(on ? 0.28 : 0, this.ctx.currentTime, 0.03);
    }
  }

  unlock() {
    if (!this.enabled) return;
    this.ensureContext();
    if (this.ctx?.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
  }

  private ensureContext() {
    if (this.initialized || typeof AudioContext === "undefined") return;
    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }

    const master = ctx.createGain();
    const engineGain = ctx.createGain();
    const turboGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const oscMain = ctx.createOscillator();
    const oscSub = ctx.createOscillator();
    const oscTurbo = ctx.createOscillator();

    master.gain.value = this.enabled ? 0.28 : 0;
    engineGain.gain.value = 0;
    turboGain.gain.value = 0;

    filter.type = "lowpass";
    filter.frequency.value = 180;
    filter.Q.value = 2.2;

    oscMain.type = "sawtooth";
    oscSub.type = "triangle";
    oscTurbo.type = "sine";

    oscMain.frequency.value = 46;
    oscSub.frequency.value = 23;
    oscTurbo.frequency.value = 520;

    oscMain.connect(filter);
    oscSub.connect(filter);
    filter.connect(engineGain).connect(master);
    oscTurbo.connect(turboGain).connect(master);
    master.connect(ctx.destination);

    oscMain.start();
    oscSub.start();
    oscTurbo.start();

    this.ctx = ctx;
    this.master = master;
    this.oscMain = oscMain;
    this.oscSub = oscSub;
    this.oscTurbo = oscTurbo;
    this.filter = filter;
    this.engineGain = engineGain;
    this.turboGain = turboGain;
    this.initialized = true;
  }

  updateEngine(
    profile: VehicleSpec["engineSound"],
    rpm: number,
    throttle: boolean,
    active: boolean,
    outOfFuel: boolean,
  ) {
    if (!this.ctx || !this.oscMain || !this.oscSub || !this.oscTurbo || !this.filter || !this.engineGain || !this.turboGain) {
      return;
    }

    if (profile !== this.currentProfile) {
      this.currentProfile = profile;
      if (profile === "dirt_bike") {
        this.oscMain.type = "square";
        this.oscSub.type = "sawtooth";
      } else if (profile === "splendor_4s") {
        this.oscMain.type = "triangle";
        this.oscSub.type = "sawtooth";
      } else if (profile === "monster_v8") {
        this.oscMain.type = "sawtooth";
        this.oscSub.type = "square";
      } else {
        this.oscMain.type = "sawtooth";
        this.oscSub.type = "triangle";
      }
    }

    const now = this.ctx.currentTime;
    const clampedRpm = Math.max(0, Math.min(1, rpm));

    let baseFreq = 44;
    let rpmSpan = 78;
    let filterBase = 150;
    let filterSpan = 340;
    let turboLevel = 0;

    switch (profile) {
      case "diesel_suv": // Fortuner
        baseFreq = 42;
        rpmSpan = 72;
        filterBase = 140;
        filterSpan = 320;
        turboLevel = throttle ? 0.025 * clampedRpm : 0;
        break;
      case "turbo_suv": // Scorpio
        baseFreq = 48;
        rpmSpan = 88;
        filterBase = 165;
        filterSpan = 390;
        turboLevel = throttle ? 0.032 * clampedRpm : 0;
        break;
      case "jeep": // Thar
        baseFreq = 50;
        rpmSpan = 85;
        filterBase = 180;
        filterSpan = 360;
        break;
      case "monster_v8": // Monster 4x4
        baseFreq = 34;
        rpmSpan = 62;
        filterBase = 125;
        filterSpan = 290;
        break;
      case "splendor_4s": // Hero Splendor+ 100cc 4-stroke thump
        baseFreq = 56;
        rpmSpan = 112;
        filterBase = 210;
        filterSpan = 420;
        break;
      case "dirt_bike": // Motocross 2-stroke
        baseFreq = 78;
        rpmSpan = 178;
        filterBase = 290;
        filterSpan = 780;
        break;
    }

    const freq = baseFreq + clampedRpm * rpmSpan;
    this.oscMain.frequency.setTargetAtTime(freq, now, 0.04);
    this.oscSub.frequency.setTargetAtTime(profile === "dirt_bike" ? freq * 0.5 : freq * 0.5, now, 0.04);
    this.filter.frequency.setTargetAtTime(
      filterBase + clampedRpm * filterSpan + (throttle ? 95 : 0),
      now,
      0.05,
    );
    this.oscTurbo.frequency.setTargetAtTime(480 + clampedRpm * 620, now, 0.06);

    const running = this.enabled && active && !outOfFuel;
    const targetGain = running ? (throttle ? 0.16 : 0.085) : 0;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
    this.turboGain.gain.setTargetAtTime(running ? turboLevel : 0, now, 0.06);
  }

  cue(kind: SoundCue) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    switch (kind) {
      case "coin": {
        if (now - this.lastCoinTime < 0.7) {
          this.coinCombo = Math.min(8, this.coinCombo + 1);
        } else {
          this.coinCombo = 0;
        }
        this.lastCoinTime = now;
        const pitch = 780 * Math.pow(1.06, this.coinCombo);
        this.tone(pitch, pitch * 1.25, 0.075, 0.16, "triangle", 0);
        this.tone(pitch * 1.5, pitch * 1.5, 0.09, 0.13, "sine", 0.045);
        break;
      }
      case "fuel":
        this.tone(320, 480, 0.09, 0.18, "triangle", 0);
        this.tone(480, 680, 0.1, 0.18, "triangle", 0.08);
        this.tone(680, 920, 0.14, 0.2, "sine", 0.16);
        break;
      case "stunt":
        this.tone(523, 523, 0.09, 0.18, "triangle", 0);
        this.tone(659, 659, 0.09, 0.18, "triangle", 0.075);
        this.tone(784, 784, 0.1, 0.2, "triangle", 0.15);
        this.tone(1046, 1060, 0.22, 0.22, "sine", 0.225);
        break;
      case "milestone":
        this.tone(587, 587, 0.1, 0.17, "triangle", 0);
        this.tone(880, 885, 0.22, 0.2, "triangle", 0.09);
        break;
      case "low_fuel":
        this.tone(880, 860, 0.1, 0.12, "square", 0);
        break;
      case "land":
        this.tone(110, 45, 0.11, 0.16, "triangle", 0);
        break;
      case "crash":
        // Crisp rollover crunch + heavy chassis impact + descending death chord
        this.tone(420, 95, 0.08, 0.26, "square", 0);
        this.tone(175, 32, 0.44, 0.34, "sawtooth", 0.02);
        this.tone(98, 26, 0.4, 0.26, "square", 0.05);
        this.tone(220, 110, 0.48, 0.18, "triangle", 0.14);
        break;
      case "upgrade":
        this.tone(440, 660, 0.09, 0.16, "triangle", 0);
        this.tone(660, 880, 0.14, 0.18, "sine", 0.08);
        break;
      case "click":
        this.tone(520, 640, 0.06, 0.1, "triangle", 0);
        break;
    }
  }

  private tone(
    from: number,
    to: number,
    duration: number,
    level: number,
    type: OscillatorType,
    delay: number,
  ) {
    if (!this.ctx || !this.master) return;
    const start = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, from), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    gain.gain.setValueAtTime(0.0008, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  dispose() {
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
    }
    this.ctx = undefined;
    this.master = undefined;
    this.initialized = false;
  }
}
