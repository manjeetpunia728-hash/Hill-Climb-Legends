import type { VehicleSpec } from "./types";

export interface VehicleRenderPose {
  rearWheelLocal: { x: number; y: number; angle: number };
  frontWheelLocal: { x: number; y: number; angle: number };
  driverLean: number;
  headBob: number;
  gas: boolean;
  brake: boolean;
  crashed: boolean;
}

function drawCoilSpring(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  coils: number,
  width: number,
  color: string,
  rodColor = "#cbd5e1",
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  // Inner hydraulic damper piston rod
  ctx.save();
  ctx.strokeStyle = rodColor;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Coil zig-zag
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x1 + ux * 3, y1 + uy * 3);
  for (let i = 1; i <= coils; i++) {
    const t = 0.12 + (i / (coils + 1)) * 0.76;
    const side = i % 2 === 0 ? 1 : -1;
    ctx.lineTo(x1 + dx * t + px * width * side, y1 + dy * t + py * width * side);
  }
  ctx.lineTo(x2 - ux * 3, y2 - uy * 3);
  ctx.stroke();
  ctx.restore();
}

function drawDriverHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tilt: number,
  capColor: string,
  crashed: boolean,
  sunglasses = false,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  // Neck & shoulder collar
  ctx.fillStyle = "#f1c29b";
  ctx.fillRect(-3.5, 4, 7, 8);

  // Head
  ctx.fillStyle = "#f7cba4";
  ctx.strokeStyle = "#4a2c18";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair / Cap
  ctx.fillStyle = capColor;
  ctx.beginPath();
  ctx.arc(0, -1.5, 9.8, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fill();
  // Cap brim facing forward
  ctx.beginPath();
  ctx.moveTo(3, -5.5);
  ctx.lineTo(13.5, -3.5);
  ctx.lineTo(12, -1.5);
  ctx.lineTo(3, -2.5);
  ctx.closePath();
  ctx.fill();

  // Eye / Sunglasses
  if (crashed) {
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(2, -2.5);
    ctx.lineTo(6.5, 1.5);
    ctx.moveTo(6.5, -2.5);
    ctx.lineTo(2, 1.5);
    ctx.stroke();
  } else if (sunglasses) {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(1.5, -2.8, 7.5, 3.6);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(2.5, -2.2, 2.5, 1.2);
  } else {
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(4.5, -1, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Smile / expression
  ctx.strokeStyle = "#7c3f23";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  if (crashed) {
    ctx.arc(4.5, 5, 2.5, Math.PI, Math.PI * 2);
  } else {
    ctx.arc(4.2, 2.6, 2.6, 0.1, Math.PI * 0.85);
  }
  ctx.stroke();

  ctx.restore();
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  angle: number,
  style: "fortuner" | "scorpio" | "thar" | "monster" | "splendor" | "bike",
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Outer tread lugs (sleeker commuter tread for Splendor, knobby for off-roaders)
  const lugCount = style === "monster" ? 16 : style === "bike" ? 18 : style === "splendor" ? 20 : 14;
  const lugDepth = style === "monster" ? 3.8 : style === "bike" ? 2.6 : style === "splendor" ? 1.4 : 2.2;
  ctx.fillStyle = "#14161a";
  for (let i = 0; i < lugCount; i++) {
    const a = (i / lugCount) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(radius - lugDepth, -2.4, lugDepth + 1, 4.8);
    ctx.restore();
  }

  // Rubber tire sidewall
  const tireGrad = ctx.createRadialGradient(0, 0, radius * 0.45, 0, 0, radius);
  tireGrad.addColorStop(0, "#2d3138");
  tireGrad.addColorStop(0.7, "#1b1e23");
  tireGrad.addColorStop(1, "#0f1115");
  ctx.fillStyle = tireGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Tire sidewall highlight ring
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
  ctx.stroke();

  // Rim / Alloy
  const rimR =
    style === "bike" || style === "splendor"
      ? radius * 0.69
      : style === "monster"
        ? radius * 0.48
        : radius * 0.58;

  if (style === "splendor") {
    // Classic Hero Splendor 5-spoke silver alloy wheel + drum hub
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.arc(0, 0, rimR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rimR, Math.sin(a) * rimR);
      ctx.stroke();
    }
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.arc(0, 0, rimR * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === "bike") {
    // Wire-spoked motocross rim
    ctx.strokeStyle = "#d4d8e0";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, rimR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rimR, Math.sin(a) * rimR);
      ctx.stroke();
    }
    // Brake rotor & hub
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.arc(0, 0, rimR * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Dark inner barrel
    ctx.fillStyle = "#171c24";
    ctx.beginPath();
    ctx.arc(0, 0, rimR, 0, Math.PI * 2);
    ctx.fill();

    // Outer alloy lip
    ctx.strokeStyle = style === "monster" ? "#fbbf24" : style === "thar" ? "#cbd5e1" : "#e2e8f0";
    ctx.lineWidth = style === "monster" ? 2.8 : 2.1;
    ctx.beginPath();
    ctx.arc(0, 0, rimR, 0, Math.PI * 2);
    ctx.stroke();

    const spokes = style === "fortuner" ? 6 : style === "scorpio" ? 5 : style === "monster" ? 6 : 5;
    ctx.fillStyle = style === "fortuner" ? "#f1f5f9" : style === "scorpio" ? "#cbd5e1" : style === "monster" ? "#f59e0b" : "#94a3b8";
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(3, -2.2);
      ctx.lineTo(rimR - 1, -1.6);
      ctx.lineTo(rimR - 1, 1.6);
      ctx.lineTo(3, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Center cap
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, 0, rimR * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style === "fortuner" ? "#e2e8f0" : style === "scorpio" ? "#38bdf8" : style === "monster" ? "#fbbf24" : "#ef4444";
    ctx.beginPath();
    ctx.arc(0, 0, rimR * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * 1. FORTUNER — Pearl White Legender 4x4 SUV
 */
function drawFortuner(ctx: CanvasRenderingContext2D, spec: VehicleSpec, pose: VehicleRenderPose) {
  const rw = pose.rearWheelLocal;
  const fw = pose.frontWheelLocal;

  // Suspension struts behind body
  drawCoilSpring(ctx, spec.rearWheel.x, spec.rearWheel.y - 6, rw.x, rw.y, 5, 4.2, "#ef4444");
  drawCoilSpring(ctx, spec.frontWheel.x, spec.frontWheel.y - 6, fw.x, fw.y, 5, 4.2, "#ef4444");

  // Undercarriage chassis frame & exhaust pipe
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-74, 10, 146, 8);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(-81, 12, 10, 4.5);

  // Main Pearl White sculpted SUV silhouette
  const bodyGrad = ctx.createLinearGradient(0, -40, 0, 18);
  bodyGrad.addColorStop(0, "#ffffff");
  bodyGrad.addColorStop(0.55, "#f1f5f9");
  bodyGrad.addColorStop(1, "#cbd5e1");

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-76, 12);
  ctx.lineTo(-78, -8);
  ctx.lineTo(-71, -33);
  ctx.lineTo(-65, -39); // rear roof spoiler lip
  ctx.lineTo(18, -39);  // flat sleek SUV roof
  ctx.lineTo(40, -16);  // raked windshield
  ctx.lineTo(74, -12);  // tall muscular Fortuner hood
  ctx.lineTo(81, -4);   // aggressive front grille slope
  ctx.lineTo(81, 11);   // front bumper
  ctx.lineTo(74, 15);
  ctx.lineTo(-71, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Contrasting Gloss Black Legender Roof + Silver Roof Rails
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(-66, -39);
  ctx.lineTo(18, -39);
  ctx.lineTo(22, -34);
  ctx.lineTo(-69, -34);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-56, -42);
  ctx.lineTo(12, -42);
  ctx.stroke();
  ctx.fillStyle = "#64748b";
  ctx.fillRect(-52, -42, 4, 4);
  ctx.fillRect(6, -42, 4, 4);

  // Side window greenhouse with signature Fortuner rising chrome beltline kink at C-pillar!
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(-64, -18);
  ctx.lineTo(-61, -33);
  ctx.lineTo(16, -33);
  ctx.lineTo(34, -15);
  ctx.lineTo(-32, -15);
  ctx.lineTo(-46, -21); // signature upswept Fortuner kink!
  ctx.closePath();
  ctx.fill();

  // Driver inside front window
  ctx.save();
  ctx.beginPath();
  ctx.rect(-18, -34, 46, 20);
  ctx.clip();
  drawDriverHead(ctx, -3, -24 + pose.headBob * 0.6, pose.driverLean * 0.6, "#1e293b", pose.crashed, true);
  ctx.restore();

  // Glass sheen & pillars
  ctx.fillStyle = "rgba(186, 230, 253, 0.18)";
  ctx.beginPath();
  ctx.moveTo(2, -32);
  ctx.lineTo(15, -32);
  ctx.lineTo(31, -16);
  ctx.lineTo(14, -16);
  ctx.closePath();
  ctx.fill();

  // B-pillar & C-pillar dividers
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-16, -34, 5, 19);
  ctx.fillRect(-45, -34, 5, 16);

  // Chrome window trim line
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-64, -18);
  ctx.lineTo(-46, -21);
  ctx.lineTo(-32, -15);
  ctx.lineTo(34, -15);
  ctx.stroke();

  // Door seam lines & chrome handles
  ctx.strokeStyle = "rgba(51, 65, 85, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, -15);
  ctx.lineTo(-14, 11);
  ctx.moveTo(27, -15);
  ctx.lineTo(27, 11);
  ctx.stroke();

  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(-7, -9, 9, 2.6);
  ctx.fillRect(-35, -9, 9, 2.6);

  // Side mirror
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(24, -19, 8, 5, 2);
  ctx.fill();

  // Sculpted door character crease & 4x4 badge
  ctx.strokeStyle = "rgba(100, 116, 139, 0.35)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-34, 3);
  ctx.lineTo(33, 1);
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 7.5px Inter, sans-serif";
  ctx.fillText("FORTUNER", -30, 8);

  // Side footstep
  ctx.fillStyle = "#334155";
  ctx.fillRect(-29, 13, 58, 4.5);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(-28, 13, 56, 1.5);

  // Black front grille & sporty lower chin
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(75, -5, 6.5, 16);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(76, -3, 5, 1.5);
  ctx.fillRect(76, 1, 5, 1.5);

  // Sharp LED Headlight + headlight glow beam when accelerating
  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath();
  ctx.moveTo(64, -10);
  ctx.lineTo(79, -9);
  ctx.lineTo(79, -3);
  ctx.lineTo(68, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(67, -6, 11, 1.8);

  if (pose.gas) {
    const beam = ctx.createLinearGradient(80, -6, 155, -6);
    beam.addColorStop(0, "rgba(224, 242, 254, 0.36)");
    beam.addColorStop(1, "rgba(224, 242, 254, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(80, -9);
    ctx.lineTo(155, -24);
    ctx.lineTo(155, 14);
    ctx.lineTo(80, -2);
    ctx.closePath();
    ctx.fill();
  }

  // Sleek Rear LED Taillight (bright glow on brake)
  ctx.fillStyle = pose.brake ? "#ff2a2a" : "#b91c1c";
  ctx.fillRect(-78, -14, 12, 5.5);
  if (pose.brake) {
    ctx.fillStyle = "rgba(255, 42, 42, 0.45)";
    ctx.beginPath();
    ctx.arc(-76, -11, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  // Trapezoidal black wheel arch cutouts
  for (const wx of [spec.rearWheel.x, spec.frontWheel.x]) {
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(wx, 17, 25, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(wx, 17, 25.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }

  // Wheels
  drawWheel(ctx, rw.x, rw.y, spec.rearWheel.radius, rw.angle, "fortuner");
  drawWheel(ctx, fw.x, fw.y, spec.frontWheel.radius, fw.angle, "fortuner");
}

/**
 * 2. SCORPIO — Jet Black Muscular Boxy SUV
 */
function drawScorpio(ctx: CanvasRenderingContext2D, spec: VehicleSpec, pose: VehicleRenderPose) {
  const rw = pose.rearWheelLocal;
  const fw = pose.frontWheelLocal;

  drawCoilSpring(ctx, spec.rearWheel.x, spec.rearWheel.y - 6, rw.x, rw.y, 5, 4.2, "#38bdf8");
  drawCoilSpring(ctx, spec.frontWheel.x, spec.frontWheel.y - 6, fw.x, fw.y, 5, 4.2, "#38bdf8");

  // Undercarriage & exhaust
  ctx.fillStyle = "#111827";
  ctx.fillRect(-68, 10, 136, 8);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(-75, 12, 9, 4.5);

  // Iconic Gloss Black Muscular Boxy Scorpio Silhouette
  const bodyGrad = ctx.createLinearGradient(0, -42, 0, 16);
  bodyGrad.addColorStop(0, "#334155");
  bodyGrad.addColorStop(0.28, "#141821");
  bodyGrad.addColorStop(0.75, "#0b0f17");
  bodyGrad.addColorStop(1, "#1e293b");

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(-71, 13);
  ctx.lineTo(-72, -35); // proud upright boxy Scorpio tailgate!
  ctx.lineTo(-65, -41); // roof spoiler edge
  ctx.lineTo(18, -41);  // tall high roof
  ctx.lineTo(36, -15);  // upright windscreen
  ctx.lineTo(69, -14);  // muscular flat hood
  ctx.lineTo(75, -5);   // aggressive front nose
  ctx.lineTo(75, 12);
  ctx.lineTo(68, 15);
  ctx.lineTo(-66, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Signature Scorpio hood air scoop!
  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(43, -15);
  ctx.lineTo(56, -19);
  ctx.lineTo(60, -14.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Roof ski rails & rear spoiler
  ctx.fillStyle = "#475569";
  ctx.fillRect(-73, -41, 11, 4);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-58, -44);
  ctx.lineTo(12, -44);
  ctx.stroke();

  // Tinted Windows (big boxy greenhouse!)
  ctx.fillStyle = "#0f172a";
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-63, -16);
  ctx.lineTo(-63, -35);
  ctx.lineTo(16, -35);
  ctx.lineTo(31, -16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Driver inside cab
  ctx.save();
  ctx.beginPath();
  ctx.rect(-15, -36, 42, 20);
  ctx.clip();
  drawDriverHead(ctx, -1, -25 + pose.headBob * 0.6, pose.driverLean * 0.6, "#ef4444", pose.crashed, true);
  ctx.restore();

  // Pillars
  ctx.fillStyle = "#111827";
  ctx.fillRect(-14, -36, 5, 20);
  ctx.fillRect(-42, -36, 5, 20);

  // Specular roof-to-door shine line
  ctx.strokeStyle = "rgba(148, 163, 184, 0.42)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-62, -13);
  ctx.lineTo(67, -11);
  ctx.stroke();

  // Lower silver-gray rugged Scorpio side cladding + SCORPIO text
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-30, 1, 59, 12);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.strokeRect(-30, 1, 59, 12);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 7.5px Inter, sans-serif";
  ctx.fillText("SCORPIO", -20, 9.5);

  // Chrome door handles & footstep
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(-5, -10, 8, 2.5);
  ctx.fillRect(-32, -10, 8, 2.5);
  ctx.fillStyle = "#64748b";
  ctx.fillRect(-27, 13.5, 54, 4);

  // Signature Tall Vertical Scorpio Rear Taillight Tower!
  ctx.fillStyle = pose.brake ? "#ff2424" : "#dc2626";
  ctx.fillRect(-72, -35, 5.5, 27);
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(-72, -16, 5.5, 4);
  if (pose.brake) {
    ctx.fillStyle = "rgba(255, 36, 36, 0.45)";
    ctx.beginPath();
    ctx.arc(-71, -21, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Front chrome toothed grille & muscular headlight
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(71, -4, 4.5, 13);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(72, -2, 3, 2);
  ctx.fillRect(72, 2, 3, 2);
  ctx.fillRect(72, 6, 3, 2);

  ctx.fillStyle = "#fef08a";
  ctx.fillRect(63, -11, 11, 6.5);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(65, -9.5, 8, 3);

  if (pose.gas) {
    const beam = ctx.createLinearGradient(75, -8, 148, -8);
    beam.addColorStop(0, "rgba(254, 249, 195, 0.36)");
    beam.addColorStop(1, "rgba(254, 249, 195, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(75, -11);
    ctx.lineTo(148, -25);
    ctx.lineTo(148, 13);
    ctx.lineTo(75, -4);
    ctx.closePath();
    ctx.fill();
  }

  // Wheel arches
  for (const wx of [spec.rearWheel.x, spec.frontWheel.x]) {
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.arc(wx, 17, 24, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(wx, 17, 24.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }

  drawWheel(ctx, rw.x, rw.y, spec.rearWheel.radius, rw.angle, "scorpio");
  drawWheel(ctx, fw.x, fw.y, spec.frontWheel.radius, fw.angle, "scorpio");
}

/**
 * 3. THAR 4x4 — Crimson Red Classic Open-Cab Off-Road Jeep
 */
function drawThar(ctx: CanvasRenderingContext2D, spec: VehicleSpec, pose: VehicleRenderPose) {
  const rw = pose.rearWheelLocal;
  const fw = pose.frontWheelLocal;

  drawCoilSpring(ctx, spec.rearWheel.x, spec.rearWheel.y - 5, rw.x, rw.y, 5, 4, "#facc15");
  drawCoilSpring(ctx, spec.frontWheel.x, spec.frontWheel.y - 5, fw.x, fw.y, 5, 4, "#facc15");

  // Rear mounted full-size spare tire
  ctx.fillStyle = "#18181b";
  ctx.strokeStyle = "#3f3f46";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-72, -18, 12, 27, 4);
  ctx.fill();
  ctx.stroke();

  // Driver torso & bobbing head (clearly visible open cab like Hill Climb Jeep!)
  ctx.save();
  ctx.fillStyle = "#1e40af";
  ctx.beginPath();
  ctx.roundRect(-16, -22, 16, 16, 4);
  ctx.fill();
  // Arm holding steering wheel
  ctx.strokeStyle = "#f7cba4";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-5, -16);
  ctx.lineTo(12, -16);
  ctx.stroke();
  // Steering wheel
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(15, -21);
  ctx.lineTo(11, -11);
  ctx.stroke();
  drawDriverHead(ctx, -8, -30 + pose.headBob, pose.driverLean, "#dc2626", pose.crashed, false);
  ctx.restore();

  // Matte-black tubular roll cage
  ctx.strokeStyle = "#18181b";
  ctx.lineWidth = 4.2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-54, -14);
  ctx.lineTo(-42, -37);
  ctx.lineTo(15, -37);
  ctx.lineTo(24, -14);
  ctx.stroke();

  // Upright windshield glass
  ctx.strokeStyle = "#bae6fd";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(15, -35);
  ctx.lineTo(23, -15);
  ctx.stroke();

  // Crimson Red Jeep body
  const grad = ctx.createLinearGradient(0, -18, 0, 16);
  grad.addColorStop(0, "#f87171");
  grad.addColorStop(0.25, "#dc2626");
  grad.addColorStop(1, "#991b1b");

  ctx.fillStyle = grad;
  ctx.strokeStyle = "#450a0a";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-61, 12);
  ctx.lineTo(-61, -14);
  ctx.lineTo(-18, -14);
  ctx.lineTo(-15, -9);
  ctx.lineTo(14, -9);
  ctx.lineTo(20, -15);
  ctx.lineTo(62, -15);
  ctx.lineTo(66, -6);
  ctx.lineTo(66, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // THAR 4x4 door decal
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 8px Inter, sans-serif";
  ctx.fillText("THAR 4x4", -17, 6);

  // Heavy square matte-black off-road fender flares
  ctx.fillStyle = "#18181b";
  ctx.beginPath();
  ctx.moveTo(-64, 13);
  ctx.lineTo(-62, -2);
  ctx.lineTo(-27, -2);
  ctx.lineTo(-22, 13);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(24, 13);
  ctx.lineTo(28, -2);
  ctx.lineTo(64, -2);
  ctx.lineTo(68, 13);
  ctx.closePath();
  ctx.fill();

  // Front bumper & round headlamp
  ctx.fillStyle = "#27272a";
  ctx.fillRect(62, 6, 8, 7);
  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.arc(64, -8, 4, 0, Math.PI * 2);
  ctx.fill();

  // Rear brake lamp
  ctx.fillStyle = pose.brake ? "#ff2a2a" : "#991b1b";
  ctx.fillRect(-62, -9, 5, 8);
  if (pose.brake) {
    ctx.fillStyle = "rgba(255, 42, 42, 0.45)";
    ctx.beginPath();
    ctx.arc(-62, -5, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  drawWheel(ctx, rw.x, rw.y, spec.rearWheel.radius, rw.angle, "thar");
  drawWheel(ctx, fw.x, fw.y, spec.frontWheel.radius, fw.angle, "thar");
}

/**
 * 4. MONSTER 4x4 — Lifted Heavy Monster Truck
 */
function drawMonster(ctx: CanvasRenderingContext2D, spec: VehicleSpec, pose: VehicleRenderPose) {
  const rw = pose.rearWheelLocal;
  const fw = pose.frontWheelLocal;

  // Heavy lifted suspension linkage & twin red coil-over shocks
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-18, 10);
  ctx.lineTo(rw.x, rw.y);
  ctx.moveTo(18, 10);
  ctx.lineTo(fw.x, fw.y);
  ctx.stroke();

  drawCoilSpring(ctx, spec.rearWheel.x + 4, 6, rw.x, rw.y, 6, 5.2, "#ef4444");
  drawCoilSpring(ctx, spec.frontWheel.x - 4, 6, fw.x, fw.y, 6, 5.2, "#ef4444");

  // Steel truss sub-frame
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-58, 6, 116, 9);

  // Chrome vertical exhaust stacks & roll bar with roof lights
  ctx.fillStyle = "#cbd5e1";
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.2;
  ctx.fillRect(-33, -38, 6, 26);
  ctx.strokeRect(-33, -38, 6, 26);

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-60, -14);
  ctx.lineTo(-34, -36);
  ctx.stroke();

  // Roof floodlights
  ctx.fillStyle = "#fef08a";
  ctx.beginPath();
  ctx.arc(-22, -41, 4, 0, Math.PI * 2);
  ctx.fill();

  // Blazing Amber Pickup Body
  const bodyGrad = ctx.createLinearGradient(0, -38, 0, 10);
  bodyGrad.addColorStop(0, "#fde047");
  bodyGrad.addColorStop(0.35, "#f59e0b");
  bodyGrad.addColorStop(1, "#b45309");

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-76, 9);
  ctx.lineTo(-76, -15);
  ctx.lineTo(-27, -15);
  ctx.lineTo(-24, -38); // cab rear
  ctx.lineTo(19, -38);  // cab roof
  ctx.lineTo(35, -15);  // windshield
  ctx.lineTo(73, -13);  // huge hood
  ctx.lineTo(78, -3);
  ctx.lineTo(78, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bold black racing stripe & MONSTER badge
  ctx.fillStyle = "#18181b";
  ctx.fillRect(-74, -4, 150, 7);
  ctx.fillStyle = "#fde047";
  ctx.font = "bold 7.5px Inter, sans-serif";
  ctx.fillText("MONSTER 4x4", -25, 2);

  // Cab Window & Driver
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(-20, -16);
  ctx.lineTo(-18, -33);
  ctx.lineTo(16, -33);
  ctx.lineTo(29, -16);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.rect(-19, -34, 46, 19);
  ctx.clip();
  drawDriverHead(ctx, 4, -24 + pose.headBob * 0.6, pose.driverLean * 0.6, "#f59e0b", pose.crashed, true);
  ctx.restore();

  // Front headlight & bullbar
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(76, -6, 5, 14);
  ctx.fillStyle = "#fef9c3";
  ctx.fillRect(68, -11, 8, 5);

  // Rear brake light
  ctx.fillStyle = pose.brake ? "#ff2a2a" : "#b91c1c";
  ctx.fillRect(-77, -13, 5, 8);

  drawWheel(ctx, rw.x, rw.y, spec.rearWheel.radius, rw.angle, "monster");
  drawWheel(ctx, fw.x, fw.y, spec.frontWheel.radius, fw.angle, "monster");
}

/**
 * 5. SPLENDOR+ — Iconic Indian 100cc Commuter Bike (Black with Red & Silver Stripes)
 */
function drawSplendor(ctx: CanvasRenderingContext2D, spec: VehicleSpec, pose: VehicleRenderPose) {
  const rw = pose.rearWheelLocal;
  const fw = pose.frontWheelLocal;

  // Rear & Front 5-spoke silver alloy wheels
  drawWheel(ctx, rw.x, rw.y, spec.rearWheel.radius, rw.angle, "splendor");
  drawWheel(ctx, fw.x, fw.y, spec.frontWheel.radius, fw.angle, "splendor");

  // Gloss-black front mudguard hugging front wheel
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 4.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(fw.x, fw.y, spec.frontWheel.radius + 3.2, Math.PI * 1.08, Math.PI * 1.78);
  ctx.stroke();

  // Rear mudguard + black saree guard grid
  ctx.strokeStyle = "#18181b";
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.arc(rw.x, rw.y, spec.rearWheel.radius + 3, Math.PI * 1.15, Math.PI * 1.88);
  ctx.stroke();

  // Box-section black swingarm & chain cover
  ctx.fillStyle = "#1e293b";
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(rw.x, rw.y - 3);
  ctx.lineTo(rw.x, rw.y + 4);
  ctx.lineTo(-6, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Twin Rear Hydraulic Red Coil Shock Absorber
  drawCoilSpring(ctx, -27, -7, rw.x + 2, rw.y - 2, 5, 3.3, "#dc2626", "#e2e8f0");

  // Telescopic Chrome Front Fork + Black Rubber Boot Gaiter
  const clampX = 21;
  const clampY = -20;
  const midX = clampX + (fw.x - clampX) * 0.5;
  const midY = clampY + (fw.y - clampY) * 0.5;

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(clampX, clampY);
  ctx.lineTo(fw.x, fw.y);
  ctx.stroke();

  ctx.strokeStyle = "#18181b";
  ctx.lineWidth = 5.4;
  ctx.beginPath();
  ctx.moveTo(clampX, clampY);
  ctx.lineTo(midX, midY);
  ctx.stroke();

  // Signature Horizontal Sloper 97.2cc Silver Air-Cooled Engine + Chrome Leg Guard
  ctx.fillStyle = "#94a3b8";
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.3;
  // Crankcase
  ctx.beginPath();
  ctx.roundRect(-12, 3, 18, 13, 4);
  ctx.fill();
  ctx.stroke();
  // Forward-sloping finned cylinder head
  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(4, 5);
  ctx.lineTo(19, 1);
  ctx.lineTo(20, 10);
  ctx.lineTo(5, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Chrome crash / leg guard bar in front of engine
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(17, -9);
  ctx.lineTo(22, 11);
  ctx.stroke();

  // Iconic Straight Horizontal Chrome Silencer / Exhaust with Heat Shield!
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(16, 10);
  ctx.lineTo(6, 16);
  ctx.lineTo(-47, 13);
  ctx.stroke();

  ctx.fillStyle = "#e2e8f0";
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(-48, 9.5, 36, 6, 2.5);
  ctx.fill();
  ctx.stroke();

  // Chrome Rear Carrier Rack & Grab Rail behind seat
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-36, -13);
  ctx.lineTo(-49, -14);
  ctx.lineTo(-47, -10);
  ctx.stroke();

  // Rear Tail Cowl & Red Brake Lamp + Amber Indicator
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(-47, -12);
  ctx.lineTo(-27, -12);
  ctx.lineTo(-24, -5);
  ctx.lineTo(-44, -6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = pose.brake ? "#ff2424" : "#dc2626";
  ctx.fillRect(-48, -12, 4.5, 5.5);
  if (pose.brake) {
    ctx.fillStyle = "rgba(255, 36, 36, 0.45)";
    ctx.beginPath();
    ctx.arc(-47, -9, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(-44, -7, 3.5, 3);

  // Side Utility Box Panel + Classic Red/Silver Stripes
  ctx.fillStyle = "#111827";
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-26, -11);
  ctx.lineTo(-5, -11);
  ctx.lineTo(-2, 1);
  ctx.lineTo(-20, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#dc2626";
  ctx.fillRect(-23, -7, 17, 2.4);

  // Flat Comfortable Black 2-Up Commuter Seat
  ctx.fillStyle = "#18181b";
  ctx.strokeStyle = "#3f3f46";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-42, -17.5, 39, 6.8, 3);
  ctx.fill();
  ctx.stroke();

  // Iconic Jet-Black Rounded-Rectangular Splendor Fuel Tank with Red & Silver Graphics!
  const tankGrad = ctx.createLinearGradient(0, -23, 0, -7);
  tankGrad.addColorStop(0, "#334155");
  tankGrad.addColorStop(0.3, "#0f172a");
  tankGrad.addColorStop(1, "#020617");
  ctx.fillStyle = tankGrad;
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-4, -12);
  ctx.quadraticCurveTo(-2, -22, 9, -22);
  ctx.lineTo(19, -19);
  ctx.quadraticCurveTo(22, -12, 16, -8);
  ctx.lineTo(-3, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Red & Silver Hero Splendor tank stripes + chrome fuel cap
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(-2, -15.5, 20, 3);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(-1, -12.5, 18, 1.4);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(7, -23.5, 5, 2);

  // Rectangular Splendor Bikini Headlamp Cowl + Tinted Visor + Square Amber Blinker!
  ctx.fillStyle = "#0f172a";
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(20, -29);
  ctx.lineTo(29, -27);
  ctx.lineTo(31, -14);
  ctx.lineTo(21, -13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Red cowl decal
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(22, -20, 7, 2.5);

  // Rectangular halogen headlamp + warm beam when accelerating
  ctx.fillStyle = "#fef08a";
  ctx.fillRect(28.5, -23, 3.5, 7);
  if (pose.gas) {
    const beam = ctx.createLinearGradient(32, -19, 105, -19);
    beam.addColorStop(0, "rgba(254, 240, 138, 0.38)");
    beam.addColorStop(1, "rgba(254, 240, 138, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(32, -23);
    ctx.lineTo(105, -34);
    ctx.lineTo(105, 2);
    ctx.lineTo(32, -15);
    ctx.closePath();
    ctx.fill();
  }

  // Square amber front turn indicator
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(23, -15, 4, 3.2);

  // Upright Chrome Handlebars & Rear-View Mirror Stalk
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(20, -21);
  ctx.lineTo(15, -28);
  ctx.stroke();
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(13, -33, 4, 4);

  // Animated Desi Commuter Rider sitting upright on the Splendor!
  const lean = pose.driverLean;
  const hipX = -14;
  const hipY = -17;
  const shoulderX = -7 + lean * 12;
  const shoulderY = -33 + pose.headBob * 0.5;

  // Rider Trousers & Shoe on footpeg
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 6.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(0, -6);
  ctx.lineTo(-2, 9);
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-5, 7, 10, 4.5);

  // Rider Red-Maroon Shirt/Jacket Torso
  ctx.strokeStyle = "#b91c1c";
  ctx.lineWidth = 9.5;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(shoulderX, shoulderY);
  ctx.stroke();

  // Rider Arm reaching to chrome handlebars
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY + 2);
  ctx.lineTo(5, -25);
  ctx.lineTo(15, -28);
  ctx.stroke();

  // Commuter Visor Helmet (Black & Red Stripe, X-visor glow when crashed)
  ctx.save();
  ctx.translate(shoulderX + 1.5, shoulderY - 10.5 + pose.headBob * 0.6);
  ctx.rotate(lean * 0.6);

  ctx.fillStyle = "#111827";
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Red racing stripe across helmet
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(-8, -3, 14, 2.5);

  // Clear/tinted visor
  ctx.fillStyle = pose.crashed ? "#ef4444" : "#38bdf8";
  ctx.beginPath();
  ctx.moveTo(2, -4);
  ctx.lineTo(10.5, -2);
  ctx.lineTo(9.5, 4);
  ctx.lineTo(2, 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * 6. DIRT BIKE — Classic Hill Climb Racing Motocross Bike & Animated Rider
 */
function drawDirtBike(ctx: CanvasRenderingContext2D, spec: VehicleSpec, pose: VehicleRenderPose) {
  const rw = pose.rearWheelLocal;
  const fw = pose.frontWheelLocal;

  // Rear wheel & front wheel drawn behind forks/swingarm
  drawWheel(ctx, rw.x, rw.y, spec.rearWheel.radius, rw.angle, "bike");
  drawWheel(ctx, fw.x, fw.y, spec.frontWheel.radius, fw.angle, "bike");

  // Articulating rear swingarm (pivots from engine frame to moving rear wheel hub)
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 4.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, 9);
  ctx.lineTo(rw.x, rw.y);
  ctx.stroke();

  // Rear mono-shock spring
  drawCoilSpring(ctx, -11, -5, (rw.x - 6) * 0.5, (rw.y + 9) * 0.5, 4, 3.2, "#facc15");

  // Telescopic inverted gold front fork (dynamically connects triple clamp to front wheel hub!)
  const clampX = 22;
  const clampY = -20;
  const midX = clampX + (fw.x - clampX) * 0.52;
  const midY = clampY + (fw.y - clampY) * 0.52;

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(midX, midY);
  ctx.lineTo(fw.x, fw.y);
  ctx.stroke();

  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 5.4;
  ctx.beginPath();
  ctx.moveTo(clampX, clampY);
  ctx.lineTo(midX, midY);
  ctx.stroke();

  // 2-Stroke Engine block & chrome exhaust expansion chamber
  ctx.fillStyle = "#64748b";
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-10, -2, 22, 16, 4);
  ctx.fill();
  ctx.stroke();

  // Chrome exhaust pipe to rear muffler
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(6, 5);
  ctx.quadraticCurveTo(-18, 8, -44, -1);
  ctx.stroke();
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.roundRect(-48, -6, 15, 7, 2.5);
  ctx.fill();

  // Tubular frame backbone
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(20, -18);
  ctx.lineTo(10, 9);
  ctx.lineTo(-8, 9);
  ctx.closePath();
  ctx.stroke();

  // High MX Front Fender & Rear Fender (Kawasaki Lime + Racing White)
  ctx.fillStyle = "#22c55e";
  ctx.strokeStyle = "#14532d";
  ctx.lineWidth = 1.4;
  // Front high fender
  ctx.beginPath();
  ctx.moveTo(22, -11);
  ctx.quadraticCurveTo(42, -16, 56, -7);
  ctx.lineTo(52, -3);
  ctx.quadraticCurveTo(39, -10, 22, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rear tail fender & side tank shrouds
  ctx.beginPath();
  ctx.moveTo(-53, -15);
  ctx.lineTo(-22, -13);
  ctx.lineTo(16, -21);
  ctx.lineTo(27, -10);
  ctx.lineTo(12, -3);
  ctx.lineTo(-24, -4);
  ctx.lineTo(-49, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White MX Side Number Plate ("07")
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.roundRect(-30, -13, 18, 10, 3);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 7.5px Inter, sans-serif";
  ctx.fillText("07", -25, -5.5);

  // Black MX Saddle Seat
  ctx.fillStyle = "#18181b";
  ctx.beginPath();
  ctx.moveTo(-30, -14);
  ctx.quadraticCurveTo(-8, -10, 10, -20);
  ctx.lineTo(6, -15);
  ctx.quadraticCurveTo(-10, -7, -28, -11);
  ctx.closePath();
  ctx.fill();

  // Front headlight plate & Handlebars
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.roundRect(24, -27, 8, 14, 2);
  ctx.fill();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(22, -21);
  ctx.lineTo(18, -29);
  ctx.stroke();

  // Brake rear glow
  if (pose.brake) {
    ctx.fillStyle = "#ff2a2a";
    ctx.beginPath();
    ctx.arc(-50, -12, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Animated Motocross Rider leaning with gas/brake!
  const lean = pose.driverLean;
  const hipX = -15;
  const hipY = -14;
  const shoulderX = -6 + lean * 14;
  const shoulderY = -31 + pose.headBob * 0.5;

  // Rider Leg & MX Boot on footpeg
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 6.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(2, -5);
  ctx.lineTo(-4, 9);
  ctx.stroke();

  // Boot
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(-8, 6, 11, 5);

  // Rider Torso (Racing Blue & Lime Jersey)
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(shoulderX, shoulderY);
  ctx.stroke();

  // Rider Arm gripping handlebars
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 4.6;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY + 2);
  ctx.lineTo(8, -24);
  ctx.lineTo(18, -28);
  ctx.stroke();

  // Full-Face Motocross Helmet & Goggles
  ctx.save();
  ctx.translate(shoulderX + 2, shoulderY - 11 + pose.headBob * 0.6);
  ctx.rotate(lean * 0.65);

  // Helmet shell
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Racing green helmet stripe & visor peak
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(0, -1, 10.2, Math.PI * 1.05, Math.PI * 1.9);
  ctx.lineTo(15, -7);
  ctx.lineTo(13, -4);
  ctx.closePath();
  ctx.fill();

  // Chin bar
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(5, 1);
  ctx.lineTo(13, 3);
  ctx.lineTo(10, 8);
  ctx.lineTo(3, 6);
  ctx.closePath();
  ctx.fill();

  // Tinted Goggles
  ctx.fillStyle = pose.crashed ? "#ef4444" : "#f97316";
  ctx.fillRect(3, -3.5, 8, 4.5);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(4.5, -2.5, 3, 1.5);
  ctx.restore();
}

export function drawVehicle(
  ctx: CanvasRenderingContext2D,
  spec: VehicleSpec,
  pose: VehicleRenderPose,
) {
  switch (spec.id) {
    case "fortuner":
      drawFortuner(ctx, spec, pose);
      break;
    case "scorpio":
      drawScorpio(ctx, spec, pose);
      break;
    case "thar":
      drawThar(ctx, spec, pose);
      break;
    case "monster":
      drawMonster(ctx, spec, pose);
      break;
    case "splendor":
      drawSplendor(ctx, spec, pose);
      break;
    case "bike":
      drawDirtBike(ctx, spec, pose);
      break;
  }

  // Cracked windshield / damage indicator when overturned & died
  if (pose.crashed && spec.category === "car") {
    ctx.save();
    ctx.strokeStyle = "rgba(248, 250, 252, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, -28);
    ctx.lineTo(26, -21);
    ctx.lineTo(22, -16);
    ctx.moveTo(26, -21);
    ctx.lineTo(31, -24);
    ctx.stroke();
    ctx.restore();
  }
}

export function renderVehiclePreview(canvas: HTMLCanvasElement, spec: VehicleSpec) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const initExt = spec.restSuspension - 8;
  const wheelBottom = Math.max(
    spec.rearWheel.y + initExt + spec.rearWheel.radius,
    spec.frontWheel.y + initExt + spec.frontWheel.radius,
  );
  const topBound = spec.category === "bike" ? -54 : -46;
  const midY = (topBound + wheelBottom) * 0.5;
  const totalH = wheelBottom - topBound;
  const totalW = spec.category === "bike" ? 132 : spec.id === "thar" ? 152 : 176;

  const scale = Math.min((w * 0.86) / totalW, (h * 0.84) / totalH);

  ctx.save();
  ctx.translate(w * 0.5, h * 0.5 - midY * scale);
  ctx.scale(scale, scale);

  drawVehicle(ctx, spec, {
    rearWheelLocal: { x: spec.rearWheel.x, y: spec.rearWheel.y + initExt, angle: 0.2 },
    frontWheelLocal: { x: spec.frontWheel.x, y: spec.frontWheel.y + initExt, angle: 0.4 },
    driverLean: 0,
    headBob: 0,
    gas: false,
    brake: false,
    crashed: false,
  });
  ctx.restore();
}
