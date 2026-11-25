import type { HillSimulation } from "./physics";
import { TERRAIN_STEP } from "./terrain";
import type { CoinItem, FuelItem, SceneryProp, StageSpec } from "./types";
import { drawVehicle } from "./vehicleArt";
import { PIXELS_PER_METER } from "./vehicles";

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

function drawCityAndBridgeHorizon(ctx: CanvasRenderingContext2D, camX: number) {
  // Far city skyline (0.08x parallax)
  const scrollFar = camX * 0.08;
  const span = 1600;
  ctx.fillStyle = "#334155";
  for (let i = -1; i < 18; i++) {
    const bx = (((i * 92 - scrollFar) % span) + span) % span - 140;
    const seed = Math.abs(Math.sin(i * 17.3));
    const bw = 44 + Math.floor(seed * 38);
    const bh = 70 + Math.floor(((i * 37) % 11) * 14);
    const by = 455 - bh;
    ctx.fillStyle = i % 2 === 0 ? "#334155" : "#3f4e63";
    ctx.fillRect(bx, by, bw, bh + 120);

    // Subtle lit office windows
    ctx.fillStyle = "rgba(254, 240, 138, 0.32)";
    for (let wy = by + 12; wy < 430; wy += 16) {
      for (let wx = bx + 8; wx < bx + bw - 10; wx += 12) {
        if ((wx + wy + i) % 3 === 0) {
          ctx.fillRect(wx, wy, 5, 7);
        }
      }
    }
  }

  // Mid-ground cable-stayed highway flyover bridge pylons (0.18x parallax)
  const scrollMid = camX * 0.18;
  const bridgeDeckY = 442;
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, bridgeDeckY, VIEW_WIDTH, 14);

  const pylonSpan = 640;
  for (let p = -1; p <= 3; p++) {
    const px = (((p * pylonSpan - scrollMid) % (pylonSpan * 3)) + pylonSpan * 3) % (pylonSpan * 3) - 220;
    // Tall A-frame bridge tower
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(px - 10, bridgeDeckY - 148, 20, 220);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(px - 5, bridgeDeckY - 154, 10, 6);

    // Stay cables fanning to deck
    ctx.strokeStyle = "rgba(226, 232, 240, 0.32)";
    ctx.lineWidth = 1.4;
    for (let c = 1; c <= 5; c++) {
      ctx.beginPath();
      ctx.moveTo(px, bridgeDeckY - 140 + c * 12);
      ctx.lineTo(px + c * 46, bridgeDeckY);
      ctx.moveTo(px, bridgeDeckY - 140 + c * 12);
      ctx.lineTo(px - c * 46, bridgeDeckY);
      ctx.stroke();
    }
  }
}

function drawVillageHorizon(ctx: CanvasRenderingContext2D, camX: number, time: number) {
  // Distant misty green hills
  drawMountainLayer(ctx, camX * 0.07, 395, 72, 0.004, "#7da87b", false);

  // Flying birds in V-formation
  const birdScroll = (camX * 0.06 + time * 26) % (VIEW_WIDTH + 300);
  ctx.strokeStyle = "rgba(30, 41, 59, 0.55)";
  ctx.lineWidth = 1.8;
  for (let b = 0; b < 6; b++) {
    const bx = VIEW_WIDTH + 120 - birdScroll + b * 24;
    const by = 148 + Math.abs(b - 2.5) * 11 + Math.sin(time * 7 + b) * 3;
    const wing = Math.sin(time * 9 + b * 0.8) * 4;
    ctx.beginPath();
    ctx.moveTo(bx - 6, by - wing);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + 6, by - wing);
    ctx.stroke();
  }

  // Mid-ground Indian village skyline (mud houses, temple spire, water tank, palm/mango silhouettes)
  const scrollMid = camX * 0.17;
  const clusterSpan = 720;
  ctx.fillStyle = "#4d7c3d";
  drawMountainLayer(ctx, scrollMid, 462, 42, 0.0065, "#588b48", false);

  for (let k = -1; k <= 3; k++) {
    const gx = (((k * clusterSpan - scrollMid) % (clusterSpan * 3)) + clusterSpan * 3) % (clusterSpan * 3) - 180;
    const baseY = 458;

    // Village Water Tank silhouette
    ctx.fillStyle = "#466d3b";
    ctx.fillRect(gx + 10, baseY - 68, 4, 68);
    ctx.fillRect(gx + 32, baseY - 68, 4, 68);
    ctx.fillRect(gx + 4, baseY - 92, 38, 26);

    // Temple Shikhar Spire + Flag
    ctx.beginPath();
    ctx.moveTo(gx + 120, baseY);
    ctx.lineTo(gx + 125, baseY - 46);
    ctx.lineTo(gx + 142, baseY - 88);
    ctx.lineTo(gx + 159, baseY - 46);
    ctx.lineTo(gx + 164, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(gx + 142, baseY - 98);
    ctx.lineTo(gx + 158, baseY - 93);
    ctx.lineTo(gx + 142, baseY - 88);
    ctx.closePath();
    ctx.fill();

    // Small village huts & trees along horizon
    ctx.fillStyle = "#3f6834";
    ctx.fillRect(gx + 210, baseY - 28, 44, 28);
    ctx.beginPath();
    ctx.moveTo(gx + 204, baseY - 28);
    ctx.lineTo(gx + 232, baseY - 48);
    ctx.lineTo(gx + 260, baseY - 28);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(gx + 305, baseY - 36, 26, 0, Math.PI * 2);
    ctx.arc(gx + 328, baseY - 28, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // Near khet terrace ridge
  drawMountainLayer(ctx, camX * 0.3, 508, 36, 0.009, "#3f7432", false);
}

function drawParallaxSkyAndMountains(
  ctx: CanvasRenderingContext2D,
  stage: StageSpec,
  camX: number,
  time: number,
) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, stage.skyTop);
  sky.addColorStop(0.56, stage.skyMid);
  sky.addColorStop(1, stage.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // Sun + warm halo
  const sunX = stage.id === "desert" ? 960 : stage.id === "highway" ? 900 : 1040;
  const sunY = stage.id === "desert" ? 185 : stage.id === "highway" ? 155 : 130;
  const halo = ctx.createRadialGradient(sunX, sunY, 16, sunX, sunY, 155);
  halo.addColorStop(0, stage.sunColor);
  halo.addColorStop(0.35, stage.sunGlow);
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 155, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = stage.sunColor;
  ctx.beginPath();
  ctx.arc(sunX, sunY, stage.id === "desert" ? 48 : 40, 0, Math.PI * 2);
  ctx.fill();

  // Drifting stylized clouds
  const cloudScroll = camX * 0.045 + time * 8;
  ctx.fillStyle =
    stage.id === "desert"
      ? "rgba(255, 234, 194, 0.52)"
      : stage.id === "highway"
        ? "rgba(255, 247, 237, 0.72)"
        : "rgba(255, 255, 255, 0.82)";
  for (let i = 0; i < 6; i++) {
    const span = VIEW_WIDTH + 320;
    const cx = (((i * 275 - cloudScroll) % span) + span) % span - 140;
    const cy = 78 + (i % 3) * 44;
    const sc = 0.78 + (i % 2) * 0.34;
    ctx.beginPath();
    ctx.arc(cx, cy, 24 * sc, 0, Math.PI * 2);
    ctx.arc(cx + 24 * sc, cy - 10 * sc, 30 * sc, 0, Math.PI * 2);
    ctx.arc(cx + 54 * sc, cy - 2 * sc, 22 * sc, 0, Math.PI * 2);
    ctx.arc(cx + 25 * sc, cy + 7 * sc, 24 * sc, 0, Math.PI * 2);
    ctx.fill();
  }

  if (stage.id === "highway") {
    drawCityAndBridgeHorizon(ctx, camX);
    drawMountainLayer(ctx, camX * 0.3, 512, 42, 0.008, stage.nearHills, false);
  } else if (stage.id === "village") {
    drawVillageHorizon(ctx, camX, time);
  } else {
    // Far mountain range (parallax 0.08x)
    drawMountainLayer(ctx, camX * 0.08, 365, 118, 0.0042, stage.farMountain, stage.id === "ladakh");
    // Mid hills (parallax 0.18x)
    drawMountainLayer(ctx, camX * 0.18, 435, 86, 0.0068, stage.midMountain, false);
    // Near ridge (parallax 0.32x)
    drawMountainLayer(ctx, camX * 0.32, 505, 58, 0.0095, stage.nearHills, false);
  }
}

function drawMountainLayer(
  ctx: CanvasRenderingContext2D,
  scrollX: number,
  baseY: number,
  amp: number,
  freq: number,
  color: string,
  snowCaps: boolean,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, VIEW_HEIGHT);
  const step = 28;
  const peaks: { x: number; y: number }[] = [];
  for (let sx = 0; sx <= VIEW_WIDTH + step; sx += step) {
    const wx = sx + scrollX;
    const h =
      Math.sin(wx * freq) * amp * 0.58 +
      Math.sin(wx * freq * 2.13 + 1.4) * amp * 0.3 +
      Math.cos(wx * freq * 0.52 + 0.7) * amp * 0.25;
    const y = baseY - Math.abs(h);
    ctx.lineTo(sx, y);
    peaks.push({ x: sx, y });
  }
  ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
  ctx.closePath();
  ctx.fill();

  if (snowCaps) {
    ctx.fillStyle = "rgba(241, 248, 255, 0.85)";
    for (let i = 1; i < peaks.length - 1; i++) {
      if (peaks[i].y < peaks[i - 1].y && peaks[i].y <= peaks[i + 1].y && peaks[i].y < baseY - amp * 0.42) {
        const px = peaks[i].x;
        const py = peaks[i].y;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 34, py + 38);
        ctx.lineTo(px + 12, py + 30);
        ctx.lineTo(px, py + 42);
        ctx.lineTo(px - 14, py + 29);
        ctx.lineTo(px - 34, py + 38);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

function drawSceneryProp(ctx: CanvasRenderingContext2D, prop: SceneryProp, groundY: number, time: number) {
  ctx.save();
  ctx.translate(prop.x, groundY + 4);
  ctx.scale(prop.scale, prop.scale);

  switch (prop.kind) {
    case "pine": {
      ctx.fillStyle = "#5c3a21";
      ctx.fillRect(-6, -24, 12, 26);
      const greens = ["#216336", "#2c7c42", "#399750"];
      for (let tier = 0; tier < 3; tier++) {
        ctx.fillStyle = greens[tier];
        const yBase = -18 - tier * 24;
        const w = 34 - tier * 7;
        ctx.beginPath();
        ctx.moveTo(0, yBase - 34);
        ctx.lineTo(w, yBase);
        ctx.lineTo(-w, yBase);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "bush": {
      ctx.fillStyle = "#2d8a39";
      ctx.beginPath();
      ctx.arc(-14, -8, 14, 0, Math.PI * 2);
      ctx.arc(0, -14, 18, 0, Math.PI * 2);
      ctx.arc(15, -8, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#48b849";
      ctx.beginPath();
      ctx.arc(-4, -17, 10, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "rock": {
      ctx.fillStyle = prop.variant === 0 ? "#64748b" : "#78716c";
      ctx.beginPath();
      ctx.moveTo(-20, 2);
      ctx.lineTo(-14, -14);
      ctx.lineTo(2, -19);
      ctx.lineTo(18, -10);
      ctx.lineTo(22, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.beginPath();
      ctx.moveTo(-14, -14);
      ctx.lineTo(2, -19);
      ctx.lineTo(4, -5);
      ctx.lineTo(-10, -4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "cactus": {
      ctx.fillStyle = "#2e8540";
      ctx.strokeStyle = "#1b5428";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-7, -58, 14, 60, 7);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-22, -42, 16, 9, 4);
      ctx.roundRect(-22, -52, 9, 18, 4);
      ctx.roundRect(6, -34, 16, 9, 4);
      ctx.roundRect(13, -46, 9, 20, 4);
      ctx.fill();
      break;
    }
    case "flag_pole": {
      ctx.fillStyle = "#78350f";
      ctx.fillRect(-3, -68, 6, 70);
      const colors = ["#3b82f6", "#f8fafc", "#ef4444", "#22c55e", "#facc15"];
      for (let i = 0; i < 5; i++) {
        const wave = Math.sin(time * 5 + i * 0.9) * 3;
        ctx.fillStyle = colors[i];
        ctx.fillRect(3 + i * 11, -64 + i * 2 + wave, 9, 11);
      }
      break;
    }
    case "post": {
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(-4, -30, 8, 32);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-4, -26, 8, 7);
      break;
    }

    // ======== HIGHWAY PROPS ========
    case "streetlight": {
      // Galvanized curved highway lamppost + glowing LED head
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.lineTo(0, -108);
      ctx.quadraticCurveTo(0, -126, 26, -126);
      ctx.stroke();

      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(18, -130, 18, 7, 3);
      ctx.fill();

      // Warm highway lamp glow
      const glow = ctx.createRadialGradient(27, -122, 2, 27, -122, 30);
      glow.addColorStop(0, "rgba(254, 249, 195, 0.85)");
      glow.addColorStop(1, "rgba(254, 249, 195, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(27, -122, 30, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "highway_sign": {
      // Green National Highway NH-44 Reflective Board
      ctx.fillStyle = "#64748b";
      ctx.fillRect(-26, -68, 5, 70);
      ctx.fillRect(21, -68, 5, 70);

      ctx.fillStyle = "#15803d";
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.roundRect(-42, -104, 84, 40, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.font = "700 10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      const labelTop = prop.variant === 0 ? "NH-44" : prop.variant === 1 ? "EXPRESS" : "SPEED 90";
      const labelSub = prop.variant === 0 ? "HIGHWAY" : prop.variant === 1 ? "FLYOVER" : "KEEP GO";
      ctx.fillText(labelTop, 0, -88);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 11px Inter, sans-serif";
      ctx.fillText(labelSub, 0, -72);
      break;
    }
    case "guardrail": {
      // Steel highway crash barrier section + reflectors
      ctx.fillStyle = "#475569";
      ctx.fillRect(-34, -24, 5, 26);
      ctx.fillRect(0, -24, 5, 26);
      ctx.fillRect(34, -24, 5, 26);

      ctx.fillStyle = "#cbd5e1";
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-42, -23, 88, 11, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(-33, -19, 3, 4);
      ctx.fillRect(1, -19, 3, 4);
      ctx.fillRect(35, -19, 3, 4);
      break;
    }
    case "milestone": {
      // Classic Indian yellow-top & white-bottom highway km stone
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-11, 2);
      ctx.lineTo(-11, -18);
      ctx.arc(0, -18, 11, Math.PI, Math.PI * 2);
      ctx.lineTo(11, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(0, -18, 10.2, Math.PI, Math.PI * 2);
      ctx.fill();
      break;
    }

    // ======== INDIAN VILLAGE FIELD PROPS ========
    case "hut": {
      // Desi Village Mud House (Jhopdi) with Thatched Chhappar Roof
      ctx.fillStyle = "#c28e5c";
      ctx.strokeStyle = "#784c24";
      ctx.lineWidth = 1.8;
      ctx.fillRect(-34, -46, 68, 48);
      ctx.strokeRect(-34, -46, 68, 48);

      // Decorative white village wall border
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillRect(-34, -10, 68, 3);

      // Wooden doorway & small window
      ctx.fillStyle = "#451a03";
      ctx.beginPath();
      ctx.roundRect(-9, -31, 18, 33, [5, 5, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#78350f";
      ctx.fillRect(15, -30, 11, 11);

      // Golden straw thatched roof
      ctx.fillStyle = "#d99b26";
      ctx.strokeStyle = "#854d0e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-44, -44);
      ctx.lineTo(0, -78);
      ctx.lineTo(44, -44);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Straw texture lines
      ctx.strokeStyle = "rgba(133, 77, 14, 0.45)";
      ctx.lineWidth = 1.3;
      for (let s = -28; s <= 28; s += 14) {
        ctx.beginPath();
        ctx.moveTo(0, -76);
        ctx.lineTo(s * 1.3, -45);
        ctx.stroke();
      }
      break;
    }
    case "haystack": {
      // Village Bhusa / Chara Golden Haystack with Center Bamboo Pole
      ctx.fillStyle = "#78350f";
      ctx.fillRect(-2.5, -62, 5, 64);

      const hayGrad = ctx.createLinearGradient(0, -52, 0, 2);
      hayGrad.addColorStop(0, "#facc15");
      hayGrad.addColorStop(1, "#ca8a04");
      ctx.fillStyle = hayGrad;
      ctx.strokeStyle = "#854d0e";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-28, 2);
      ctx.quadraticCurveTo(-24, -44, 0, -52);
      ctx.quadraticCurveTo(24, -44, 28, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "mango_tree": {
      // Lush Indian Mango / Neem Village Tree
      ctx.fillStyle = "#5c3a21";
      ctx.beginPath();
      ctx.moveTo(-8, 4);
      ctx.lineTo(-5, -46);
      ctx.lineTo(6, -46);
      ctx.lineTo(9, 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#1f6f31";
      ctx.beginPath();
      ctx.arc(-22, -56, 22, 0, Math.PI * 2);
      ctx.arc(22, -54, 21, 0, Math.PI * 2);
      ctx.arc(0, -72, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#349e44";
      ctx.beginPath();
      ctx.arc(-10, -68, 18, 0, Math.PI * 2);
      ctx.arc(14, -64, 16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "crop_patch": {
      // Swaying Yellow Sarson (Mustard) & Sugarcane Field Patch
      const sway = Math.sin(time * 3.2 + prop.x * 0.04) * 4;
      ctx.strokeStyle = "#2e7d32";
      ctx.lineWidth = 2.4;
      for (let i = -3; i <= 3; i++) {
        const sx = i * 9;
        const h = 24 + ((Math.abs(i) * 7) % 11);
        ctx.beginPath();
        ctx.moveTo(sx, 2);
        ctx.quadraticCurveTo(sx + sway * 0.5, -h * 0.5, sx + sway, -h);
        ctx.stroke();

        // Bright yellow mustard blossom cluster at stalk tip
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(sx + sway, -h, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

function drawSignpost(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  label: string,
  accent: string,
  isBest = false,
  time = 0,
) {
  ctx.save();
  ctx.translate(x, groundY + 4);

  if (isBest) {
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(-2.5, -92, 5, 94);
    const wave = Math.sin(time * 6) * 4;
    ctx.fillStyle = "#0ea5e9";
    ctx.strokeStyle = "#0c4a6e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, -90);
    ctx.lineTo(66, -86 + wave);
    ctx.lineTo(56, -72 + wave * 0.7);
    ctx.lineTo(66, -58 + wave);
    ctx.lineTo(2, -56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 13px 'Barlow Condensed', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, 9, -68 + wave * 0.4);
  } else {
    ctx.fillStyle = "#6b4226";
    ctx.fillRect(-4, -60, 8, 62);
    ctx.fillStyle = "#fef3c7";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-34, -84, 68, 30, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.fillRect(-30, -80, 60, 5);

    ctx.fillStyle = "#292524";
    ctx.font = "700 16px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, -61);
  }
  ctx.restore();
}

function drawCoin(ctx: CanvasRenderingContext2D, coin: CoinItem, time: number) {
  const spin = Math.cos(time * 4.2 + coin.phase);
  const scaleX = 0.35 + Math.abs(spin) * 0.65;
  const bob = Math.sin(time * 3.2 + coin.phase) * 3.5;
  const radius = coin.value >= 500 ? 19 : coin.value >= 100 ? 17 : 15;

  ctx.save();
  ctx.translate(coin.x, coin.y + bob);
  ctx.scale(scaleX, 1);

  const outer = coin.value >= 500 ? "#f59e0b" : coin.value >= 100 ? "#eab308" : "#facc15";
  const rim = coin.value >= 500 ? "#92400e" : "#a16207";
  ctx.fillStyle = outer;
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#fef08a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#713f12";
  ctx.font = `700 ${coin.value >= 100 ? 10 : 12}px 'IBM Plex Mono', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(coin.value), 0, 1);
  ctx.restore();
}

function drawFuelCan(ctx: CanvasRenderingContext2D, item: FuelItem, time: number) {
  const bob = Math.sin(time * 3.6) * 4;
  ctx.save();
  ctx.translate(item.x, item.y + bob);

  const pulse = 0.25 + 0.14 * Math.sin(time * 5);
  ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#991b1b";
  ctx.fillRect(-13, -24, 18, 6);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(7, -25, 8, 7);

  ctx.fillStyle = "#ef4444";
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(-17, -19, 34, 39, 5);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(127, 29, 29, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-11, -11);
  ctx.lineTo(11, 13);
  ctx.moveTo(11, -11);
  ctx.lineTo(-11, 13);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(-14, -6, 28, 13, 3);
  ctx.fill();
  ctx.fillStyle = "#b91c1c";
  ctx.font = "800 9.5px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("FUEL", 0, 1);

  ctx.restore();
}

function drawTerrain(ctx: CanvasRenderingContext2D, sim: HillSimulation, leftX: number, rightX: number, bottomY: number) {
  const { terrain, stage } = sim;
  const startIdx = Math.max(0, terrain.getIndexForX(leftX) - 2);
  const endIdx = Math.min(terrain.getSampleCount() - 1, terrain.getIndexForX(rightX) + 3);
  if (endIdx <= startIdx) return;

  const first = terrain.getSample(startIdx);
  const last = terrain.getSample(endIdx);

  // Soil / Road Embankment body polygon
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(first.x, bottomY);
  for (let i = startIdx; i <= endIdx; i++) {
    const pt = terrain.getSample(i);
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.lineTo(last.x, bottomY);
  ctx.closePath();

  const soilGrad = ctx.createLinearGradient(0, sim.camY - 120, 0, bottomY);
  soilGrad.addColorStop(0, stage.soilTop);
  soilGrad.addColorStop(1, stage.soilDeep);
  ctx.fillStyle = soilGrad;
  ctx.fill();

  ctx.clip();

  // Subsurface strata ribbon
  ctx.strokeStyle = stage.soilStripe;
  ctx.lineWidth = 24;
  ctx.beginPath();
  for (let i = startIdx; i <= endIdx; i++) {
    const pt = terrain.getSample(i);
    if (i === startIdx) ctx.moveTo(pt.x, pt.y + 42);
    else ctx.lineTo(pt.x, pt.y + 42);
  }
  ctx.stroke();

  // Embedded pebbles / concrete stones
  ctx.fillStyle = stage.pebbleColor;
  const gridStep = 4;
  const alignedStart = Math.floor(startIdx / gridStep) * gridStep;
  for (let i = alignedStart; i <= endIdx; i += gridStep) {
    const pt = terrain.getSample(i);
    const seed = Math.sin(i * 19.7) * 43758.5;
    const r = seed - Math.floor(seed);
    const depth = 34 + r * 115;
    const rx = 5 + ((i * 7) % 8);
    const ry = 3 + ((i * 3) % 5);
    ctx.beginPath();
    ctx.ellipse(pt.x + (r - 0.5) * TERRAIN_STEP * 2, pt.y + depth, rx, ry, r * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Top Surface Ribbon (Custom Asphalt Road for Highway vs Crops/Grass/Rock/Sand)
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stage.surfaceType === "asphalt") {
    // Concrete highway sub-curb
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 22;
    ctx.beginPath();
    for (let i = startIdx; i <= endIdx; i++) {
      const pt = terrain.getSample(i);
      if (i === startIdx) ctx.moveTo(pt.x, pt.y + 9);
      else ctx.lineTo(pt.x, pt.y + 9);
    }
    ctx.stroke();

    // Thick dark tarmac asphalt surface
    ctx.strokeStyle = "#1f242d";
    ctx.lineWidth = 17;
    ctx.beginPath();
    for (let i = startIdx; i <= endIdx; i++) {
      const pt = terrain.getSample(i);
      if (i === startIdx) ctx.moveTo(pt.x, pt.y + 3);
      else ctx.lineTo(pt.x, pt.y + 3);
    }
    ctx.stroke();

    // Yellow highway shoulder edge stripe
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = startIdx; i <= endIdx; i++) {
      const pt = terrain.getSample(i);
      if (i === startIdx) ctx.moveTo(pt.x, pt.y - 3.5);
      else ctx.lineTo(pt.x, pt.y - 3.5);
    }
    ctx.stroke();

    // Dashed white highway center-line markings!
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 3.2;
    ctx.setLineDash([24, 22]);
    ctx.lineDashOffset = -(first.x % 46);
    ctx.beginPath();
    for (let i = startIdx; i <= endIdx; i++) {
      const pt = terrain.getSample(i);
      if (i === startIdx) ctx.moveTo(pt.x, pt.y + 4);
      else ctx.lineTo(pt.x, pt.y + 4);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // Natural turf / Village Sarson Khet / Rock / Sand
    ctx.strokeStyle = stage.turfShadow;
    ctx.lineWidth = 17;
    ctx.beginPath();
    for (let i = startIdx; i <= endIdx; i++) {
      const pt = terrain.getSample(i);
      if (i === startIdx) ctx.moveTo(pt.x, pt.y + 6);
      else ctx.lineTo(pt.x, pt.y + 6);
    }
    ctx.stroke();

    ctx.strokeStyle = stage.turfMain;
    ctx.lineWidth = 12;
    ctx.beginPath();
    for (let i = startIdx; i <= endIdx; i++) {
      const pt = terrain.getSample(i);
      if (i === startIdx) ctx.moveTo(pt.x, pt.y + 1);
      else ctx.lineTo(pt.x, pt.y + 1);
    }
    ctx.stroke();

    ctx.strokeStyle = stage.turfHighlight;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = startIdx; i <= endIdx; i++) {
      const pt = terrain.getSample(i);
      if (i === startIdx) ctx.moveTo(pt.x, pt.y - 2);
      else ctx.lineTo(pt.x, pt.y - 2);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function renderHillScene(ctx: CanvasRenderingContext2D, sim: HillSimulation) {
  const { width, height } = ctx.canvas;
  if (width < 1 || height < 1) return;

  ctx.save();
  ctx.scale(width / VIEW_WIDTH, height / VIEW_HEIGHT);

  // 1. Sky, sun, clouds & stage-specific parallax horizon
  drawParallaxSkyAndMountains(ctx, sim.stage, sim.camX, sim.time);

  // 2. World camera transform
  const shakeX = sim.shake > 0 ? (Math.random() - 0.5) * sim.shake * 2 : 0;
  const shakeY = sim.shake > 0 ? (Math.random() - 0.5) * sim.shake * 2 : 0;

  ctx.save();
  ctx.translate(VIEW_WIDTH * 0.44 + shakeX, VIEW_HEIGHT * 0.54 + shakeY);
  ctx.scale(sim.camZoom, sim.camZoom);
  ctx.translate(-sim.camX, -sim.camY);

  const halfW = (VIEW_WIDTH * 0.65) / sim.camZoom;
  const halfH = (VIEW_HEIGHT * 0.72) / sim.camZoom;
  const leftX = sim.camX - halfW;
  const rightX = sim.camX + halfW;
  const bottomY = sim.camY + halfH + 300;

  // 3. Background scenery props along terrain crest
  for (const prop of sim.terrain.props) {
    if (prop.x < leftX - 120) continue;
    if (prop.x > rightX + 120) break;
    drawSceneryProp(ctx, prop, sim.terrain.getHeight(prop.x), sim.time);
  }

  // 4. Start signpost, 100m distance signposts, and BEST flag
  const startX = 80;
  if (startX >= leftX - 80 && startX <= rightX + 80) {
    drawSignpost(ctx, startX - 90, sim.terrain.getHeight(startX - 90), "START", "#22c55e");
  }

  const firstMilestone = Math.max(100, Math.floor((leftX - startX) / (PIXELS_PER_METER * 100)) * 100);
  const lastMilestone = Math.ceil((rightX - startX) / (PIXELS_PER_METER * 100)) * 100;
  for (let m = firstMilestone; m <= lastMilestone; m += 100) {
    if (m <= 0) continue;
    const mx = startX + m * PIXELS_PER_METER;
    drawSignpost(ctx, mx, sim.terrain.getHeight(mx), `${m}m`, "#f97316");
  }

  if (sim.bestDistance > 0) {
    const bestX = startX + sim.bestDistance * PIXELS_PER_METER;
    if (bestX >= leftX - 90 && bestX <= rightX + 90) {
      drawSignpost(ctx, bestX, sim.terrain.getHeight(bestX), `BEST ${sim.bestDistance}m`, "#0ea5e9", true, sim.time);
    }
  }

  // 5. Stratified hilly terrain / highway road
  drawTerrain(ctx, sim, leftX, rightX, bottomY);

  // 6. Collectible Coins & Fuel Cans
  for (const coin of sim.terrain.coins) {
    if (coin.collected) continue;
    if (coin.x < leftX - 40) continue;
    if (coin.x > rightX + 40) break;
    drawCoin(ctx, coin, sim.time);
  }

  for (const item of sim.terrain.fuels) {
    if (item.collected) continue;
    if (item.x < leftX - 60) continue;
    if (item.x > rightX + 60) break;
    drawFuelCan(ctx, item, sim.time);
  }

  // 7. Soft contact shadow on ground beneath vehicle
  const groundUnder = sim.terrain.getHeight(sim.cx);
  const elev = Math.max(0, groundUnder - sim.cy - 30);
  const shadowAlpha = Math.max(0, 0.32 - elev * 0.0018);
  if (shadowAlpha > 0.02) {
    const norm = sim.terrain.getNormal(sim.cx);
    const slopeAngle = Math.atan2(norm.nx, -norm.ny);
    ctx.save();
    ctx.translate(sim.cx, groundUnder + 3);
    ctx.rotate(slopeAngle);
    ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, sim.spec.category === "bike" ? 50 : 76, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 8. Vehicle (Chassis + Animated Suspension + Spinning Wheels + Driver)
  ctx.save();
  ctx.translate(sim.cx, sim.cy);
  ctx.rotate(sim.angle);
  drawVehicle(ctx, sim.spec, {
    rearWheelLocal: {
      x: sim.spec.rearWheel.x,
      y: sim.spec.rearWheel.y + sim.wheels[0].ext,
      angle: sim.wheels[0].angle,
    },
    frontWheelLocal: {
      x: sim.spec.frontWheel.x,
      y: sim.spec.frontWheel.y + sim.wheels[1].ext,
      angle: sim.wheels[1].angle,
    },
    driverLean: sim.driverLean,
    headBob: sim.headBob,
    gas: sim.gasHeld && !sim.outOfFuel,
    brake: sim.brakeHeld,
    crashed: sim.gameOverReason === "died",
  });
  ctx.restore();

  // 9. Particles (dirt, smoke, golden sparkles, crash stars)
  for (const p of sim.particles) {
    const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.kind === "star") {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life * 6);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const a2 = a1 + Math.PI / 5;
        if (i === 0) ctx.moveTo(Math.cos(a1) * p.size, Math.sin(a1) * p.size);
        else ctx.lineTo(Math.cos(a1) * p.size, Math.sin(a1) * p.size);
        ctx.lineTo(Math.cos(a2) * p.size * 0.45, Math.sin(a2) * p.size * 0.45);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 10. Floating Stunt & Bonus Text Popups
  for (const pop of sim.popups) {
    const alpha = Math.min(1, (pop.life / pop.maxLife) * 2.2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(pop.x, pop.y);
    ctx.scale(pop.scale, pop.scale);
    ctx.textAlign = "center";
    ctx.font = "italic 800 30px 'Barlow Condensed', Impact, sans-serif";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeText(pop.text, 0, 0);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, 0, 0);

    if (pop.subtext) {
      ctx.font = "700 17px 'IBM Plex Mono', monospace";
      ctx.lineWidth = 4;
      ctx.strokeText(pop.subtext, 0, 22);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(pop.subtext, 0, 22);
    }
    ctx.restore();
  }

  ctx.restore(); // end world camera

  // 11. Crimson Rollover Death Screen Vignette & Impact Flash
  if (sim.gameOverReason === "died") {
    const vig = ctx.createRadialGradient(
      VIEW_WIDTH * 0.5,
      VIEW_HEIGHT * 0.5,
      VIEW_WIDTH * 0.2,
      VIEW_WIDTH * 0.5,
      VIEW_HEIGHT * 0.5,
      VIEW_WIDTH * 0.65,
    );
    vig.addColorStop(0, `rgba(220, 38, 38, ${sim.deathFlash * 0.25})`);
    vig.addColorStop(1, `rgba(127, 29, 29, ${0.42 + sim.deathFlash * 0.35})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  ctx.restore(); // end 1280x720 scale
}
