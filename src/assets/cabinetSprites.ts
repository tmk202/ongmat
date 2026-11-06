// Photorealistic Industrial Tech Sprite & Asset Generator for ecommarketdata Curiosity Cabinet
// Features the Aero-Mechanical 'Cyber-Bee' Harvester Drone AND 4 Ultra-Detailed 3D CNC/Carbon/Glass
// E-Commerce Platform Collector Boxes with custom-drawn emblems for Shopee, Amazon, TikTok Shop, Etsy, Lazada & Shopify.

export interface CabinetAssets {
  spiderCanvas: HTMLCanvasElement;
  idleHeadCanvas: HTMLCanvasElement;
  flyCanvas: HTMLCanvasElement;
  beeForewingCanvas: HTMLCanvasElement;
  beeHindwingCanvas: HTMLCanvasElement;
  mugUrl: string;
  ibookUrl: string;
  bookUrl: string;
  tshirtUrl: string;
  playerArtUrl: string;
  logoBackUrl: string;
  logoFrontUrl: string;
  searchUrl: string;
  menuUrl: string;
  heartUrl: string;
  shuffleUrl: string;
  prevUrl: string;
  playUrl: string;
  nextUrl: string;
  repeatUrl: string;
  lazadaUrl: string;
  etsyUrl: string;
  modScraperUrl: string;
  modSyncUrl: string;
  modAiUrl: string;
  modApiUrl: string;
}

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function drawHexGrid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  cellR: number,
  strokeStyle: string,
  lineWidth = 1.5
) {
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  const dx = cellR * 1.5;
  const dy = cellR * Math.sqrt(3);
  const cols = Math.ceil(radius / dx) + 1;
  const rows = Math.ceil(radius / dy) + 1;

  for (let col = -cols; col <= cols; col++) {
    for (let row = -rows; row <= rows; row++) {
      const x = cx + col * dx;
      const y = cy + row * dy + (col % 2 !== 0 ? dy * 0.5 : 0);
      if (Math.hypot(x - cx, y - cy) > radius) continue;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = x + Math.cos(a) * (cellR * 0.92);
        const hy = y + Math.sin(a) * (cellR * 0.92);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
}


// ============================================================================
// 1. Cyber-Bee Harvester Drone Wings, Chassis, Visor & Target SKU Pod
// ============================================================================

function generateCyberBeeWings(): {
  forewing: HTMLCanvasElement;
  hindwing: HTMLCanvasElement;
} {
  const makeWing = (w: number, h: number, isFore: boolean) => {
    const [c, ctx] = createCanvas(w, h);
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(20, h * 0.46);
    ctx.bezierCurveTo(w * 0.35, h * 0.08, w * 0.78, h * 0.06, w - 12, h * 0.42);
    ctx.bezierCurveTo(w - 4, h * 0.68, w * 0.62, h * 0.94, w * 0.28, h * 0.86);
    ctx.quadraticCurveTo(w * 0.12, h * 0.78, 20, h * 0.54);
    ctx.closePath();

    const grad = ctx.createLinearGradient(20, h * 0.15, w - 10, h * 0.85);
    grad.addColorStop(0, 'rgba(17, 41, 226, 0.48)');
    grad.addColorStop(0.32, 'rgba(56, 189, 248, 0.34)');
    grad.addColorStop(0.68, 'rgba(255, 255, 255, 0.62)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0.38)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.save();
    ctx.clip();
    drawHexGrid(
      ctx,
      w * 0.52,
      h * 0.5,
      w * 0.6,
      isFore ? 14 : 11,
      'rgba(17, 41, 226, 0.18)',
      1.1
    );

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.68)';
    ctx.lineWidth = isFore ? 3.2 : 2.4;
    ctx.beginPath();
    ctx.moveTo(20, h * 0.48);
    ctx.quadraticCurveTo(w * 0.52, h * 0.26, w - 16, h * 0.43);
    ctx.moveTo(w * 0.32, h * 0.36);
    ctx.quadraticCurveTo(w * 0.55, h * 0.54, w * 0.82, h * 0.68);
    ctx.moveTo(w * 0.48, h * 0.31);
    ctx.lineTo(w * 0.44, h * 0.82);
    ctx.moveTo(w * 0.68, h * 0.34);
    ctx.lineTo(w * 0.66, h * 0.78);
    ctx.stroke();

    const leadGlow = ctx.createLinearGradient(20, 0, w, 0);
    leadGlow.addColorStop(0, '#fbbf24');
    leadGlow.addColorStop(0.35, '#ffffff');
    leadGlow.addColorStop(1, '#38bdf8');
    ctx.strokeStyle = leadGlow;
    ctx.lineWidth = isFore ? 5.5 : 4;
    ctx.beginPath();
    ctx.moveTo(20, h * 0.46);
    ctx.bezierCurveTo(w * 0.35, h * 0.08, w * 0.78, h * 0.06, w - 12, h * 0.42);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(17, 41, 226, 0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(22, h * 0.5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(22, h * 0.5, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return c;
  };

  return {
    forewing: makeWing(260, 140, true),
    hindwing: makeWing(190, 110, false),
  };
}

function generateCyberBeeCanvas(): HTMLCanvasElement {
  const W = 560;
  const H = 560;
  const S = W / 1254;
  const [c, ctx] = createCanvas(W, H);

  ctx.save();
  ctx.scale(S, S);

  const rightLegs: [number, number][][] = [
    [
      [470, 760],
      [370, 830],
      [400, 1160],
    ],
    [
      [460, 665],
      [300, 690],
      [100, 955],
    ],
    [
      [480, 605],
      [370, 580],
      [55, 475],
    ],
    [
      [490, 560],
      [360, 420],
      [410, 52],
    ],
  ];

  const allLegs = [
    ...rightLegs,
    ...rightLegs.map((pts) => pts.map(([x, y]) => [1254 - x, y] as [number, number])),
  ];

  for (const pts of allLegs) {
    const [hip, knee, foot] = pts;
    const segs = [
      [hip, knee],
      [knee, foot],
    ];
    for (let sIdx = 0; sIdx < 2; sIdx++) {
      const [p0, p1] = segs[sIdx];
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;

      const rStart = sIdx === 0 ? 22 : 16;
      const rEnd = sIdx === 0 ? 17 : 8;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(p0[0] + nx * rStart, p0[1] + ny * rStart);
      ctx.lineTo(p1[0] + nx * rEnd, p1[1] + ny * rEnd);
      ctx.lineTo(p1[0] - nx * rEnd, p1[1] - ny * rEnd);
      ctx.lineTo(p0[0] - nx * rStart, p0[1] - ny * rStart);
      ctx.closePath();

      const strutGrad = ctx.createLinearGradient(
        p0[0] + nx * rStart,
        p0[1] + ny * rStart,
        p0[0] - nx * rStart,
        p0[1] - ny * rStart
      );
      if (sIdx === 0) {
        strutGrad.addColorStop(0, '#0f172a');
        strutGrad.addColorStop(0.35, '#475569');
        strutGrad.addColorStop(0.5, '#f59e0b');
        strutGrad.addColorStop(0.65, '#334155');
        strutGrad.addColorStop(1, '#090d16');
      } else {
        strutGrad.addColorStop(0, '#1e293b');
        strutGrad.addColorStop(0.3, '#f8fafc');
        strutGrad.addColorStop(0.55, '#1129e2');
        strutGrad.addColorStop(0.8, '#94a3b8');
        strutGrad.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = strutGrad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(p0[0], p0[1], rStart * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(p0[0], p0[1], rStart * 0.55, 0, Math.PI * 2);
      ctx.fill();

      if (sIdx === 1) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(p1[0], p1[1], 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(p1[0], p1[1], 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Segmented Armored Cyber-Bee Payload Pod (Abdomen) at (628, 345) r 220x205
  ctx.save();
  ctx.translate(628, 345);

  const thrusterGlow = ctx.createRadialGradient(0, -195, 4, 0, -195, 48);
  thrusterGlow.addColorStop(0, '#ffffff');
  thrusterGlow.addColorStop(0.35, '#38bdf8');
  thrusterGlow.addColorStop(0.7, 'rgba(17, 41, 226, 0.55)');
  thrusterGlow.addColorStop(1, 'rgba(17, 41, 226, 0)');
  ctx.fillStyle = thrusterGlow;
  ctx.beginPath();
  ctx.arc(0, -195, 48, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 195);
  ctx.bezierCurveTo(215, 185, 228, -45, 72, -188);
  ctx.lineTo(-72, -188);
  ctx.bezierCurveTo(-228, -45, -215, 185, 0, 195);
  ctx.closePath();
  ctx.clip();

  const podGrad = ctx.createLinearGradient(-210, 0, 210, 0);
  podGrad.addColorStop(0, '#090d16');
  podGrad.addColorStop(0.18, '#b45309');
  podGrad.addColorStop(0.38, '#fbbf24');
  podGrad.addColorStop(0.5, '#fef9c3');
  podGrad.addColorStop(0.64, '#f59e0b');
  podGrad.addColorStop(0.84, '#92400e');
  podGrad.addColorStop(1, '#090d16');
  ctx.fillStyle = podGrad;
  ctx.fillRect(-230, -210, 460, 420);

  drawHexGrid(ctx, 0, 0, 220, 16, 'rgba(15, 23, 42, 0.16)', 1.4);

  for (const [by, bh] of [
    [118, 52],
    [12, 58],
    [-98, 54],
  ]) {
    const bandGrad = ctx.createLinearGradient(-210, by, 210, by);
    bandGrad.addColorStop(0, '#020617');
    bandGrad.addColorStop(0.22, '#0f172a');
    bandGrad.addColorStop(0.5, '#1e3a8a');
    bandGrad.addColorStop(0.78, '#0f172a');
    bandGrad.addColorStop(1, '#020617');

    ctx.fillStyle = bandGrad;
    ctx.beginPath();
    ctx.ellipse(0, by, 230, bh, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.stroke();

    for (const lx of [-115, -65, 65, 115]) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(lx - 14, by - 4, 28, 8, 4);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-28, -175, 56, 340, 18);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#475569';
  ctx.stroke();

  ctx.save();
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const hx = Math.cos(a) * 66;
    const hy = Math.sin(a) * 66;
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  const coreGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
  coreGlow.addColorStop(0, '#ffffff');
  coreGlow.addColorStop(0.35, '#38bdf8');
  coreGlow.addColorStop(0.75, '#1129e2');
  coreGlow.addColorStop(1, '#020617');
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + 0.25;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 42, Math.sin(a) * 42);
    ctx.stroke();
  }
  ctx.restore();

  const specGrad = ctx.createLinearGradient(-90, -160, 40, 160);
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
  specGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.08)');
  specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = specGrad;
  ctx.beginPath();
  ctx.ellipse(-45, 0, 75, 165, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 195);
  ctx.bezierCurveTo(215, 185, 228, -45, 72, -188);
  ctx.lineTo(-72, -188);
  ctx.bezierCurveTo(-228, -45, -215, 185, 0, 195);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();

  for (const [px, py, side] of [
    [545, 880, -1],
    [712, 880, 1],
  ]) {
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - side * 18, py - 48);
    ctx.lineTo(px + side * 8, py + 12);
    ctx.lineTo(px + side * 24, py + 48);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 12;
    ctx.stroke();

    const tipGrad = ctx.createRadialGradient(
      px + side * 24,
      py + 48,
      2,
      px + side * 24,
      py + 48,
      24
    );
    tipGrad.addColorStop(0, '#ffffff');
    tipGrad.addColorStop(0.45, '#38bdf8');
    tipGrad.addColorStop(1, '#1129e2');
    ctx.fillStyle = tipGrad;
    ctx.beginPath();
    ctx.arc(px + side * 24, py + 48, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(630, 680);

  const thxGrad = ctx.createLinearGradient(-165, 0, 165, 0);
  thxGrad.addColorStop(0, '#0f172a');
  thxGrad.addColorStop(0.18, '#94a3b8');
  thxGrad.addColorStop(0.45, '#ffffff');
  thxGrad.addColorStop(0.55, '#f8fafc');
  thxGrad.addColorStop(0.82, '#64748b');
  thxGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = thxGrad;
  ctx.beginPath();
  ctx.roundRect(-162, -135, 324, 270, [68, 68, 95, 95]);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#0f172a';
  ctx.stroke();

  for (const side of [-1, 1]) {
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(side * 105 - 32, -85, 64, 125, 18);
    ctx.fill();
    for (let ry = -68; ry <= 22; ry += 18) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(side * 105 - 24, ry, 48, 9);
    }
    ctx.restore();
  }

  const collarGrad = ctx.createLinearGradient(-150, 0, 150, 0);
  collarGrad.addColorStop(0, '#081266');
  collarGrad.addColorStop(0.5, '#1129e2');
  collarGrad.addColorStop(1, '#081266');
  ctx.fillStyle = collarGrad;
  ctx.beginPath();
  ctx.roundRect(-142, -24, 284, 54, 24);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();

  const visorGrad = ctx.createRadialGradient(0, 95, 10, 0, 82, 135);
  visorGrad.addColorStop(0, '#1e293b');
  visorGrad.addColorStop(0.55, '#090d16');
  visorGrad.addColorStop(1, '#020617');
  ctx.fillStyle = visorGrad;
  ctx.beginPath();
  ctx.ellipse(0, 78, 136, 64, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  for (const [ex, ey, er] of [
    [-52, 98, 28],
    [52, 98, 28],
    [-106, 78, 17],
    [106, 78, 17],
  ]) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(ex, ey, er + 4, 0, Math.PI * 2);
    ctx.fill();

    const lensGrad = ctx.createRadialGradient(ex - er * 0.25, ey - er * 0.25, 2, ex, ey, er);
    lensGrad.addColorStop(0, '#38bdf8');
    lensGrad.addColorStop(0.45, '#1129e2');
    lensGrad.addColorStop(0.85, '#020617');
    lensGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.ellipse(ex - er * 0.28, ey + er * 0.28, er * 0.34, er * 0.18, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
  return c;
}

function generateIdleHeadCanvas(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(308, 308);

  for (const [px, py] of [
    [130, 192],
    [178, 192],
  ]) {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(px, py, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py + 4, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  const bezelGrad = ctx.createRadialGradient(154, 142, 12, 154, 148, 60);
  bezelGrad.addColorStop(0, '#f8fafc');
  bezelGrad.addColorStop(0.55, '#f59e0b');
  bezelGrad.addColorStop(0.85, '#0f172a');
  bezelGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = bezelGrad;
  ctx.beginPath();
  ctx.arc(154, 148, 60, 0, Math.PI * 2);
  ctx.fill();

  const visorGrad = ctx.createRadialGradient(154, 154, 6, 154, 150, 48);
  visorGrad.addColorStop(0, '#1e293b');
  visorGrad.addColorStop(0.7, '#0f172a');
  visorGrad.addColorStop(1, '#020617');
  ctx.fillStyle = visorGrad;
  ctx.beginPath();
  ctx.arc(154, 150, 47, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(154, 170, 8, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  const eyes: [number, number, number][] = [
    [139, 158, 12.5],
    [170, 158, 12.5],
    [117, 150, 7.5],
    [192, 150, 7.5],
    [112, 136, 4],
    [197, 136, 4],
  ];

  for (const [ex, ey, er] of eyes) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1.5, er * 0.18);
    ctx.beginPath();
    ctx.arc(ex, ey, er + 0.8, 0, Math.PI * 2);
    ctx.stroke();

    const eGrad = ctx.createRadialGradient(ex - er * 0.2, ey - er * 0.2, er * 0.1, ex, ey, er);
    eGrad.addColorStop(0, '#38bdf8');
    eGrad.addColorStop(0.5, '#1129e2');
    eGrad.addColorStop(1, '#020617');
    ctx.fillStyle = eGrad;
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - er * 0.3, ey - er * 0.28, er * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  return c;
}

function generateFlyCanvas(): HTMLCanvasElement {
  const W = 240;
  const H = 246;
  const [c, ctx] = createCanvas(W, H);
  ctx.save();
  ctx.scale(W / 920, H / 945);

  const wingPoly: [number, number][] = [
    [398, 380],
    [330, 415],
    [250, 515],
    [180, 615],
    [132, 720],
    [148, 795],
    [212, 805],
    [305, 742],
    [385, 652],
    [410, 560],
    [414, 455],
  ];

  for (const mirror of [false, true]) {
    const pts = wingPoly.map(([x, y]) => [mirror ? 920 - x : x, y] as [number, number]);
    ctx.save();
    ctx.beginPath();
    pts.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();

    const wGrad = ctx.createLinearGradient(
      mirror ? 920 - 388 : 388,
      405,
      mirror ? 920 - 160 : 160,
      780
    );
    wGrad.addColorStop(0, 'rgba(17, 41, 226, 0.82)');
    wGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.65)');
    wGrad.addColorStop(1, 'rgba(245, 158, 11, 0.55)');
    ctx.fillStyle = wGrad;
    ctx.fill();

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 7;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4.5;
    const hx = mirror ? 920 - 388 : 388;
    const hy = 405;
    for (const [tx, ty] of [
      [165, 735],
      [235, 765],
      [325, 695],
    ]) {
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(mirror ? 920 - tx : tx, ty);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(356, 305, 208, 355, 42);
  ctx.fill();

  const podGrad = ctx.createLinearGradient(366, 315, 554, 650);
  podGrad.addColorStop(0, '#fbbf24');
  podGrad.addColorStop(0.5, '#f59e0b');
  podGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = podGrad;
  ctx.beginPath();
  ctx.roundRect(368, 317, 184, 331, 34);
  ctx.fill();

  ctx.fillStyle = '#09157a';
  ctx.beginPath();
  ctx.roundRect(388, 355, 144, 245, 20);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  for (let bx = 406; bx <= 510; bx += 16) {
    ctx.fillRect(bx, 382, bx % 32 === 0 ? 9 : 5, 58);
  }
  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 54px "Inter", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SKU', 460, 515);

  ctx.restore();
  return c;
}

// ============================================================================
// 2. Razor-Sharp Infinite-Resolution Vector SVG 3D Platform Sculptures
//    - Shopee: Sculpted 3D Orange 'S' (with 3D bag arch)
//    - Amazon: Sculpted 3D 'a' + 3D Golden-Orange Smile Arrow
//    - TikTok: Sculpted 3D Chromatic 'd' Note Glyph
//    - Etsy:   Sculpted 3D Terracotta-Orange Serif 'E'
// ============================================================================

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

function generateMugDataUrl(): string {
  // Pure Vector 3D Shopee 'S' (300x300 viewBox) — infinitely sharp at any screen DPI
  const sPath =
    'M 46 -46 C 32 -74, -46 -74, -46 -30 C -46 12, 50 -2, 50 44 C 50 84, -34 84, -50 50';
  const archPath = 'M -24.5 -61 A 25 25 0 0 1 24.5 -61';

  let extrudeArch = '';
  for (let d = 10; d >= 1; d--) {
    const col = d > 5 ? '#9a200c' : '#c83212';
    extrudeArch += `<path d="${archPath}" transform="translate(${(d * 0.65).toFixed(2)}, ${(d * 0.85).toFixed(2)})" fill="none" stroke="${col}" stroke-width="13" stroke-linecap="round" />`;
  }

  let extrudeS = '';
  const depthSteps = 22;
  for (let i = depthSteps; i >= 1; i--) {
    const t = i / depthSteps;
    const ox = (i * 0.72).toFixed(2);
    const oy = (i * 0.92).toFixed(2);
    const r = Math.round(145 + (1 - t) * 80);
    const g = Math.round(26 + (1 - t) * 36);
    const b = Math.round(10 + (1 - t) * 16);
    extrudeS += `<path d="${sPath}" transform="translate(${ox}, ${oy})" fill="none" stroke="rgb(${r},${g},${b})" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" />`;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="shpArch" x1="-26" y1="-94" x2="26" y2="-64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff9457" />
      <stop offset="50%" stop-color="#ff5d2e" />
      <stop offset="100%" stop-color="#ee4d2d" />
    </linearGradient>
    <linearGradient id="shpBevel" x1="-60" y1="-80" x2="60" y2="85" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffb880" />
      <stop offset="35%" stop-color="#ff6734" />
      <stop offset="75%" stop-color="#ee4d2d" />
      <stop offset="100%" stop-color="#c93315" />
    </linearGradient>
    <linearGradient id="shpFace" x1="-50" y1="-75" x2="55" y2="80" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff8048" />
      <stop offset="45%" stop-color="#f6532b" />
      <stop offset="100%" stop-color="#dc3818" />
    </linearGradient>
    <linearGradient id="shpSpec" x1="-50" y1="-75" x2="45" y2="70" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="45%" stop-color="#ffe8d2" stop-opacity="0.48" />
      <stop offset="85%" stop-color="#ffb478" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
  </defs>
  <g transform="translate(142, 142) scale(1.12) rotate(-2.8)">
    <!-- Soft ground shadow -->
    <path d="${sPath}" transform="translate(19, 27)" fill="none" stroke="rgba(10, 24, 110, 0.16)" stroke-width="44" stroke-linecap="round" />
    <!-- 3D Bag Handle Arch -->
    ${extrudeArch}
    <path d="${archPath}" fill="none" stroke="url(#shpArch)" stroke-width="13" stroke-linecap="round" />
    <path d="M -21 -66 A 25 25 0 0 1 19 -67" fill="none" stroke="rgba(255,255,255,0.68)" stroke-width="3" stroke-linecap="round" />
    <!-- 3D Extruded S Stack -->
    ${extrudeS}
    <!-- Front Bevel & Sculpted Face -->
    <path d="${sPath}" fill="none" stroke="url(#shpBevel)" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${sPath}" fill="none" stroke="url(#shpFace)" stroke-width="31" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Crisp Top-Left Specular Highlight -->
    <path d="${sPath}" transform="translate(-3.5, -3.5)" fill="none" stroke="url(#shpSpec)" stroke-width="7.5" stroke-linecap="round" />
  </g>
</svg>`;
  return svgToDataUrl(svg);
}

function generateIBookDataUrl(): string {
  // Pure Vector 3D Amazon 'a' + Golden Smile Arrow (312x377 viewBox)
  // Custom geometric vector path for the iconic bold lowercase 'a' (bowl + stem + terminal hook)
  const aOuterPath = [
    // Start top-left arch of 'a'
    'M -52 -58',
    'C -46 -88, -18 -102, 14 -102',
    'C 48 -102, 68 -84, 68 -48',
    'L 68 12',
    'C 68 24, 71 32, 77 38',
    'L 44 38',
    'C 40 32, 38 25, 37 18',
    'C 24 34, 4 42, -18 42',
    'C -48 42, -68 24, -68 -1',
    'C -68 -29, -44 -44, -2 -48',
    'L 34 -52',
    'L 34 -58',
    'C 34 -72, 24 -80, 7 -80',
    'C -10 -80, -21 -72, -25 -58',
    'Z',
    // Counter (inner hole of bowl)
    'M 34 -31',
    'L 4 -27',
    'C -20 -24, -33 -15, -33 -2',
    'C -33 11, -22 19, -6 19',
    'C 16 19, 34 4, 34 -18',
    'Z',
  ].join(' ');

  const smileCurve = 'M -86 58 Q 0 108 86 48';
  const smileHead = 'M 56 40 L 94 44 L 76 78';

  let extrudeA = '';
  const depthA = 22;
  for (let i = depthA; i >= 1; i--) {
    const t = i / depthA;
    const ox = (i * 0.72).toFixed(2);
    const oy = (i * 0.92).toFixed(2);
    const r = Math.round(10 + (1 - t) * 24);
    const g = Math.round(16 + (1 - t) * 32);
    const b = Math.round(30 + (1 - t) * 48);
    extrudeA += `<path d="${aOuterPath}" fill-rule="evenodd" transform="translate(${ox}, ${oy})" fill="rgb(${r},${g},${b})" />`;
  }

  let extrudeSmile = '';
  for (let i = 15; i >= 1; i--) {
    const col = i > 7 ? '#9a3412' : '#c2410c';
    const ox = (i * 0.65).toFixed(2);
    const oy = (i * 0.88).toFixed(2);
    extrudeSmile += `<g transform="translate(${ox}, ${oy})" fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round">
      <path d="${smileCurve}" stroke-width="18" />
      <path d="${smileHead}" stroke-width="15" />
    </g>`;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 312 377" width="312" height="377" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="amzBevel" x1="-70" y1="-105" x2="75" y2="45" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#64748b" />
      <stop offset="50%" stop-color="#334155" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="amzFace" x1="-65" y1="-105" x2="65" y2="45" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3b4c66" />
      <stop offset="45%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="amzSmile" x1="-90" y1="45" x2="95" y2="85" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffc247" />
      <stop offset="50%" stop-color="#ff9900" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>
  </defs>
  <g transform="translate(150, 178) scale(1.12) rotate(2)">
    <!-- Soft contact shadow -->
    <path d="${aOuterPath}" fill-rule="evenodd" transform="translate(18, 25)" fill="rgba(10, 24, 110, 0.15)" />
    <path d="${smileCurve}" transform="translate(14, 21)" fill="none" stroke="rgba(10, 24, 110, 0.15)" stroke-width="20" stroke-linecap="round" />
    <!-- 3D Extruded 'a' -->
    ${extrudeA}
    <path d="${aOuterPath}" fill-rule="evenodd" fill="url(#amzFace)" stroke="url(#amzBevel)" stroke-width="4.5" stroke-linejoin="round" />
    <path d="${aOuterPath}" fill-rule="evenodd" transform="translate(-1.8, -1.8)" fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="2" stroke-linejoin="round" />
    <!-- 3D Extruded Golden Smile Arrow -->
    ${extrudeSmile}
    <path d="${smileCurve}" fill="none" stroke="url(#amzSmile)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${smileHead}" fill="none" stroke="url(#amzSmile)" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${smileCurve}" transform="translate(-2, -2.5)" fill="none" stroke="rgba(255, 250, 220, 0.78)" stroke-width="4.2" stroke-linecap="round" />
  </g>
</svg>`;
  return svgToDataUrl(svg);
}

function generateBookDataUrl(): string {
  // Pure Vector 3D TikTok Musical Note ('d' glyph) (293x322 viewBox)
  // Exact single continuous vector stroke for the lower vinyl loop + vertical stem + upper wave flag
  const notePath =
    'M 13.8 46.9 A 36 36 0 1 1 -2.8 7.5 M 14 38 L 14 -74 Q 16 -28 66 -22';

  const buildNoteLayer = (
    ox: number,
    oy: number,
    sideDark: string,
    sideMid: string,
    gradId: string,
    specColor: string
  ) => {
    let extrude = '';
    for (let i = 14; i >= 1; i--) {
      const col = i > 7 ? sideDark : sideMid;
      extrude += `<path d="${notePath}" transform="translate(${(i * 0.62).toFixed(2)}, ${(i * 0.82).toFixed(2)})" fill="none" stroke="${col}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" />`;
    }
    return `
      <g transform="translate(${ox}, ${oy})">
        ${extrude}
        <path d="${notePath}" fill="none" stroke="url(#${gradId})" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" />
        <path d="${notePath}" transform="translate(-2.5, -2.5)" fill="none" stroke="${specColor}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
      </g>`;
  };

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 293 322" width="293" height="322" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="ttCyan" x1="-60" y1="-80" x2="65" y2="80" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#67e8f9" />
      <stop offset="100%" stop-color="#25f4ee" />
    </linearGradient>
    <linearGradient id="ttRed" x1="-60" y1="-80" x2="65" y2="80" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff6382" />
      <stop offset="100%" stop-color="#fe2c55" />
    </linearGradient>
    <linearGradient id="ttCore" x1="-60" y1="-80" x2="65" y2="80" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3b4c66" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <g transform="translate(142, 166) scale(1.15) rotate(-2.5)">
    <path d="${notePath}" transform="translate(22, 26)" fill="none" stroke="rgba(10, 24, 110, 0.16)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" />
    ${buildNoteLayer(-11, -9, '#0e7490', '#06b6d4', 'ttCyan', 'rgba(255,255,255,0.78)')}
    ${buildNoteLayer(11, 9, '#881337', '#be123c', 'ttRed', 'rgba(255,225,235,0.72)')}
    ${buildNoteLayer(0, 0, '#020617', '#0f172a', 'ttCore', 'rgba(255,255,255,0.62)')}
  </g>
</svg>`;
  return svgToDataUrl(svg);
}

function generateTshirtDataUrl(): string {
  // Pure Vector 3D Sculpted Shopify Shopping Bag & 'S' Monogram Emblem (280x260 viewBox)
  // Iconic Shopify Lime-Emerald Green (#95BF47 / #5E8E3E) 3D bag with folded gusset, 3D arch handle, and embossed 3D White 'S'
  const bagFrontPath = 'M -52 -52 L 32 -60 L 48 68 L -64 62 Z';
  const bagSideGussetPath = 'M 32 -60 L 58 -48 L 68 56 L 48 68 Z';
  const bagTopLipPath = 'M -52 -52 L -32 -62 L 58 -48 L 32 -60 Z';
  const handleBackPath = 'M -14 -58 C -14 -92, 26 -92, 26 -54';
  const handleFrontPath = 'M -24 -55 C -24 -96, 18 -98, 20 -57';
  const shopifySPath =
    'M 10 -24 C 4 -34, -22 -34, -24 -16 C -26 2, 16 -2, 14 20 C 12 38, -16 38, -26 22';

  let extrudeBag = '';
  const depthSteps = 18;
  for (let i = depthSteps; i >= 1; i--) {
    const t = i / depthSteps;
    const ox = (i * 0.68).toFixed(2);
    const oy = (i * 0.85).toFixed(2);
    const r = Math.round(36 + (1 - t) * 42);
    const g = Math.round(72 + (1 - t) * 60);
    const b = Math.round(22 + (1 - t) * 24);
    extrudeBag += `<path d="${bagFrontPath}" transform="translate(${ox}, ${oy})" fill="rgb(${r},${g},${b})" stroke="rgb(${r},${g},${b})" stroke-width="6" stroke-linejoin="round" />`;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 260" width="280" height="260" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="shpfyFront" x1="-60" y1="-60" x2="48" y2="68" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#b5e550" />
      <stop offset="42%" stop-color="#95bf47" />
      <stop offset="100%" stop-color="#659a32" />
    </linearGradient>
    <linearGradient id="shpfyGusset" x1="32" y1="-60" x2="68" y2="68" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6fa338" />
      <stop offset="55%" stop-color="#5e8e3e" />
      <stop offset="100%" stop-color="#3b5e22" />
    </linearGradient>
    <linearGradient id="shpfyBevel" x1="-60" y1="-62" x2="55" y2="68" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#d9f99d" />
      <stop offset="45%" stop-color="#95bf47" />
      <stop offset="100%" stop-color="#3f6212" />
    </linearGradient>
    <linearGradient id="shpfyHandle" x1="-24" y1="-96" x2="24" y2="-54" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="55%" stop-color="#e2e8f0" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>
  </defs>
  <g transform="translate(136, 128) scale(1.1) rotate(-1.8)">
    <!-- Soft ground shadow -->
    <path d="${bagFrontPath}" transform="translate(20, 26)" fill="rgba(10, 24, 110, 0.16)" stroke="rgba(10, 24, 110, 0.16)" stroke-width="10" stroke-linejoin="round" />

    <!-- Back Bag Loop Handle -->
    <path d="${handleBackPath}" transform="translate(4, 5)" fill="none" stroke="#3f6212" stroke-width="10" stroke-linecap="round" />
    <path d="${handleBackPath}" fill="none" stroke="#659a32" stroke-width="9.5" stroke-linecap="round" />

    <!-- 3D Extruded Bag Stack -->
    ${extrudeBag}

    <!-- Right 3D Folded Bag Gusset Panel -->
    <path d="${bagSideGussetPath}" fill="url(#shpfyGusset)" stroke="#3b5e22" stroke-width="4" stroke-linejoin="round" />
    <path d="${bagTopLipPath}" fill="#4d7c2b" stroke="#3b5e22" stroke-width="3" stroke-linejoin="round" />

    <!-- Main Front Shopify Green Bag Face -->
    <path d="${bagFrontPath}" fill="url(#shpfyFront)" stroke="url(#shpfyBevel)" stroke-width="5" stroke-linejoin="round" />

    <!-- Front 3D Arch Handle -->
    <path d="${handleFrontPath}" transform="translate(3, 4)" fill="none" stroke="rgba(45, 78, 18, 0.55)" stroke-width="10.5" stroke-linecap="round" />
    <path d="${handleFrontPath}" fill="none" stroke="url(#shpfyHandle)" stroke-width="9.5" stroke-linecap="round" />
    <path d="M -20 -64 C -18 -90, 12 -91, 16 -64" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" />

    <!-- 3D Embossed White Shopify 'S' Monogram on Bag Face -->
    <path d="${shopifySPath}" transform="translate(3.5, 4.5)" fill="none" stroke="rgba(42, 72, 16, 0.55)" stroke-width="19" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${shopifySPath}" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${shopifySPath}" transform="translate(-1.5, -1.5)" fill="none" stroke="#ecfccb" stroke-width="4" stroke-linecap="round" />

    <!-- Crisp Top-Left Specular Rim on Bag -->
    <path d="M -50 -50 L 30 -58" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2.8" stroke-linecap="round" />
    <path d="M -50 -50 L -62 59" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="2.4" stroke-linecap="round" />
  </g>
</svg>`;
  return svgToDataUrl(svg);
}

function generatePlayerArtUrl(): string {
  // 3D CNC Reactor Core Artwork for the Radio Player
  const [c, ctx] = createCanvas(120, 120);
  const g = ctx.createLinearGradient(0, 0, 120, 120);
  g.addColorStop(0, '#0f172a');
  g.addColorStop(0.5, '#1129e2');
  g.addColorStop(1, '#020617');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 120, 120);

  drawHexGrid(ctx, 60, 60, 56, 12, 'rgba(56, 189, 248, 0.25)', 1.2);

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const x = 60 + Math.cos(a) * 36;
    const y = 60 + Math.sin(a) * 36;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(60, 60, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(55, 55, 5, 0, Math.PI * 2);
  ctx.fill();
  return c.toDataURL('image/png');
}

function generateFolderIcon(isBack: boolean): string {
  const w = 53;
  const h = isBack ? 41 : 34;
  const [c, ctx] = createCanvas(w * 2, h * 2);
  ctx.scale(2, 2);
  ctx.strokeStyle = '#1129e2';
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (isBack) {
    ctx.moveTo(3, 9);
    ctx.lineTo(20, 9);
    ctx.lineTo(25, 14);
    ctx.lineTo(50, 14);
    ctx.lineTo(50, 38);
    ctx.lineTo(3, 38);
    ctx.closePath();
  } else {
    ctx.roundRect(3, 3, 47, 28, 4);
  }
  ctx.stroke();
  return c.toDataURL('image/png');
}

function generateUiIcon(
  type: 'search' | 'menu' | 'heart' | 'shuffle' | 'prev' | 'play' | 'next' | 'repeat',
  size: number
): string {
  const [c, ctx] = createCanvas(size * 2, size * 2);
  ctx.scale(2, 2);
  ctx.strokeStyle = '#1129e2';
  ctx.fillStyle = '#1129e2';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'search') {
    ctx.beginPath();
    ctx.arc(11, 11, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16.5, 16.5);
    ctx.lineTo(23, 23);
    ctx.stroke();
  } else if (type === 'menu') {
    for (const y of [7, 13, 19]) {
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.lineTo(22, y);
      ctx.stroke();
    }
  } else if (type === 'heart') {
    ctx.beginPath();
    ctx.moveTo(10, 17.5);
    ctx.bezierCurveTo(10, 17.5, 2.5, 12.5, 2.5, 7.2);
    ctx.bezierCurveTo(2.5, 4.4, 4.7, 2.5, 7.2, 2.5);
    ctx.bezierCurveTo(8.7, 2.5, 10, 3.3, 10, 4.5);
    ctx.bezierCurveTo(10, 3.3, 11.3, 2.5, 12.8, 2.5);
    ctx.bezierCurveTo(15.3, 4.4, 17.5, 4.4, 17.5, 7.2);
    ctx.bezierCurveTo(17.5, 12.5, 10, 17.5, 10, 17.5);
    ctx.stroke();
  } else if (type === 'shuffle') {
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(2, 4);
    ctx.lineTo(6, 4);
    ctx.lineTo(11, 12);
    ctx.lineTo(14, 12);
    ctx.moveTo(2, 12);
    ctx.lineTo(6, 12);
    ctx.lineTo(11, 4);
    ctx.lineTo(14, 4);
    ctx.stroke();
  } else if (type === 'prev') {
    ctx.beginPath();
    ctx.moveTo(6, 5);
    ctx.lineTo(6, 19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, 5);
    ctx.lineTo(8, 12);
    ctx.lineTo(18, 19);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'next') {
    ctx.beginPath();
    ctx.moveTo(18, 5);
    ctx.lineTo(18, 19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, 5);
    ctx.lineTo(16, 12);
    ctx.lineTo(6, 19);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'play') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(19, 14);
    ctx.lineTo(33, 24);
    ctx.lineTo(19, 34);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'repeat') {
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(2.5, 3.5, 11, 9, 2.5);
    ctx.stroke();
  }

  return c.toDataURL('image/png');
}

function generateLazadaDataUrl(): string {
  // 20-layer 3D Extruded Lazada Heart-Box Prism Sculpture (280x260 viewBox)
  const heartBoxPath =
    'M 0 -22 L -48 -52 L -68 -24 L -68 26 L 0 68 L 68 26 L 68 -24 L 48 -52 Z';
  const leftWing = 'M 0 -22 L -48 -52 L -68 -24 L 0 18 Z';
  const rightWing = 'M 0 -22 L 48 -52 L 68 -24 L 0 18 Z';

  let extrude = '';
  const steps = 20;
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const ox = (i * 0.68).toFixed(2);
    const oy = (i * 0.88).toFixed(2);
    const r = Math.round(12 + (1 - t) * 28);
    const g = Math.round(18 + (1 - t) * 22);
    const b = Math.round(95 + (1 - t) * 90);
    extrude += `<path d="${heartBoxPath}" transform="translate(${ox}, ${oy})" fill="rgb(${r},${g},${b})" stroke="rgb(${r},${g},${b})" stroke-width="6" stroke-linejoin="round" />`;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 260" width="280" height="260" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="lazBody" x1="-68" y1="-52" x2="68" y2="68" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff7a00" />
      <stop offset="48%" stop-color="#f5227f" />
      <stop offset="100%" stop-color="#0f146d" />
    </linearGradient>
    <linearGradient id="lazLeft" x1="-68" y1="-52" x2="0" y2="18" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffb347" />
      <stop offset="55%" stop-color="#ff5e00" />
      <stop offset="100%" stop-color="#e01e5a" />
    </linearGradient>
    <linearGradient id="lazRight" x1="0" y1="-52" x2="68" y2="18" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff4d79" />
      <stop offset="100%" stop-color="#1129e2" />
    </linearGradient>
  </defs>
  <g transform="translate(136, 126) scale(1.12) rotate(-2)">
    <path d="${heartBoxPath}" transform="translate(18, 25)" fill="rgba(10, 24, 110, 0.16)" stroke="rgba(10, 24, 110, 0.16)" stroke-width="10" stroke-linejoin="round" />
    ${extrude}
    <path d="${heartBoxPath}" fill="url(#lazBody)" stroke="#0f146d" stroke-width="4" stroke-linejoin="round" />
    <path d="${leftWing}" fill="url(#lazLeft)" />
    <path d="${rightWing}" fill="url(#lazRight)" />
    <path d="M 0 18 L 0 68" stroke="rgba(255,255,255,0.65)" stroke-width="3.5" stroke-linecap="round" />
    <path d="M -46 -49 L 0 -20 L 46 -49" fill="none" stroke="rgba(255,255,255,0.82)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;
  return svgToDataUrl(svg);
}

function generateEtsyDataUrl(): string {
  // 20-layer 3D Extruded Terracotta Serif 'E' Sculpture (280x260 viewBox)
  const ePath =
    'M -52 -62 L 48 -62 L 48 -32 L 32 -32 L 28 -44 L -16 -44 L -16 -8 L 22 -8 L 22 8 L -16 8 L -16 44 L 32 44 L 38 28 L 52 28 L 48 62 L -52 62 L -52 46 L -38 44 L -38 -44 L -52 -46 Z';

  let extrude = '';
  const steps = 20;
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const ox = (i * 0.68).toFixed(2);
    const oy = (i * 0.88).toFixed(2);
    const r = Math.round(135 + (1 - t) * 85);
    const g = Math.round(38 + (1 - t) * 42);
    const b = Math.round(12 + (1 - t) * 18);
    extrude += `<path d="${ePath}" transform="translate(${ox}, ${oy})" fill="rgb(${r},${g},${b})" stroke="rgb(${r},${g},${b})" stroke-width="3" stroke-linejoin="round" />`;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 260" width="280" height="260" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="etsyFace" x1="-52" y1="-62" x2="52" y2="62" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff8a4c" />
      <stop offset="50%" stop-color="#f1641e" />
      <stop offset="100%" stop-color="#c2410c" />
    </linearGradient>
  </defs>
  <g transform="translate(136, 128) scale(1.1) rotate(2)">
    <path d="${ePath}" transform="translate(18, 24)" fill="rgba(10, 24, 110, 0.16)" />
    ${extrude}
    <path d="${ePath}" fill="url(#etsyFace)" stroke="#9a3412" stroke-width="3" stroke-linejoin="round" />
    <path d="M -46 -58 L 42 -58" stroke="rgba(255,255,255,0.78)" stroke-width="3.2" stroke-linecap="round" />
  </g>
</svg>`;
  return svgToDataUrl(svg);
}

function generateModScraperUrl(): string {
  // 3D Extruded Cyber-Harvester Claw & Golden Nectar Core (280x260 viewBox)
  const hexCore = 'M 0 -36 L 31 -18 L 31 18 L 0 36 L -31 18 L -31 -18 Z';
  const leftClaw = 'M -28 -58 C -68 -42, -74 18, -32 54';
  const rightClaw = 'M 28 -58 C 68 -42, 74 18, 32 54';

  let extrudeClaw = '';
  let extrudeHex = '';
  for (let i = 18; i >= 1; i--) {
    const ox = (i * 0.65).toFixed(2);
    const oy = (i * 0.85).toFixed(2);
    const cCol = i > 9 ? '#071252' : '#0d1f8a';
    const hCol = i > 9 ? '#92400e' : '#d97706';
    extrudeClaw += `<g transform="translate(${ox}, ${oy})" fill="none" stroke="${cCol}" stroke-width="18" stroke-linecap="round">
      <path d="${leftClaw}" />
      <path d="${rightClaw}" />
    </g>`;
    extrudeHex += `<path d="${hexCore}" transform="translate(${ox}, ${oy})" fill="${hCol}" stroke="${hCol}" stroke-width="4" stroke-linejoin="round" />`;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 260" width="280" height="260" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="clawGrad" x1="-70" y1="-60" x2="70" y2="60" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="45%" stop-color="#1129e2" />
      <stop offset="100%" stop-color="#09157a" />
    </linearGradient>
    <linearGradient id="goldHex" x1="-32" y1="-36" x2="32" y2="36" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="45%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
  </defs>
  <g transform="translate(136, 126) scale(1.12) rotate(-2)">
    <path d="${hexCore}" transform="translate(18, 24)" fill="rgba(10, 24, 110, 0.16)" />
    ${extrudeClaw}
    <path d="${leftClaw}" fill="none" stroke="url(#clawGrad)" stroke-width="18" stroke-linecap="round" />
    <path d="${rightClaw}" fill="none" stroke="url(#clawGrad)" stroke-width="18" stroke-linecap="round" />
    <path d="${leftClaw}" transform="translate(-2,-2)" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="3.5" stroke-linecap="round" />
    ${extrudeHex}
    <path d="${hexCore}" fill="url(#goldHex)" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" />
    <circle cx="-8" cy="-10" r="6" fill="rgba(255,255,255,0.85)" />
  </g>
</svg>`;
  return svgToDataUrl(svg);
}

function generateModSyncUrl(): string {
  // 3D Extruded Interlocking Golden & Cobalt Planetary Sync Rings (280x260 viewBox)
  const ring1 = 'M -52 -12 A 42 42 0 1 1 32 -12 A 42 42 0 1 1 -52 -12';
  const ring2 = 'M -32 14 A 42 42 0 1 1 52 14 A 42 42 0 1 1 -32 14';

  let extrude1 = '';
  let extrude2 = '';
  for (let i = 16; i >= 1; i--) {
    const ox = (i * 0.65).toFixed(2);
    const oy = (i * 0.85).toFixed(2);
    extrude1 += `<path d="${ring1}" transform="translate(${ox}, ${oy})" fill="none" stroke="${i > 8 ? '#071252' : '#0e2299'}" stroke-width="20" />`;
    extrude2 += `<path d="${ring2}" transform="translate(${ox}, ${oy})" fill="none" stroke="${i > 8 ? '#92400e' : '#b45309'}" stroke-width="20" />`;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 260" width="280" height="260" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="syncBlue" x1="-55" y1="-55" x2="35" y2="35" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#60a5fa" />
      <stop offset="50%" stop-color="#1129e2" />
      <stop offset="100%" stop-color="#09157a" />
    </linearGradient>
    <linearGradient id="syncGold" x1="-35" y1="-30" x2="55" y2="55" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
  </defs>
  <g transform="translate(136, 126) scale(1.1) rotate(2)">
    ${extrude1}
    <path d="${ring1}" fill="none" stroke="url(#syncBlue)" stroke-width="20" />
    <path d="${ring1}" transform="translate(-2,-2)" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="3.5" />
    ${extrude2}
    <path d="${ring2}" fill="none" stroke="url(#syncGold)" stroke-width="20" />
    <path d="${ring2}" transform="translate(-2,-2)" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="3.5" />
  </g>
</svg>`;
  return svgToDataUrl(svg);
}

function generateModAiUrl(): string {
  // 3D Extruded Isometric Honeycomb Neural Cube Sculpture (280x260 viewBox)
  const outerHex = 'M 0 -64 L 56 -32 L 56 32 L 0 64 L -56 32 L -56 -32 Z';
  const innerCore = 'M 0 -28 L 24 -14 L 24 14 L 0 28 L -24 14 L -24 -14 Z';

  let extrude = '';
  for (let i = 18; i >= 1; i--) {
    const ox = (i * 0.68).toFixed(2);
    const oy = (i * 0.88).toFixed(2);
    extrude += `<path d="${outerHex}" transform="translate(${ox}, ${oy})" fill="${i > 9 ? '#071252' : '#0f239c'}" stroke="#071252" stroke-width="4" stroke-linejoin="round" />`;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 260" width="280" height="260" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="aiCube" x1="-56" y1="-64" x2="56" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#1129e2" />
      <stop offset="100%" stop-color="#081266" />
    </linearGradient>
    <linearGradient id="aiNectar" x1="-24" y1="-28" x2="24" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="35%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>
  <g transform="translate(136, 126) scale(1.1) rotate(-1.5)">
    <path d="${outerHex}" transform="translate(18, 24)" fill="rgba(10, 24, 110, 0.16)" />
    ${extrude}
    <path d="${outerHex}" fill="url(#aiCube)" stroke="#60a5fa" stroke-width="3.5" stroke-linejoin="round" />
    <path d="M 0 -64 L 0 0 M 56 -32 L 0 0 M -56 -32 L 0 0 M 0 64 L 0 0" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" />
    <path d="${innerCore}" transform="translate(5, 7)" fill="#78350f" />
    <path d="${innerCore}" fill="url(#aiNectar)" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" />
    <circle cx="-6" cy="-6" r="5" fill="#ffffff" />
  </g>
</svg>`;
  return svgToDataUrl(svg);
}

function generateModApiUrl(): string {
  // 3D Extruded Golden Nectar Droplet & Pressurized Cobalt Torus Sculpture (280x260 viewBox)
  const dropPath = 'M 0 -64 C 24 -26, 46 2, 46 28 A 46 46 0 1 1 -46 28 C -46 2, -24 -26, 0 -64 Z';

  let extrude = '';
  for (let i = 18; i >= 1; i--) {
    const ox = (i * 0.68).toFixed(2);
    const oy = (i * 0.88).toFixed(2);
    extrude += `<path d="${dropPath}" transform="translate(${ox}, ${oy})" fill="${i > 9 ? '#92400e' : '#b45309'}" />`;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 260" width="280" height="260" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="nectarDrop" x1="-46" y1="-64" x2="46" y2="74" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fef9c3" />
      <stop offset="35%" stop-color="#fbbf24" />
      <stop offset="75%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
  </defs>
  <g transform="translate(136, 122) scale(1.08) rotate(2)">
    <path d="${dropPath}" transform="translate(18, 25)" fill="rgba(10, 24, 110, 0.16)" />
    <ellipse cx="4" cy="42" rx="68" ry="22" fill="none" stroke="#09157a" stroke-width="12" />
    <ellipse cx="0" cy="36" rx="68" ry="22" fill="none" stroke="#1129e2" stroke-width="11" />
    <ellipse cx="0" cy="34" rx="68" ry="22" fill="none" stroke="#60a5fa" stroke-width="3" />
    ${extrude}
    <path d="${dropPath}" fill="url(#nectarDrop)" stroke="#fef08a" stroke-width="2.5" />
    <ellipse cx="-14" cy="16" rx="10" ry="22" transform="rotate(-18 -14 16)" fill="rgba(255,255,255,0.78)" />
    <circle cx="-18" cy="-8" r="5" fill="#ffffff" />
  </g>
</svg>`;
  return svgToDataUrl(svg);
}

let cachedAssets: CabinetAssets | null = null;

export function getCabinetAssets(): CabinetAssets {
  if (cachedAssets) return cachedAssets;
  const wings = generateCyberBeeWings();
  cachedAssets = {
    spiderCanvas: generateCyberBeeCanvas(),
    idleHeadCanvas: generateIdleHeadCanvas(),
    flyCanvas: generateFlyCanvas(),
    beeForewingCanvas: wings.forewing,
    beeHindwingCanvas: wings.hindwing,
    mugUrl: generateMugDataUrl(),
    ibookUrl: generateIBookDataUrl(),
    bookUrl: generateBookDataUrl(),
    tshirtUrl: generateTshirtDataUrl(),
    playerArtUrl: generatePlayerArtUrl(),
    logoBackUrl: generateFolderIcon(true),
    logoFrontUrl: generateFolderIcon(false),
    searchUrl: generateUiIcon('search', 26),
    menuUrl: generateUiIcon('menu', 26),
    heartUrl: generateUiIcon('heart', 20),
    shuffleUrl: generateUiIcon('shuffle', 16),
    prevUrl: generateUiIcon('prev', 24),
    playUrl: generateUiIcon('play', 48),
    nextUrl: generateUiIcon('next', 24),
    repeatUrl: generateUiIcon('repeat', 16),
    lazadaUrl: generateLazadaDataUrl(),
    etsyUrl: generateEtsyDataUrl(),
    modScraperUrl: generateModScraperUrl(),
    modSyncUrl: generateModSyncUrl(),
    modAiUrl: generateModAiUrl(),
    modApiUrl: generateModApiUrl(),
  };
  return cachedAssets;
}
