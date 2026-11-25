import type { CoinItem, FuelItem, SceneryProp, StageSpec } from "./types";
import { PIXELS_PER_METER } from "./vehicles";

export const TERRAIN_STEP = 14;
export const TERRAIN_MIN_X = -560;
const BASE_GROUND_Y = 470;

export interface TerrainContact {
  hit: boolean;
  penetration: number;
  nx: number;
  ny: number;
  px: number;
  py: number;
}

export class TerrainWorld {
  readonly stage: StageSpec;
  private heights: number[] = [];
  private maxGeneratedX = TERRAIN_MIN_X;
  readonly coins: CoinItem[] = [];
  readonly fuels: FuelItem[] = [];
  readonly props: SceneryProp[] = [];

  private nextCoinX = 360;
  private nextFuelMeter = 125;
  private nextPropX = -120;
  private nextEntityId = 1;
  private seedOffset: number;

  constructor(stage: StageSpec) {
    this.stage = stage;
    const seeds: Record<StageSpec["id"], number> = {
      countryside: 1.7,
      highway: 4.4,
      village: 9.8,
      ladakh: 7.3,
      desert: 13.9,
    };
    this.seedOffset = seeds[stage.id];
    this.ensureGenerated(2800);
  }

  private rawSlope(x: number): number {
    // Backstop wall behind start so player cannot drive off the left edge
    if (x < -160) {
      return 0.85 * Math.min(1, (-160 - x) / 140);
    }
    // Flat launch pad around spawn
    if (x < 210) return 0;

    const meters = Math.max(0, (x - 80) / PIXELS_PER_METER);
    const intro = Math.min(1, (x - 210) / 360);
    const difficulty = Math.min(1, meters / 1400);
    const s = this.seedOffset;
    const scale = this.stage.hillScale;
    const rough = this.stage.roughness;

    // Multi-octave hill slopes (derivative of wave terrain)
    const w1 = Math.sin(x * 0.0031 + s) * (0.24 + difficulty * 0.24) * scale;
    const w2 = Math.sin(x * 0.0074 + s * 2.1) * (0.19 + difficulty * 0.23) * scale;
    const w3 = Math.sin(x * 0.0155 + s * 0.7) * (0.11 + difficulty * 0.16) * rough;
    const w4 = Math.cos(x * 0.027 + s * 3.2) * (0.045 + difficulty * 0.085) * rough;

    // Occasional dramatic valley/peak modulator
    const waveMod = 0.78 + 0.36 * Math.sin(x * 0.0011 + s * 1.4);
    let slope = (w1 + w2 + w3 + w4) * waveMod * intro;

    // Softly clamp max slope so every hill remains exhilarating yet climbable
    const maxSlope = 0.64 + difficulty * 0.28; // ~32 deg early -> ~42.5 deg late
    slope = maxSlope * Math.tanh(slope / maxSlope);
    return slope;
  }

  ensureGenerated(targetX: number) {
    if (this.heights.length === 0) {
      const d = Math.max(0, -160 - TERRAIN_MIN_X);
      this.heights.push(BASE_GROUND_Y - d * d * 0.0022);
      this.maxGeneratedX = TERRAIN_MIN_X;
    }

    while (this.maxGeneratedX < targetX) {
      const prevY = this.heights[this.heights.length - 1];
      const x = this.maxGeneratedX + TERRAIN_STEP;
      let nextY: number;
      if (x < -160) {
        // Smooth upward backstop behind the start pad
        const d = -160 - x;
        nextY = BASE_GROUND_Y - d * d * 0.0022;
      } else if (x <= 210) {
        // Perfectly level starting launch pad
        nextY = BASE_GROUND_Y;
      } else {
        const slope = this.rawSlope(x);
        // Gentle pull back toward reasonable vertical band so hills stay balanced
        const bandCenter = BASE_GROUND_Y - Math.min(380, Math.max(0, x) * 0.015);
        const restore = (bandCenter - prevY) * 0.00045;
        nextY = prevY + (slope + restore) * TERRAIN_STEP;
      }
      this.heights.push(nextY);
      this.maxGeneratedX = x;
    }

    this.populateEntities(targetX - 300);
  }

  private hash(n: number): number {
    const v = Math.sin(n * 127.1 + this.seedOffset * 311.7) * 43758.5453;
    return v - Math.floor(v);
  }

  private populateEntities(upToX: number) {
    // 1. Fuel cans at fair Hill Climb spacing
    while (this.nextFuelMeter * PIXELS_PER_METER + 80 < upToX) {
      const fx = 80 + this.nextFuelMeter * PIXELS_PER_METER;
      const fy = this.getHeight(fx) - 26;
      this.fuels.push({
        id: this.nextEntityId++,
        x: fx,
        y: fy,
        collected: false,
      });
      const progression = Math.min(1, this.nextFuelMeter / 1500);
      this.nextFuelMeter += Math.round(132 + progression * 34 + this.hash(this.nextFuelMeter) * 14);
    }

    // 2. Coin arcs along slopes and jump crests
    while (this.nextCoinX < upToX) {
      const cx = this.nextCoinX;
      const meters = Math.max(0, (cx - 80) / PIXELS_PER_METER);
      const r = this.hash(cx * 0.13);
      const count = 5 + Math.floor(r * 4);
      const isJumpArc = r > 0.62 && meters > 20;
      const spacing = 42;

      for (let i = 0; i < count; i++) {
        const x = cx + i * spacing;
        const groundY = this.getHeight(x);
        const arcLift = isJumpArc ? Math.sin((i / (count - 1)) * Math.PI) * 62 : 0;
        const y = groundY - 30 - arcLift;

        // Coin denomination scales with distance and last coin in cluster is higher value
        let value: 5 | 25 | 100 | 500 = 5;
        if (meters > 420 && i === count - 1) value = 500;
        else if (meters > 180 && (i === count - 1 || r > 0.72)) value = 100;
        else if (meters > 45 || i === count - 1) value = 25;

        this.coins.push({
          id: this.nextEntityId++,
          x,
          y,
          value,
          collected: false,
          phase: i * 0.55,
        });
      }

      this.nextCoinX += count * spacing + 210 + this.hash(cx * 0.27) * 210;
    }

    // 3. Biome background scenery props along terrain crest
    while (this.nextPropX < upToX) {
      const px = this.nextPropX;
      const r = this.hash(px * 0.09);
      let kind: SceneryProp["kind"] = "pine";
      let stepBase = 115;
      let stepRand = 185;

      if (this.stage.id === "countryside") {
        kind = r < 0.52 ? "pine" : r < 0.82 ? "bush" : "rock";
      } else if (this.stage.id === "highway") {
        kind = r < 0.38 ? "streetlight" : r < 0.64 ? "guardrail" : r < 0.84 ? "highway_sign" : "milestone";
        stepBase = 135;
        stepRand = 140;
      } else if (this.stage.id === "village") {
        kind = r < 0.24 ? "hut" : r < 0.48 ? "mango_tree" : r < 0.74 ? "haystack" : "crop_patch";
        stepBase = 105;
        stepRand = 155;
      } else if (this.stage.id === "ladakh") {
        kind = r < 0.58 ? "rock" : r < 0.85 ? "flag_pole" : "post";
      } else {
        kind = r < 0.55 ? "cactus" : "rock";
      }

      this.props.push({
        x: px,
        kind,
        scale:
          this.stage.id === "highway" && kind === "streetlight"
            ? 0.95 + this.hash(px * 0.31) * 0.18
            : 0.78 + this.hash(px * 0.31) * 0.48,
        variant: Math.floor(this.hash(px * 0.53) * 3),
      });
      this.nextPropX += stepBase + this.hash(px * 0.19) * stepRand;
    }
  }

  getHeight(x: number): number {
    if (x > this.maxGeneratedX - 400) {
      this.ensureGenerated(x + 1800);
    }
    const fIdx = (x - TERRAIN_MIN_X) / TERRAIN_STEP;
    const i0 = Math.max(0, Math.min(this.heights.length - 2, Math.floor(fIdx)));
    const t = Math.max(0, Math.min(1, fIdx - i0));
    return this.heights[i0] * (1 - t) + this.heights[i0 + 1] * t;
  }

  getNormal(x: number): { nx: number; ny: number } {
    const hL = this.getHeight(x - 6);
    const hR = this.getHeight(x + 6);
    const dx = 12;
    const dy = hR - hL;
    const len = Math.hypot(dx, dy) || 1;
    // Outward UP normal in Y-down canvas coordinates: (dy/len, -dx/len)
    return { nx: dy / len, ny: -dx / len };
  }

  getIndexForX(x: number): number {
    return Math.max(0, Math.min(this.heights.length - 1, Math.floor((x - TERRAIN_MIN_X) / TERRAIN_STEP)));
  }

  getSample(index: number): { x: number; y: number } {
    const clamped = Math.max(0, Math.min(this.heights.length - 1, index));
    return {
      x: TERRAIN_MIN_X + clamped * TERRAIN_STEP,
      y: this.heights[clamped],
    };
  }

  getSampleCount(): number {
    return this.heights.length;
  }

  /**
   * Exact circle vs terrain polyline contact query.
   * Handles both surface grazing and deep penetration cleanly.
   */
  circleContact(cx: number, cy: number, radius: number): TerrainContact {
    if (cx + radius + 200 > this.maxGeneratedX) {
      this.ensureGenerated(cx + 1800);
    }

    const startIdx = Math.max(0, Math.floor((cx - radius - TERRAIN_STEP - TERRAIN_MIN_X) / TERRAIN_STEP));
    const endIdx = Math.min(
      this.heights.length - 2,
      Math.ceil((cx + radius + TERRAIN_STEP - TERRAIN_MIN_X) / TERRAIN_STEP),
    );

    let bestDistSq = Infinity;
    let bestPx = cx;
    let bestPy = this.getHeight(cx);
    let bestSegNx = 0;
    let bestSegNy = -1;

    for (let i = startIdx; i <= endIdx; i++) {
      const ax = TERRAIN_MIN_X + i * TERRAIN_STEP;
      const ay = this.heights[i];
      const bx = ax + TERRAIN_STEP;
      const by = this.heights[i + 1];

      const abx = bx - ax;
      const aby = by - ay;
      const abLenSq = abx * abx + aby * aby;
      let t = ((cx - ax) * abx + (cy - ay) * aby) / abLenSq;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;

      const px = ax + abx * t;
      const py = ay + aby * t;
      const dx = cx - px;
      const dy = cy - py;
      const distSq = dx * dx + dy * dy;

      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestPx = px;
        bestPy = py;
        const segLen = Math.sqrt(abLenSq) || 1;
        bestSegNx = aby / segLen;
        bestSegNy = -abx / segLen;
      }
    }

    const groundAtCx = this.getHeight(cx);
    // Check if circle center is already beneath terrain surface
    if (cy > groundAtCx) {
      const dist = Math.sqrt(bestDistSq);
      return {
        hit: true,
        penetration: radius + dist,
        nx: bestSegNx,
        ny: bestSegNy,
        px: bestPx,
        py: bestPy,
      };
    }

    const dist = Math.sqrt(bestDistSq);
    if (dist < radius) {
      let nx = bestSegNx;
      let ny = bestSegNy;
      if (dist > 0.0001) {
        nx = (cx - bestPx) / dist;
        ny = (cy - bestPy) / dist;
      }
      // Always guarantee normal points upward out of solid earth
      if (ny > -0.15) {
        nx = bestSegNx;
        ny = bestSegNy;
      }
      return {
        hit: true,
        penetration: radius - dist,
        nx,
        ny,
        px: bestPx,
        py: bestPy,
      };
    }

    return {
      hit: false,
      penetration: 0,
      nx: 0,
      ny: -1,
      px: bestPx,
      py: bestPy,
    };
  }
}
