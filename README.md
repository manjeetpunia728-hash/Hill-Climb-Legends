# Hill Climb Legends

A 16:9 2D physics Hill Climb Racing game built with React, TypeScript, and Canvas 2D.

## Vehicles (4 Cars + 2 Bikes)
- **Fortuner** (*Car 1*) — Pearl White 4x4 diesel SUV with plush suspension and large fuel tank.
- **Scorpio** (*Car 2*) — Jet Black turbo 4x4 SUV with strong hill-climbing torque.
- **Thar 4x4** (*Car 3*) — Crimson open-cab off-road Jeep with nimble handling and mud grip.
- **Monster 4x4** (*Car 4*) — Lifted heavy monster truck with oversized deep-tread tires.
- **Splendor+** (*Bike 1*) — Iconic 100cc Indian commuter bike with 5-spoke silver alloys, chrome silencer, and legendary fuel mileage.
- **Dirt Bike** (*Bike 2*) — Lightweight Hill Climb style motocross bike built for wheelies and flips.

## Stages / Backgrounds (5 Distinct Biomes)
1. **Countryside** — Classic lush green rolling hills with pine trees and boulders.
2. **Highway** — Paved NH asphalt flyover road with dashed lane markings, streetlights, steel guardrails, city skyline, and suspension bridge pylons.
3. **Village Field** — Desi gaon & sarson (mustard) khet with thatched mud huts, golden haystacks, mango/neem trees, temple spire, and flying bird flocks.
4. **Ladakh Pass** — High-altitude snow-capped Himalayan mountain pass with prayer flags.
5. **Thar Desert** — Sunset golden sand dunes with cacti and desert rocks.

## Gameplay & Rollover Death ("YOU DIED")
- **Rollover Death**: Overturning your car or bike onto its roof, hood, or driver head immediately triggers slow-motion crash physics and **"YOU DIED"**. Mid-air backflips and frontflips score `+1000` bonus coins when landed on the wheels.
- **Controls**:
  - **Gas / Nose Up (Backflip)**: Right on-screen `GAS` pedal or `Right Arrow` / `D` / `Up Arrow` / `W`
  - **Brake / Reverse / Nose Down (Frontflip)**: Left on-screen `BRAKE` pedal or `Left Arrow` / `A` / `Down Arrow` / `S`
  - **Pause / Resume**: `P` or `Esc`
  - **Quick Restart**: `R`

## Run Locally
```sh
npm install
npm run dev
npm run build
```
