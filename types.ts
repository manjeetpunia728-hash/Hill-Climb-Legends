export type VehicleId = "fortuner" | "scorpio" | "thar" | "monster" | "splendor" | "bike";
export type StageId = "countryside" | "highway" | "village" | "ladakh" | "desert";
export type UpgradeKey = "engine" | "suspension" | "tires" | "fuel";
export type GamePhase = "menu" | "playing" | "paused" | "gameover";
export type GameOverReason = "died" | "out_of_fuel" | null;
export type DeathCause = "rollover" | "head_hit" | null;

export interface UpgradeLevels {
  engine: number;
  suspension: number;
  tires: number;
  fuel: number;
}

export interface VehicleSpec {
  id: VehicleId;
  name: string;
  subtitle: string;
  category: "car" | "bike";
  badge: string;
  accentColor: string;
  engineSound: "diesel_suv" | "turbo_suv" | "jeep" | "monster_v8" | "splendor_4s" | "dirt_bike";
  // Chassis & Wheel geometry (local coords in world pixels, Y-down, center of mass at (0,0))
  mass: number;
  inertia: number;
  rearWheel: { x: number; y: number; radius: number };
  frontWheel: { x: number; y: number; radius: number };
  restSuspension: number;
  minSuspension: number;
  maxSuspension: number;
  // Base physics tuning
  springK: number;
  damperC: number;
  driveForce: number;
  maxSpeed: number; // world px/s
  reverseSpeed: number;
  tireGrip: number;
  wheelDrive: "4wd" | "rwd";
  airPitchTorque: number;
  wheelieTorque: number;
  fuelCapacity: number; // seconds at idle/base scale
  fuelDrainRate: number;
  // Collision probes (local chassis coords)
  headPos: { x: number; y: number; radius: number };
  bumpers: { x: number; y: number; radius: number; isRoof?: boolean }[];
  exhaustPos: { x: number; y: number };
  // Base visual display ratings (1-100)
  stats: { power: number; suspension: number; grip: number; fuel: number };
}

export interface StageSpec {
  id: StageId;
  name: string;
  subtitle: string;
  surfaceType: "grass" | "asphalt" | "crops" | "rock" | "sand";
  gravity: number;
  gripMultiplier: number;
  hillScale: number;
  roughness: number;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  sunColor: string;
  sunGlow: string;
  farMountain: string;
  midMountain: string;
  nearHills: string;
  soilTop: string;
  soilDeep: string;
  soilStripe: string;
  pebbleColor: string;
  turfMain: string;
  turfHighlight: string;
  turfShadow: string;
  dustColor: string;
}

export type SceneryKind =
  | "pine"
  | "bush"
  | "rock"
  | "cactus"
  | "flag_pole"
  | "post"
  | "streetlight"
  | "highway_sign"
  | "guardrail"
  | "milestone"
  | "hut"
  | "haystack"
  | "mango_tree"
  | "crop_patch";

export interface CoinItem {
  id: number;
  x: number;
  y: number;
  value: 5 | 25 | 100 | 500;
  collected: boolean;
  phase: number;
}

export interface FuelItem {
  id: number;
  x: number;
  y: number;
  collected: boolean;
}

export interface SceneryProp {
  x: number;
  kind: SceneryKind;
  scale: number;
  variant: number;
}

export interface WheelState {
  ext: number; // current suspension extension along local down
  extVel: number;
  worldX: number;
  worldY: number;
  angle: number;
  spinVel: number;
  grounded: boolean;
  contactNx: number;
  contactNy: number;
  slip: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  gravityScale: number;
  kind: "dirt" | "smoke" | "spark" | "fuel" | "star";
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface ControlsState {
  gas: boolean;
  brake: boolean;
}

export interface HudSnapshot {
  fuel: number; // 0..100
  lowFuel: boolean;
  outOfFuel: boolean;
  distance: number; // meters
  bestDistance: number; // meters
  runCoins: number;
  totalCoins: number;
  speedKmh: number;
  rpm: number; // 0..1
  boost: number; // 0..1 turbo/load gauge
  flips: number;
  airBonusTotal: number;
  newRecord: boolean;
  gameOverReason: GameOverReason;
  deathCause: DeathCause;
  nextFuelMeters: number;
}

export interface SavedProgress {
  coins: number;
  selectedVehicle: VehicleId;
  selectedStage: StageId;
  bestDistances: Record<StageId, number>;
  upgrades: Record<VehicleId, UpgradeLevels>;
  soundOn: boolean;
}
