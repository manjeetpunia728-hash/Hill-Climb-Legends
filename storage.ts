import type { SavedProgress, StageId, VehicleId } from "./types";
import { defaultUpgrades, STAGE_MAP, VEHICLE_MAP } from "./vehicles";

const STORAGE_KEY = "hillclimb.legends.v1";

export function defaultProgress(): SavedProgress {
  return {
    coins: 400,
    selectedVehicle: "fortuner",
    selectedStage: "highway",
    bestDistances: {
      countryside: 0,
      highway: 0,
      village: 0,
      ladakh: 0,
      desert: 0,
    },
    upgrades: defaultUpgrades(),
    soundOn: true,
  };
}

export function loadProgress(): SavedProgress {
  const base = defaultProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;

    const selectedVehicle: VehicleId =
      parsed.selectedVehicle && parsed.selectedVehicle in VEHICLE_MAP
        ? parsed.selectedVehicle
        : base.selectedVehicle;
    const selectedStage: StageId =
      parsed.selectedStage && parsed.selectedStage in STAGE_MAP
        ? parsed.selectedStage
        : base.selectedStage;

    const upgrades = defaultUpgrades();
    if (parsed.upgrades) {
      for (const vid of Object.keys(upgrades) as VehicleId[]) {
        const savedU = parsed.upgrades[vid];
        if (savedU) {
          upgrades[vid] = {
            engine: Math.min(5, Math.max(1, Math.floor(Number(savedU.engine) || 1))),
            suspension: Math.min(5, Math.max(1, Math.floor(Number(savedU.suspension) || 1))),
            tires: Math.min(5, Math.max(1, Math.floor(Number(savedU.tires) || 1))),
            fuel: Math.min(5, Math.max(1, Math.floor(Number(savedU.fuel) || 1))),
          };
        }
      }
    }

    return {
      coins: Math.max(0, Math.floor(Number(parsed.coins) || base.coins)),
      selectedVehicle,
      selectedStage,
      bestDistances: {
        countryside: Math.max(0, Math.floor(Number(parsed.bestDistances?.countryside) || 0)),
        highway: Math.max(0, Math.floor(Number(parsed.bestDistances?.highway) || 0)),
        village: Math.max(0, Math.floor(Number(parsed.bestDistances?.village) || 0)),
        ladakh: Math.max(0, Math.floor(Number(parsed.bestDistances?.ladakh) || 0)),
        desert: Math.max(0, Math.floor(Number(parsed.bestDistances?.desert) || 0)),
      },
      upgrades,
      soundOn: typeof parsed.soundOn === "boolean" ? parsed.soundOn : true,
    };
  } catch {
    return base;
  }
}

export function saveProgress(progress: SavedProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}
