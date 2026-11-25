import type { SoundCue } from "./audio";
import { TerrainWorld } from "./terrain";
import type {
  ControlsState,
  DeathCause,
  FloatingText,
  GameOverReason,
  HudSnapshot,
  Particle,
  StageSpec,
  UpgradeLevels,
  VehicleSpec,
  WheelState,
} from "./types";
import { getEffectiveStats, PIXELS_PER_METER } from "./vehicles";
import type { EffectiveVehicleStats } from "./vehicles";

const FIXED_DT = 1 / 120;
const SPAWN_X = 80;

export interface SimulationCallbacks {
  onSound: (cue: SoundCue) => void;
  onCoinsEarned: (amount: number) => void;
  onGameOver: (reason: GameOverReason, distance: number) => void;
}

export class HillSimulation {
  readonly spec: VehicleSpec;
  readonly stage: StageSpec;
  readonly stats: EffectiveVehicleStats;
  readonly terrain: TerrainWorld;

  // Rigid body chassis state (world coords, Y-down)
  cx = SPAWN_X;
  cy = 380;
  vx = 0;
  vy = 0;
  angle = 0;
  omega = 0;

  // Wheels: [rear, front]
  wheels: [WheelState, WheelState];

  // Driver animation spring state
  driverLean = 0;
  driverLeanVel = 0;
  headBob = 0;
  headBobVel = 0;

  // Engine & gauges
  rpm = 0.14;
  boost = 0;
  gasHeld = false;
  brakeHeld = false;

  // Fuel & scoring
  fuel = 100;
  outOfFuel = false;
  private outOfFuelTimer = 0;
  private outOfFuelTotalTime = 0;
  private lowFuelBeepTimer = 0;

  distance = 0;
  bestDistance = 0;
  newRecord = false;
  runCoins = 0;
  flips = 0;
  airBonusTotal = 0;
  private nextMilestone = 100;

  // Stunt detectors
  private airTime = 0;
  private airAngleAccum = 0;
  private wheelieTime = 0;
  private wheelieAwardedCount = 0;
  private wasGrounded = true;
  private invertedContactTimer = 0;

  // Game over state
  ended = false;
  gameOverReason: GameOverReason = null;
  deathCause: DeathCause = null;
  deathFlash = 0;
  private crashSlowMo = 0;
  private wreckSmokeTimer = 0;

  // Visual effects
  particles: Particle[] = [];
  popups: FloatingText[] = [];
  time = 0;
  private exhaustTimer = 0;
  private dirtTimer = 0;

  // Camera state (world center & zoom)
  camX = SPAWN_X + 210;
  camY = 390;
  camZoom = 1.0;
  shake = 0;

  private accumulator = 0;
  private callbacks: SimulationCallbacks;

  constructor(
    spec: VehicleSpec,
    stage: StageSpec,
    upgrades: UpgradeLevels,
    bestDistance: number,
    callbacks: SimulationCallbacks,
  ) {
    this.spec = spec;
    this.stage = stage;
    this.stats = getEffectiveStats(spec, upgrades);
    this.terrain = new TerrainWorld(stage);
    this.bestDistance = bestDistance;
    this.callbacks = callbacks;

    const groundY = this.terrain.getHeight(SPAWN_X);
    const avgWheelR = (spec.rearWheel.radius + spec.frontWheel.radius) * 0.5;
    const avgMountY = (spec.rearWheel.y + spec.frontWheel.y) * 0.5;
    const initExt = spec.restSuspension - 6;

    this.cx = SPAWN_X;
    this.cy = groundY - avgWheelR - avgMountY - initExt;
    this.camX = this.cx + 55;
    this.camY = this.cy + 72;

    this.wheels = [
      this.makeWheel(spec.rearWheel, initExt),
      this.makeWheel(spec.frontWheel, initExt),
    ];
    this.syncWheelWorldPositions();
  }

  private makeWheel(mount: { x: number; y: number; radius: number }, initExt: number): WheelState {
    return {
      ext: initExt,
      extVel: 0,
      worldX: this.cx + mount.x,
      worldY: this.cy + mount.y + initExt,
      angle: 0,
      spinVel: 0,
      grounded: true,
      contactNx: 0,
      contactNy: -1,
      slip: 0,
    };
  }

  private syncWheelWorldPositions() {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const downX = -sin;
    const downY = cos;
    const mounts = [this.spec.rearWheel, this.spec.frontWheel];
    for (let i = 0; i < 2; i++) {
      const m = mounts[i];
      const w = this.wheels[i];
      w.worldX = this.cx + m.x * cos + m.y * downX + downX * w.ext;
      w.worldY = this.cy + m.x * sin + m.y * downY + downY * w.ext;
    }
  }

  /**
   * Advances simulation with fixed-timestep substeps.
   * When menuIdle is true, vehicle settles gently on start hills without fuel drain or input.
   */
  update(frameDt: number, controls: ControlsState, menuIdle: boolean) {
    const dtClamped = Math.min(0.05, Math.max(0, frameDt));
    const timeScale = this.crashSlowMo > 0 ? 0.32 : 1.0;
    if (this.crashSlowMo > 0) {
      this.crashSlowMo = Math.max(0, this.crashSlowMo - dtClamped);
    }
    if (this.deathFlash > 0) {
      this.deathFlash = Math.max(0, this.deathFlash - dtClamped * 1.45);
    }

    this.gasHeld = !menuIdle && !this.ended && controls.gas;
    this.brakeHeld = !menuIdle && !this.ended && controls.brake;

    this.accumulator += dtClamped * timeScale;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < 8) {
      this.stepPhysics(FIXED_DT, menuIdle);
      this.accumulator -= FIXED_DT;
      steps++;
    }

    this.updateParticlesAndPopups(dtClamped);
    this.updateCamera(dtClamped, menuIdle);
  }

  private stepPhysics(dt: number, menuIdle: boolean) {
    this.time += dt;
    this.terrain.ensureGenerated(this.cx + 2200);

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const fwdX = cos;
    const fwdY = sin;
    const downX = -sin;
    const downY = cos;

    const { spec, stats, stage } = this;
    const gasActive = this.gasHeld && !this.outOfFuel;
    const brakeActive = this.brakeHeld;

    // Total force and torque accumulators
    let fx = 0;
    let fy = spec.mass * stage.gravity;
    let tau = 0;

    // Gentle aerodynamic drag
    fx -= this.vx * 0.12 * spec.mass;
    fy -= this.vy * 0.08 * spec.mass;

    const mounts = [spec.rearWheel, spec.frontWheel];
    let groundedCount = 0;
    let maxWheelImpact = 0;

    for (let i = 0; i < 2; i++) {
      const m = mounts[i];
      const w = this.wheels[i];
      const isRear = i === 0;
      const prevExt = w.ext;

      // Mount point in world coords
      const mountWX = this.cx + m.x * fwdX + m.y * downX;
      const mountWY = this.cy + m.x * fwdY + m.y * downY;

      // Droop wheel downward smoothly toward maxSuspension when unloaded
      const droopTarget = Math.min(spec.maxSuspension, w.ext + 150 * dt);
      const testWX = mountWX + downX * droopTarget;
      const testWY = mountWY + downY * droopTarget;

      const contact = this.terrain.circleContact(testWX, testWY, m.radius);

      // How aligned is the suspension strut with the ground normal?
      const upDot = -(contact.nx * downX + contact.ny * downY);

      if (contact.hit && upDot > 0.12) {
        w.grounded = true;
        groundedCount++;
        w.contactNx = contact.nx;
        w.contactNy = contact.ny;

        // Compress strut to keep tire on the terrain surface
        const strutComp = contact.penetration / Math.max(0.4, upDot);
        let nextExt = droopTarget - strutComp;
        let bottomOutPen = 0;

        if (nextExt < spec.minSuspension) {
          bottomOutPen = (spec.minSuspension - nextExt) * Math.max(0.4, upDot);
          nextExt = spec.minSuspension;
        }

        w.extVel = (nextExt - prevExt) / dt;
        w.ext = nextExt;

        const wx = mountWX + downX * w.ext;
        const wy = mountWY + downY * w.ext;
        w.worldX = wx;
        w.worldY = wy;

        const rx = wx - this.cx;
        const ry = wy - this.cy;
        const pvx = this.vx - this.omega * ry;
        const pvy = this.vy + this.omega * rx;
        const vNormal = pvx * contact.nx + pvy * contact.ny;

        if (!this.wasGrounded && vNormal < -140) {
          maxWheelImpact = Math.max(maxWheelImpact, -vNormal);
        }

        // Spring-damper normal force
        const compression = Math.max(0, spec.restSuspension - w.ext);
        let normalForce = stats.springK * compression - stats.damperC * vNormal;
        if (bottomOutPen > 0) {
          // Stiff bump stop prevents chassis sinking on massive jumps
          normalForce += bottomOutPen * stats.springK * 2.8;
          this.cx += contact.nx * bottomOutPen * 0.55;
          this.cy += contact.ny * bottomOutPen * 0.55;
        }
        normalForce = Math.max(0, normalForce);

        const nfx = contact.nx * normalForce;
        const nfy = contact.ny * normalForce;
        fx += nfx;
        fy += nfy;
        tau += rx * nfy - ry * nfx;

        // Terrain forward tangent (rightward uphill/downhill)
        const tx = -contact.ny;
        const ty = contact.nx;
        const vTan = pvx * tx + pvy * ty;

        const isDriven = spec.wheelDrive === "4wd" || isRear;
        const driveShare = spec.wheelDrive === "4wd" ? (isRear ? 0.58 : 0.42) : isRear ? 1.0 : 0;
        const maxGrip = (normalForce + 135 * spec.mass) * stats.tireGrip * stage.gripMultiplier;

        let tanForce = 0;
        w.slip = 0;

        if (menuIdle) {
          // Gentle parking brake during garage menu idle
          tanForce = -vTan * 3.5 * spec.mass;
        } else if (gasActive && isDriven) {
          const speedRatio = Math.max(0, vTan / stats.maxSpeed);
          if (speedRatio < 1.08) {
            const torqueMult = Math.max(0.15, 1.18 - 0.85 * speedRatio);
            const desired = stats.driveForce * driveShare * torqueMult;
            tanForce = Math.min(desired, maxGrip);
            w.slip = Math.max(0, (desired - maxGrip * 0.55) / Math.max(1, desired));
          }
        } else if (brakeActive) {
          if (vTan > 22) {
            // Braking forward motion
            tanForce = -Math.min(vTan * 4.8 * spec.mass, maxGrip * 1.05);
            w.slip = 0.5;
          } else if (!this.outOfFuel && isDriven) {
            // Reverse gear
            const revRatio = Math.max(0, -vTan / spec.reverseSpeed);
            if (revRatio < 1.0) {
              const revDesired = stats.driveForce * driveShare * 0.62 * (1.05 - 0.7 * revRatio);
              tanForce = -Math.min(revDesired, maxGrip * 0.85);
            }
          }
        } else {
          // Light rolling resistance when coasting
          tanForce = -vTan * 0.24 * spec.mass;
        }

        const tfx = tx * tanForce;
        const tfy = ty * tanForce;
        fx += tfx;
        fy += tfy;
        // Apply traction lever arm smoothly scaled so climbs squat naturally without flipping on flat ground
        tau += (rx * tfy - ry * tfx) * 0.26;

        // Wheel angular spin
        const targetSpin = vTan / m.radius + (gasActive && isDriven ? 2.4 + w.slip * 6.5 : 0);
        w.spinVel += (targetSpin - w.spinVel) * Math.min(1, 24 * dt);
        w.angle += w.spinVel * dt;
      } else {
        // Airborne wheel
        w.grounded = false;
        w.slip = 0;
        w.extVel = (droopTarget - prevExt) / dt;
        w.ext = droopTarget;
        w.worldX = testWX;
        w.worldY = testWY;

        if (gasActive && (spec.wheelDrive === "4wd" || isRear)) {
          w.spinVel += (26 - w.spinVel) * Math.min(1, 7 * dt);
        } else if (brakeActive) {
          w.spinVel *= Math.max(0, 1 - 12 * dt);
        } else {
          w.spinVel *= Math.max(0, 1 - 1.8 * dt);
        }
        w.angle += w.spinVel * dt;
      }
    }

    // Wheelie torque & Hill Climb mid-air pitch control
    if (!menuIdle && !this.ended) {
      if (groundedCount === 0) {
        // Full mid-air rotation control: GAS = nose UP (backflip), BRAKE = nose DOWN (frontflip)
        if (gasActive) {
          tau -= stats.airPitchTorque;
        }
        if (brakeActive) {
          tau += stats.airPitchTorque;
        }
      } else {
        // Grounded / single-wheel pitch attitude control with natural wheelie balance
        const normAngle = Math.atan2(Math.sin(this.angle), Math.cos(this.angle));
        const noseUpFactor = Math.max(0.18, Math.min(1, 1 + normAngle * 0.95));
        const wheelieScale = groundedCount === 1 ? 0.85 : 0.65;
        if (gasActive) {
          tau -= spec.wheelieTorque * wheelieScale * noseUpFactor;
        }
        if (brakeActive) {
          // Stronger brake nose-down recovery lets players save steep wheelies cleanly!
          tau += spec.wheelieTorque * (groundedCount === 1 ? 1.45 : 0.75);
        }
      }
    }

    // Angular damping keeps rotation smooth & predictable
    const angularDrag = groundedCount > 0 ? 3.2 : 1.35;
    tau -= this.omega * spec.inertia * angularDrag * 0.35;

    // Integrate linear and angular velocities (semi-implicit Euler)
    this.vx += (fx / spec.mass) * dt;
    this.vy += (fy / spec.mass) * dt;
    this.omega += (tau / spec.inertia) * dt;

    // Clamp extreme angular velocity for clean controllable flips
    const maxOmega = spec.category === "bike" ? 8.6 : 6.0;
    this.omega = Math.max(-maxOmega, Math.min(maxOmega, this.omega));

    // Prevent reversing past left barrier
    if (this.cx < -170 && this.vx < 0) {
      this.vx *= 0.4;
      this.cx = -170;
    }

    this.cx += this.vx * dt;
    this.cy += this.vy * dt;
    this.angle += this.omega * dt;

    this.syncWheelWorldPositions();

    // Chassis bumper / roof & driver head terrain collisions
    this.resolveBodyContacts(dt, menuIdle, groundedCount);

    // Driver lean & head bobbing secondary spring animation
    const targetLean = gasActive ? -0.28 : brakeActive ? 0.28 : 0;
    const leanAcc = (targetLean - this.driverLean) * 55 - this.driverLeanVel * 8.5;
    this.driverLeanVel += leanAcc * dt;
    this.driverLean += this.driverLeanVel * dt;

    const bobAcc = -this.headBob * 120 - this.headBobVel * 11 - (fy / spec.mass - stage.gravity) * 0.004;
    this.headBobVel += bobAcc * dt;
    this.headBob = Math.max(-7, Math.min(7, this.headBob + this.headBobVel * dt));

    // Landing thump & dust burst
    if (maxWheelImpact > 140 && !menuIdle) {
      this.shake = Math.min(9, maxWheelImpact * 0.016);
      this.callbacks.onSound("land");
      for (const w of this.wheels) {
        if (w.grounded) {
          this.spawnDustBurst(w.worldX, w.worldY + 14, 7, 1.1);
        }
      }
    }

    // Engine RPM & Boost gauges
    const speedNorm = Math.min(1, Math.abs(this.vx) / stats.maxSpeed);
    const targetRpm = this.outOfFuel
      ? 0
      : gasActive
        ? Math.min(1, 0.32 + speedNorm * 0.58 + (groundedCount === 0 ? 0.25 : 0.12))
        : brakeActive && this.vx < 10
          ? 0.35 + speedNorm * 0.3
          : 0.12 + speedNorm * 0.38;
    this.rpm += (targetRpm - this.rpm) * Math.min(1, 10 * dt);

    const targetBoost = gasActive && !this.outOfFuel ? Math.min(1, 0.25 + this.rpm * 0.78) : 0;
    this.boost += (targetBoost - this.boost) * Math.min(1, 8 * dt);

    if (menuIdle) {
      this.wasGrounded = groundedCount > 0;
      return;
    }

    // Emit exhaust, tire dirt, or wreck smoke particles
    this.emitDrivingParticles(dt, gasActive);
    if (this.ended && this.gameOverReason === "died") {
      this.wreckSmokeTimer -= dt;
      if (this.wreckSmokeTimer <= 0) {
        this.wreckSmokeTimer = 0.075;
        this.particles.push({
          x: this.cx + (Math.random() - 0.5) * 38,
          y: this.cy - 6,
          vx: (Math.random() - 0.5) * 26,
          vy: -38 - Math.random() * 28,
          size: 7 + Math.random() * 6,
          life: 0.75,
          maxLife: 0.75,
          color: "rgba(30, 41, 59, 0.68)",
          gravityScale: -0.06,
          kind: "smoke",
        });
      }
    }

    if (!this.ended) {
      // Distance & Best Record tracking
      const currMeters = Math.max(0, Math.floor((this.cx - SPAWN_X) / PIXELS_PER_METER));
      if (currMeters > this.distance) {
        this.distance = currMeters;
        if (this.distance > this.bestDistance && this.bestDistance > 0 && !this.newRecord) {
          this.newRecord = true;
          this.addPopup(this.cx, this.cy - 95, "NEW RECORD!", undefined, "#38bdf8", 1.25);
          this.callbacks.onSound("milestone");
        }
        if (this.distance >= this.nextMilestone) {
          const bonus = 500;
          this.awardCoins(bonus);
          this.addPopup(this.cx, this.cy - 85, `${this.nextMilestone}M!`, `+${bonus} COINS`, "#4ade80", 1.2);
          this.callbacks.onSound("milestone");
          this.nextMilestone += 100;
        }
      }

      // Stunts (Flips, Air Time, Wheelie)
      this.updateStunts(dt, groundedCount);

      // Collectibles (Coins & Fuel cans)
      this.checkPickups();

      // Fuel consumption
      this.updateFuel(dt, gasActive);
    }

    this.wasGrounded = groundedCount > 0;
  }

  private resolveBodyContacts(dt: number, menuIdle: boolean, groundedCount: number) {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const fwdX = cos;
    const fwdY = sin;
    const downX = -sin;
    const downY = cos;

    let roofHit = false;
    let anyBumperHit = false;
    let roofHitX = this.cx;
    let roofHitY = this.cy - 24;

    for (const b of this.spec.bumpers) {
      const bx = this.cx + b.x * fwdX + b.y * downX;
      const by = this.cy + b.x * fwdY + b.y * downY;
      const c = this.terrain.circleContact(bx, by, b.radius);
      if (!c.hit) continue;

      anyBumperHit = true;
      const rx = bx - this.cx;
      const ry = by - this.cy;
      const pvx = this.vx - this.omega * ry;
      const pvy = this.vy + this.omega * rx;
      const vN = pvx * c.nx + pvy * c.ny;

      // Positional resolution out of terrain
      this.cx += c.nx * c.penetration * 0.72;
      this.cy += c.ny * c.penetration * 0.72;

      if (vN < 0) {
        const restitution = b.isRoof ? 0.08 : 0.2;
        const rCrossN = rx * c.ny - ry * c.nx;
        const denom = 1 / this.spec.mass + (rCrossN * rCrossN) / this.spec.inertia;
        const impulse = (-(1 + restitution) * vN) / denom;
        this.vx += (impulse * c.nx) / this.spec.mass;
        this.vy += (impulse * c.ny) / this.spec.mass;
        this.omega += (rCrossN * impulse) / this.spec.inertia;

        // Tangential scrape friction (higher on roof so overturned vehicle skids & stops)
        const tx = -c.ny;
        const ty = c.nx;
        const vT = pvx * tx + pvy * ty;
        const friction = b.isRoof ? 0.36 : 0.18;
        this.vx -= tx * vT * friction;
        this.vy -= ty * vT * friction;
      }

      if (b.isRoof) {
        roofHit = true;
        roofHitX = bx;
        roofHitY = by;
      }
    }

    if (menuIdle || this.ended) return;

    // Driver head contact check
    const hp = this.spec.headPos;
    const hx = this.cx + hp.x * fwdX + hp.y * downX;
    const hy = this.cy + hp.x * fwdY + hp.y * downY;
    const headContact = this.terrain.circleContact(hx, hy, hp.radius);

    if (headContact.hit) {
      this.triggerDeath("head_hit", hx, hy);
      return;
    }

    // Orientation relative to terrain normal (+1 = upright on slope, < 0 = overturned / palatna)
    const slopeN = this.terrain.getNormal(this.cx);
    const uprightDot = sin * slopeN.nx - cos * slopeN.ny;
    const overturned = uprightDot < 0.14 || cos < -0.06;

    // Instant Rollover Death when car/bike overturns ("palatna") onto roof/hood/handlebars!
    if (roofHit && overturned) {
      this.triggerDeath("rollover", roofHitX, roofHitY);
      return;
    }

    // Backup check if overturned across a concave dip where front & rear bumpers bridge the gap
    const nearGround = anyBumperHit || groundedCount > 0 || this.terrain.getHeight(this.cx) - this.cy < 50;
    if (nearGround && (uprightDot < -0.22 || cos < -0.25)) {
      this.invertedContactTimer += dt;
      if (this.invertedContactTimer >= 0.1) {
        this.triggerDeath("rollover", hx, hy);
      }
    } else {
      this.invertedContactTimer = Math.max(0, this.invertedContactTimer - dt * 3);
    }
  }

  private triggerDeath(cause: "rollover" | "head_hit", hx: number, hy: number) {
    if (this.ended) return;
    this.ended = true;
    this.gameOverReason = "died";
    this.deathCause = cause;
    this.crashSlowMo = 0.75;
    this.deathFlash = 1.0;
    this.shake = 16;
    this.vx *= 0.45;
    this.omega *= 0.35;
    this.callbacks.onSound("crash");

    const sub =
      this.spec.category === "bike"
        ? "BIKE CRASHED!"
        : cause === "rollover"
          ? "CAR OVERTURNED!"
          : "NECK SNAP!";
    this.addPopup(hx, hy - 38, "YOU DIED!", sub, "#ef4444", 1.45);

    // Impact stars + sparks + dark smoke burst
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
      const spd = 95 + Math.random() * 185;
      this.particles.push({
        x: hx,
        y: hy,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 65,
        size: 5 + Math.random() * 4.5,
        life: 0.95,
        maxLife: 0.95,
        color: i % 3 === 0 ? "#ef4444" : i % 2 === 0 ? "#fde047" : "#f97316",
        gravityScale: 0.45,
        kind: "star",
      });
    }
    this.spawnSparkles(this.cx, this.cy - 12, "#fb923c", 14);

    this.callbacks.onGameOver("died", this.distance);
  }

  private updateStunts(dt: number, groundedCount: number) {
    if (groundedCount === 0) {
      this.airTime += dt;
      this.airAngleAccum += this.omega * dt;

      // Backflip (nose-up counter-clockwise in Y-down: omega < 0)
      if (this.airAngleAccum <= -Math.PI * 1.82) {
        this.airAngleAccum += Math.PI * 2;
        this.flips++;
        const bonus = 1000;
        this.airBonusTotal += bonus;
        this.awardCoins(bonus);
        this.addPopup(this.cx, this.cy - 92, "BACKFLIP!", `+${bonus}`, "#fde047", 1.3);
        this.spawnSparkles(this.cx, this.cy - 20, "#fde047", 14);
        this.callbacks.onSound("stunt");
      } else if (this.airAngleAccum >= Math.PI * 1.82) {
        this.airAngleAccum -= Math.PI * 2;
        this.flips++;
        const bonus = 1000;
        this.airBonusTotal += bonus;
        this.awardCoins(bonus);
        this.addPopup(this.cx, this.cy - 92, "FRONTFLIP!", `+${bonus}`, "#fb923c", 1.3);
        this.spawnSparkles(this.cx, this.cy - 20, "#fb923c", 14);
        this.callbacks.onSound("stunt");
      }
      this.wheelieTime = 0;
    } else {
      // Just landed after significant airtime
      if (this.airTime >= 1.05) {
        const bonus = this.airTime >= 1.9 ? 500 : 250;
        const label = this.airTime >= 1.9 ? "BIG AIR!" : "AIR TIME!";
        this.airBonusTotal += bonus;
        this.awardCoins(bonus);
        this.addPopup(this.cx, this.cy - 80, label, `+${bonus}`, "#38bdf8", 1.15);
        this.callbacks.onSound("stunt");
      }
      this.airTime = 0;
      this.airAngleAccum = 0;

      // Wheelie detection (rear wheel grounded, front wheel in air, moving forward)
      if (this.wheels[0].grounded && !this.wheels[1].grounded && this.vx > 80) {
        this.wheelieTime += dt;
        const threshold = 2.0 + this.wheelieAwardedCount * 2.0;
        if (this.wheelieTime >= threshold) {
          this.wheelieAwardedCount++;
          const bonus = 250;
          this.airBonusTotal += bonus;
          this.awardCoins(bonus);
          this.addPopup(this.cx, this.cy - 82, "WHEELIE!", `+${bonus}`, "#a3e635", 1.12);
          this.callbacks.onSound("stunt");
        }
      } else {
        this.wheelieTime = 0;
        this.wheelieAwardedCount = 0;
      }
    }
  }

  private checkPickups() {
    const pickupRadiusSq = 66 * 66;
    const fuelRadiusSq = 72 * 72;

    for (const coin of this.terrain.coins) {
      if (coin.collected) continue;
      if (coin.x < this.cx - 140) continue;
      if (coin.x > this.cx + 140) break;
      const dx = coin.x - this.cx;
      const dy = coin.y - this.cy;
      if (dx * dx + dy * dy <= pickupRadiusSq) {
        coin.collected = true;
        this.awardCoins(coin.value);
        this.spawnSparkles(coin.x, coin.y, "#fde047", 6);
        if (coin.value >= 100) {
          this.addPopup(coin.x, coin.y - 18, `+${coin.value}`, undefined, "#fde047", 0.95);
        }
        this.callbacks.onSound("coin");
      }
    }

    for (const item of this.terrain.fuels) {
      if (item.collected) continue;
      if (item.x < this.cx - 140) continue;
      if (item.x > this.cx + 140) break;
      const dx = item.x - this.cx;
      const dy = item.y - this.cy;
      if (dx * dx + dy * dy <= fuelRadiusSq) {
        item.collected = true;
        this.fuel = 100;
        this.outOfFuel = false;
        this.outOfFuelTimer = 0;
        this.outOfFuelTotalTime = 0;
        this.lowFuelBeepTimer = 0;
        this.addPopup(item.x, item.y - 28, "FUEL FULL!", undefined, "#4ade80", 1.2);
        this.spawnSparkles(item.x, item.y, "#ef4444", 12);
        this.callbacks.onSound("fuel");
      }
    }
  }

  private updateFuel(dt: number, gasActive: boolean) {
    const drainMult = gasActive ? 1.32 : 0.74;
    const drainPerSec = (100 / this.stats.fuelCapacity) * this.spec.fuelDrainRate * drainMult;

    if (this.fuel > 0) {
      this.fuel = Math.max(0, this.fuel - drainPerSec * dt);
      if (this.fuel > 0 && this.fuel < 25) {
        this.lowFuelBeepTimer -= dt;
        if (this.lowFuelBeepTimer <= 0) {
          this.lowFuelBeepTimer = 0.85;
          this.callbacks.onSound("low_fuel");
        }
      }
    } else {
      if (!this.outOfFuel) {
        this.outOfFuel = true;
        this.addPopup(this.cx, this.cy - 86, "OUT OF FUEL!", undefined, "#f87171", 1.2);
      }
      // Allow clutch coasting downhill into a nearby fuel can, with max coast timeout
      this.outOfFuelTotalTime += dt;
      const speed = Math.hypot(this.vx, this.vy);
      if (speed < 36) {
        this.outOfFuelTimer += dt;
      } else {
        this.outOfFuelTimer = Math.max(0, this.outOfFuelTimer - dt * 0.4);
      }
      if (this.outOfFuelTimer >= 1.6 || this.outOfFuelTotalTime >= 5.5) {
        this.ended = true;
        this.gameOverReason = "out_of_fuel";
        this.callbacks.onGameOver("out_of_fuel", this.distance);
      }
    }
  }

  private emitDrivingParticles(dt: number, gasActive: boolean) {
    // Exhaust puffs
    this.exhaustTimer -= dt;
    const exhaustInterval = gasActive ? 0.055 : 0.19;
    if (this.exhaustTimer <= 0 && !this.outOfFuel && !this.ended) {
      this.exhaustTimer = exhaustInterval;
      const cos = Math.cos(this.angle);
      const sin = Math.sin(this.angle);
      const ex = this.cx + this.spec.exhaustPos.x * cos - this.spec.exhaustPos.y * sin;
      const ey = this.cy + this.spec.exhaustPos.x * sin + this.spec.exhaustPos.y * cos;
      const isBike = this.spec.category === "bike";
      this.particles.push({
        x: ex,
        y: ey,
        vx: this.vx * 0.2 - cos * (gasActive ? 65 : 22) + (Math.random() - 0.5) * 18,
        vy: this.vy * 0.2 - sin * (gasActive ? 65 : 22) - 18 - Math.random() * 14,
        size: isBike ? 4 + Math.random() * 3 : 5 + Math.random() * 4,
        life: 0.48,
        maxLife: 0.48,
        color: isBike ? "rgba(215, 235, 255, 0.72)" : "rgba(180, 185, 195, 0.55)",
        gravityScale: -0.08,
        kind: "smoke",
      });
    }

    // Tire dirt / sand spray
    this.dirtTimer -= dt;
    if (this.dirtTimer <= 0 && (gasActive || (this.brakeHeld && Math.abs(this.vx) > 60))) {
      this.dirtTimer = 0.035;
      for (let i = 0; i < 2; i++) {
        const w = this.wheels[i];
        if (!w.grounded) continue;
        if (i === 1 && this.spec.wheelDrive === "rwd" && !this.brakeHeld) continue;
        const mount = i === 0 ? this.spec.rearWheel : this.spec.frontWheel;
        const tx = -w.contactNy;
        const ty = w.contactNx;
        const kickDir = gasActive ? -1 : 1;
        this.particles.push({
          x: w.worldX - w.contactNx * mount.radius * 0.85,
          y: w.worldY - w.contactNy * mount.radius * 0.85,
          vx: tx * kickDir * (75 + Math.random() * 95) + w.contactNx * (45 + Math.random() * 70),
          vy: ty * kickDir * (75 + Math.random() * 95) + w.contactNy * (45 + Math.random() * 70),
          size: 3 + Math.random() * 4,
          life: 0.42 + Math.random() * 0.2,
          maxLife: 0.62,
          color: Math.random() < 0.35 ? this.stage.turfMain : this.stage.dustColor,
          gravityScale: 0.8,
          kind: "dirt",
        });
      }
    }
  }

  private spawnDustBurst(x: number, y: number, count: number, power: number) {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * Math.random();
      const speed = (40 + Math.random() * 95) * power;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        size: 4 + Math.random() * 5,
        life: 0.45 + Math.random() * 0.2,
        maxLife: 0.65,
        color: this.stage.dustColor,
        gravityScale: 0.5,
        kind: "dirt",
      });
    }
  }

  private spawnSparkles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 55 + Math.random() * 105;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 35,
        size: 3 + Math.random() * 3,
        life: 0.45 + Math.random() * 0.2,
        maxLife: 0.65,
        color,
        gravityScale: 0.25,
        kind: "spark",
      });
    }
  }

  private addPopup(x: number, y: number, text: string, subtext: string | undefined, color: string, scale: number) {
    this.popups.push({
      x,
      y,
      vy: -52,
      text,
      subtext,
      color,
      life: 1.35,
      maxLife: 1.35,
      scale,
    });
  }

  private awardCoins(amount: number) {
    this.runCoins += amount;
    this.callbacks.onCoinsEarned(amount);
  }

  private updateParticlesAndPopups(dt: number) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += this.stage.gravity * p.gravityScale * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "smoke") {
        p.size += 10 * dt;
      }
    }
    if (this.particles.length > 0) {
      this.particles = this.particles.filter((p) => p.life > 0).slice(-140);
    }

    for (const pop of this.popups) {
      pop.life -= dt;
      pop.y += pop.vy * dt;
      pop.vy *= Math.max(0, 1 - 1.8 * dt);
    }
    if (this.popups.length > 0) {
      this.popups = this.popups.filter((pop) => pop.life > 0);
    }
  }

  private updateCamera(dt: number, menuIdle: boolean) {
    const speed = Math.hypot(this.vx, this.vy);
    const lookAheadX = menuIdle ? 48 : 195 + Math.max(-45, Math.min(145, this.vx * 0.28));
    const targetX = this.cx + lookAheadX;
    const groundBelow = this.terrain.getHeight(this.cx);
    const altitude = Math.max(0, groundBelow - this.cy - 50);
    const targetY = menuIdle
      ? this.cy + 78
      : this.cy - 34 + Math.min(55, altitude * 0.22);

    // Subtle zoom-out on big jumps or high speed so landings stay super readable in 16:9
    const targetZoom = menuIdle
      ? 1.14
      : Math.max(0.76, Math.min(1.02, 1.0 - speed * 0.00024 - altitude * 0.00085));

    const smooth = 1 - Math.exp(-6.5 * dt);
    this.camX += (targetX - this.camX) * smooth;
    this.camY += (targetY - this.camY) * smooth;
    this.camZoom += (targetZoom - this.camZoom) * (1 - Math.exp(-3.2 * dt));

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - 28 * dt);
    }
  }

  getNextFuelMeters(): number {
    for (const f of this.terrain.fuels) {
      if (!f.collected && f.x > this.cx - 20) {
        return Math.max(0, Math.round((f.x - this.cx) / PIXELS_PER_METER));
      }
    }
    return 999;
  }

  getSnapshot(totalCoins: number): HudSnapshot {
    const speedPx = Math.hypot(this.vx, this.vy);
    return {
      fuel: this.fuel,
      lowFuel: this.fuel < 25 && this.fuel > 0,
      outOfFuel: this.outOfFuel,
      distance: this.distance,
      bestDistance: Math.max(this.bestDistance, this.distance),
      runCoins: this.runCoins,
      totalCoins,
      speedKmh: Math.round((speedPx / PIXELS_PER_METER) * 3.6),
      rpm: this.rpm,
      boost: this.boost,
      flips: this.flips,
      airBonusTotal: this.airBonusTotal,
      newRecord: this.newRecord,
      gameOverReason: this.gameOverReason,
      deathCause: this.deathCause,
      nextFuelMeters: this.getNextFuelMeters(),
    };
  }
}
