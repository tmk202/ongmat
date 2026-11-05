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
// 2. Clean, Minimalist, Studio-Polished 3D Sculpted Platform Letterforms
//    - Shopee: Sculpted 3D Orange 'S' (with subtle 3D bag arch)
//    - Amazon: Sculpted 3D 'a' + 3D Golden-Orange Smile Arrow
//    - TikTok: Sculpted 3D Chromatic 'd' Note Glyph
//    - Etsy:   Sculpted 3D Terracotta-Orange Serif 'E'
// ============================================================================

function traceShopeeS(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(46, -46);
  ctx.bezierCurveTo(32, -74, -46, -74, -46, -30);
  ctx.bezierCurveTo(-46, 12, 50, -2, 50, 44);
  ctx.bezierCurveTo(50, 84, -34, 84, -50, 50);
}

function generateMugDataUrl(): string {
  // 300 x 300 (rendered at 2x = 600 x 600):
  // Pure, studio-polished 3D Orange 'S' for Shopee with generous margin so neither handle arch nor bottom 3D extrusion clips
  const W = 300;
  const H = 300;
  const [c, ctx] = createCanvas(W * 2, H * 2);
  ctx.scale(2, 2);

  ctx.save();
  ctx.translate(142, 140);
  ctx.scale(1.12, 1.12);
  ctx.rotate(-0.05);

  // 1. Minimalist 3D Shopee Handle Arch above the 'S' (extruded 3D orange loop)
  ctx.save();
  ctx.lineCap = 'round';
  for (let d = 10; d >= 1; d--) {
    ctx.strokeStyle = d > 5 ? '#9a200c' : '#c83212';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.arc(d * 0.65, -66 + d * 0.85, 25, Math.PI * 1.06, -0.06 * Math.PI);
    ctx.stroke();
  }
  const archGrad = ctx.createLinearGradient(-26, -94, 26, -64);
  archGrad.addColorStop(0, '#ff8a4c');
  archGrad.addColorStop(0.5, '#ff5d2e');
  archGrad.addColorStop(1, '#ee4d2d');
  ctx.strokeStyle = archGrad;
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.arc(0, -66, 25, Math.PI * 1.06, -0.06 * Math.PI);
  ctx.stroke();

  // Subtle top highlight on arch
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(-1, -67.5, 25, Math.PI * 1.15, -0.22 * Math.PI);
  ctx.stroke();
  ctx.restore();

  // 2. Deep 3D Extrusion Stack for the Giant Orange 'S' (26 smooth depth layers)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const depthSteps = 26;
  for (let i = depthSteps; i >= 1; i--) {
    const t = i / depthSteps;
    const ox = i * 0.72;
    const oy = i * 0.92;
    ctx.save();
    ctx.translate(ox, oy);
    // Smooth 3D side-wall shading from deep burnt crimson-orange to rich vermilion
    const r = Math.round(148 + (1 - t) * 78);
    const g = Math.round(28 + (1 - t) * 34);
    const b = Math.round(12 + (1 - t) * 16);
    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.lineWidth = 40;
    traceShopeeS(ctx);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Front Bevel Rim of the 3D Orange 'S'
  const bevelGrad = ctx.createLinearGradient(-60, -80, 60, 85);
  bevelGrad.addColorStop(0, '#ffb074');
  bevelGrad.addColorStop(0.35, '#ff6734');
  bevelGrad.addColorStop(0.75, '#ee4d2d');
  bevelGrad.addColorStop(1, '#c93315');
  ctx.strokeStyle = bevelGrad;
  ctx.lineWidth = 40;
  traceShopeeS(ctx);
  ctx.stroke();

  // 4. Inner Sculpted Face of the 3D Orange 'S'
  const faceGrad = ctx.createLinearGradient(-50, -75, 55, 80);
  faceGrad.addColorStop(0, '#ff7b42');
  faceGrad.addColorStop(0.45, '#f6532b');
  faceGrad.addColorStop(1, '#dc3818');
  ctx.strokeStyle = faceGrad;
  ctx.lineWidth = 31;
  traceShopeeS(ctx);
  ctx.stroke();

  // 5. Crisp Studio Specular Ridge Highlight along the top-left 3D bevel
  ctx.save();
  ctx.translate(-3.5, -3.5);
  const specGrad = ctx.createLinearGradient(-50, -75, 45, 70);
  specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.78)');
  specGrad.addColorStop(0.45, 'rgba(255, 232, 210, 0.38)');
  specGrad.addColorStop(0.8, 'rgba(255, 180, 120, 0.15)');
  specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.strokeStyle = specGrad;
  ctx.lineWidth = 8.5;
  traceShopeeS(ctx);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  return c.toDataURL('image/png');
}

function generateIBookDataUrl(): string {
  // 312 x 377 (rendered at 2x = 624 x 754):
  // Pure, studio-polished 3D Amazon 'a' + 3D Golden-Orange Smile Arrow (clean floating 3D sculpture with safe margin)
  const W = 312;
  const H = 377;
  const [c, ctx] = createCanvas(W * 2, H * 2);
  ctx.scale(2, 2);

  ctx.save();
  ctx.translate(150, 184);
  ctx.scale(1.12, 1.12);
  ctx.rotate(0.035);

  // 1. 3D Extruded Lowercase 'a' Monogram
  ctx.save();
  ctx.font = '900 215px "Inter", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  // 26-layer 3D depth extrusion in deep midnight-anthracite
  const depthSteps = 26;
  for (let i = depthSteps; i >= 1; i--) {
    const t = i / depthSteps;
    const ox = -6 + i * 0.72;
    const oy = -26 + i * 0.92;
    const lum = Math.round(12 + (1 - t) * 26);
    ctx.fillStyle = `rgb(${lum}, ${lum + 6}, ${lum + 18})`;
    ctx.fillText('a', ox, oy);
  }

  // Outer 3D bevel stroke on front face
  const aBevel = ctx.createLinearGradient(-75, -115, 75, 55);
  aBevel.addColorStop(0, '#64748b');
  aBevel.addColorStop(0.5, '#334155');
  aBevel.addColorStop(1, '#0f172a');
  ctx.lineWidth = 6;
  ctx.strokeStyle = aBevel;
  ctx.strokeText('a', -6, -26);

  // Satin Charcoal-Slate 3D Front Face
  const aFace = ctx.createLinearGradient(-70, -115, 65, 55);
  aFace.addColorStop(0, '#3b4a63');
  aFace.addColorStop(0.42, '#1e293b');
  aFace.addColorStop(1, '#0f172a');
  ctx.fillStyle = aFace;
  ctx.fillText('a', -6, -26);

  // Top-left studio rim highlight on 'a'
  ctx.save();
  ctx.clip();
  ctx.restore();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.strokeText('a', -8, -28);
  ctx.restore();

  // 2. 3D Extruded Iconic Amazon Golden-Orange Smile Arrow underneath
  const traceSmileCurve = () => {
    ctx.beginPath();
    ctx.moveTo(-88, 56);
    ctx.quadraticCurveTo(0, 108, 86, 48);
  };

  const traceSmileHead = () => {
    ctx.beginPath();
    ctx.moveTo(56, 40);
    ctx.lineTo(94, 44);
    ctx.lineTo(76, 78);
  };

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 3D depth stack for the orange smile arrow
  for (let i = 18; i >= 1; i--) {
    const t = i / 18;
    ctx.save();
    ctx.translate(i * 0.65, i * 0.88);
    ctx.strokeStyle = t > 0.5 ? '#9a3412' : '#c2410c';
    ctx.lineWidth = 18;
    traceSmileCurve();
    ctx.stroke();
    ctx.lineWidth = 15;
    traceSmileHead();
    ctx.stroke();
    ctx.restore();
  }

  // Front face of the 3D Golden-Orange Smile Arrow
  const smileGrad = ctx.createLinearGradient(-90, 45, 95, 85);
  smileGrad.addColorStop(0, '#ffb830');
  smileGrad.addColorStop(0.5, '#ff9900');
  smileGrad.addColorStop(1, '#ea580c');
  ctx.strokeStyle = smileGrad;
  ctx.lineWidth = 18;
  traceSmileCurve();
  ctx.stroke();

  ctx.lineWidth = 15;
  traceSmileHead();
  ctx.stroke();

  // Glossy specular ridge on the smile arrow
  ctx.save();
  ctx.translate(-2, -2.5);
  ctx.strokeStyle = 'rgba(255, 250, 220, 0.72)';
  ctx.lineWidth = 4.5;
  traceSmileCurve();
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  ctx.restore();
  return c.toDataURL('image/png');
}

function generateBookDataUrl(): string {
  // 293 x 322 (rendered at 2x = 586 x 644):
  // Pure, studio-polished 3D TikTok Musical Note ('d' glyph) with 3D Cyan, Coral-Red & Obsidian extrusion
  const W = 293;
  const H = 322;
  const [c, ctx] = createCanvas(W * 2, H * 2);
  ctx.scale(2, 2);

  ctx.save();
  ctx.translate(142, 166);
  ctx.scale(1.16, 1.16);
  ctx.rotate(-0.045);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const traceNote = () => {
    ctx.beginPath();
    // Lower vinyl loop of the 'd' note
    ctx.arc(-22, 38, 36, 0.08 * Math.PI, Math.PI * 1.68);
    // Vertical stem
    ctx.moveTo(14, 38);
    ctx.lineTo(14, -74);
    // Upper wave flag
    ctx.quadraticCurveTo(16, -28, 66, -22);
  };

  // Helper to draw a 3D extruded note layer
  const draw3DNoteLayer = (
    ox: number,
    oy: number,
    sideDark: string,
    sideMid: string,
    frontStart: string,
    frontEnd: string,
    specColor: string
  ) => {
    ctx.save();
    ctx.translate(ox, oy);
    for (let i = 16; i >= 1; i--) {
      ctx.save();
      ctx.translate(i * 0.62, i * 0.82);
      ctx.strokeStyle = i > 8 ? sideDark : sideMid;
      ctx.lineWidth = 30;
      traceNote();
      ctx.stroke();
      ctx.restore();
    }

    const grad = ctx.createLinearGradient(-60, -80, 65, 80);
    grad.addColorStop(0, frontStart);
    grad.addColorStop(1, frontEnd);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 30;
    traceNote();
    ctx.stroke();

    ctx.save();
    ctx.translate(-2.5, -2.5);
    ctx.strokeStyle = specColor;
    ctx.lineWidth = 6;
    traceNote();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  };

  // 1. Back-left 3D Cyan Layer (#25F4EE)
  draw3DNoteLayer(
    -11,
    -9,
    '#0e7490',
    '#06b6d4',
    '#67e8f9',
    '#25f4ee',
    'rgba(255, 255, 255, 0.7)'
  );

  // 2. Back-right 3D Coral-Red Layer (#FE2C55)
  draw3DNoteLayer(
    11,
    9,
    '#881337',
    '#be123c',
    '#ff5c7c',
    '#fe2c55',
    'rgba(255, 220, 230, 0.65)'
  );

  // 3. Center 3D Sculpted Obsidian-Slate Core Layer
  draw3DNoteLayer(
    0,
    0,
    '#020617',
    '#0f172a',
    '#334155',
    '#0f172a',
    'rgba(255, 255, 255, 0.55)'
  );

  ctx.restore();
  return c.toDataURL('image/png');
}

function generateTshirtDataUrl(): string {
  // 280 x 260 (rendered at 2x = 560 x 520):
  // Pure, studio-polished 3D Terracotta-Orange Serif 'E' for Etsy anchored at bottom edge with safe margin
  const W = 280;
  const H = 260;
  const [c, ctx] = createCanvas(W * 2, H * 2);
  ctx.scale(2, 2);

  ctx.save();
  ctx.translate(132, 134);
  ctx.scale(1.08, 1.08);
  ctx.rotate(-0.025);

  ctx.font = '900 188px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  // 1. 28-Layer 3D Extrusion Stack in Warm Burnt Terracotta
  const depthSteps = 28;
  for (let i = depthSteps; i >= 1; i--) {
    const t = i / depthSteps;
    const ox = i * 0.75;
    const oy = i * 0.92;
    const r = Math.round(124 + (1 - t) * 76);
    const g = Math.round(38 + (1 - t) * 32);
    const b = Math.round(12 + (1 - t) * 12);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillText('E', ox, oy);
  }

  // 2. Outer 3D Bevel Rim on the Serif 'E'
  const bevelGrad = ctx.createLinearGradient(-65, -85, 65, 85);
  bevelGrad.addColorStop(0, '#fdba74');
  bevelGrad.addColorStop(0.4, '#fb923c');
  bevelGrad.addColorStop(1, '#c2410c');
  ctx.lineWidth = 6.5;
  ctx.strokeStyle = bevelGrad;
  ctx.strokeText('E', 0, 0);

  // 3. Sculpted Etsy Orange Front Face (#F1641E)
  const faceGrad = ctx.createLinearGradient(-60, -85, 60, 85);
  faceGrad.addColorStop(0, '#ff8547');
  faceGrad.addColorStop(0.5, '#f1641e');
  faceGrad.addColorStop(1, '#d9480f');
  ctx.fillStyle = faceGrad;
  ctx.fillText('E', 0, 0);

  // 4. Crisp Top-Left Specular Bevel Highlight
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.strokeText('E', -2, -2);

  ctx.restore();
  return c.toDataURL('image/png');
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
  };
  return cachedAssets;
}
