import type { CabinetAssets } from '../assets/cabinetSprites';
import {
  CLUSTER_META,
  PLATFORM_ECOSYSTEM_CONFIG,
  type PlatformNodeConfig,
  buildPlatformLogoMap,
} from '../assets/platformEcosystemLogos';

interface HoneyParticle {
  t: number;
  speed: number;
  lane: number;
  size: number;
  color: string;
  isHex: boolean;
  phase: number;
}

interface IngestionEvent {
  nodeId: string;
  progress: number; // 0 -> 1
  duration: number;
}

function drawViscousHoneyDroplet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle = 0
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Soft amber glow
  ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
  ctx.shadowBlur = r * 1.6;

  const grad = ctx.createRadialGradient(-r * 0.28, -r * 0.28, r * 0.1, 0, 0, r * 1.15);
  grad.addColorStop(0, '#fffbeb');
  grad.addColorStop(0.28, '#fde047');
  grad.addColorStop(0.65, '#f59e0b');
  grad.addColorStop(0.92, '#b45309');
  grad.addColorStop(1, 'rgba(146, 64, 14, 0.85)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Crisp specular highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.32, r * 0.34, r * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Renders a React Bits Pro style "Falling Ray" light pulse along a fanning curve:
 * - Long trailing fade (trailLength ~ 0.46)
 * - Soft optical motionBlur smearing pass (bgGlow)
 * - Dual-color gradient transition (color1 -> color2 -> incandescent white-gold pulseWidth head)
 */
function drawFallingRayPulse(
  ctx: CanvasRenderingContext2D,
  sampleFn: (t: number) => { x: number; y: number },
  headT: number,
  trailLength: number,
  rayWidth: number,
  color1: string,
  isHighlighted: boolean
) {
  const clampedHead = Math.min(1, headT);
  const tailT = Math.max(0, clampedHead - trailLength);
  if (clampedHead <= tailT + 0.005) return;

  const steps = 18;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const t = tailT + (clampedHead - tailT) * u;
    pts.push(sampleFn(t));
  }

  // Smooth fade as the pulse is absorbed into the Glyph Orb surface (t > 0.90)
  const absorbFade = headT > 0.9 ? Math.max(0, (1.12 - headT) / 0.22) : 1;
  if (absorbFade <= 0.01) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Pass 1: Subtle motion-blur / bgGlow ambient bloom along the pulse body (slimmer & more delicate)
  for (let i = 2; i < steps; i++) {
    const frac = (i + 1) / steps;
    const glowAlpha = Math.pow(frac, 2.4) * (isHighlighted ? 0.16 : 0.08) * absorbFade;
    if (glowAlpha < 0.01) continue;
    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
    ctx.strokeStyle = `rgba(245, 158, 11, ${glowAlpha})`;
    ctx.lineWidth = rayWidth * (1.45 + frac * 0.95);
    ctx.stroke();
  }

  // Pass 2: Fine razor-sharp Falling Ray core streak (color1 -> color2 -> white-gold head)
  for (let i = 0; i < steps; i++) {
    const frac = (i + 1) / steps; // 0 at tail -> 1 at pulse head
    const alpha = Math.pow(frac, 1.8) * absorbFade;
    if (alpha < 0.015) continue;

    ctx.beginPath();
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y);

    if (frac < 0.42) {
      // Tail: color1 (indigo / electric blue)
      ctx.strokeStyle = isHighlighted
        ? `rgba(245, 158, 11, ${alpha * 0.65})`
        : `rgba(79, 70, 229, ${alpha * 0.58})`;
    } else if (frac < 0.82) {
      // Mid-streak: color2 (solar honey amber)
      ctx.strokeStyle = `rgba(245, 158, 11, ${alpha * 0.88})`;
    } else {
      // Pulse head (pulseWidth): incandescent white-gold
      ctx.strokeStyle = `rgba(254, 249, 195, ${Math.min(1, alpha * 1.05)})`;
    }

    ctx.lineWidth = Math.max(0.35, rayWidth * (0.14 + 0.65 * Math.pow(frac, 1.5)));
    ctx.stroke();
  }

  // Pass 3: Delicate optical pulse tip spark
  const head = pts[steps];
  const prev = pts[steps - 1] || head;
  const angle = Math.atan2(head.y - prev.y, head.x - prev.x);

  ctx.translate(head.x, head.y);
  ctx.rotate(angle);
  ctx.shadowColor = isHighlighted ? '#fbbf24' : color1;
  ctx.shadowBlur = isHighlighted ? 8 : 4;

  ctx.fillStyle = `rgba(255, 255, 255, ${0.92 * absorbFade})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, rayWidth * 1.35, rayWidth * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Renders the Central Hive as a React Bits Pro style "Glyph Orb":
 * A 3D banded ASCII/Honeycomb sphere turning slowly in the light of the incoming Falling Rays,
 * rendered using perspective-projected glyphs with directional solar shading.
 */
/**
 * Exact ASCII density ramp matching React Bits Pro "Glyph Orb" (from sparse punctuation in shadow
 * to dense alphanumeric/symbol clusters on sunlit 3D band crests).
 */
const GLYPH_ORB_ASCII_RAMP =
  " .',-_~:;!^\"+<>/r()|i1l?I[]{}jcvunxzftLCJUYXZO0Qoahkbdpqwm*WMB8&%$#@";

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function drawGlyphOrbHive(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  clock: number
) {
  ctx.save();
  ctx.translate(centerX, centerY);

  // 1. Airy Cobalt-Periwinkle & Honey Aura (Zero black/dark background, blends seamlessly with the blue theme)
  const bgRadius = radius * 1.18;
  const coreGrad = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, bgRadius);
  coreGrad.addColorStop(0, 'rgba(17, 41, 226, 0.10)');
  coreGrad.addColorStop(0.52, 'rgba(59, 130, 246, 0.06)');
  coreGrad.addColorStop(0.82, 'rgba(99, 102, 241, 0.025)');
  coreGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(0, 0, bgRadius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle warm honey-gold inner glow on the sunlit left-center hemisphere
  const bloomGrad = ctx.createRadialGradient(
    -radius * 0.22,
    -radius * 0.08,
    radius * 0.05,
    -radius * 0.12,
    0,
    radius * 0.95
  );
  bloomGrad.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
  bloomGrad.addColorStop(0.55, 'rgba(17, 41, 226, 0.05)');
  bloomGrad.addColorStop(1, 'rgba(17, 41, 226, 0)');
  ctx.fillStyle = bloomGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
  ctx.fill();

  // 2. Raymarched 2D Monospace ASCII Grid Mapped to a 3D Rotating Banded Sphere
  const scale = radius / 92;
  const cellW = 4.65 * scale;
  const cellH = 7.8 * scale;
  const fontSize = 7.6 * scale;
  const cols = Math.floor((radius * 2) / cellW);
  const rows = Math.floor((radius * 2) / cellH);

  // Smooth 3D rotation angles
  const rotY = clock * 0.52;
  const rotX = 0.28 + Math.sin(clock * 0.35) * 0.12;
  const rotZ = -0.18 + Math.cos(clock * 0.28) * 0.08;

  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const cosZ = Math.cos(rotZ);
  const sinZ = Math.sin(rotZ);

  // Light direction from upper-left/front (matches the React Bits screenshot illumination)
  const lx = -0.52;
  const ly = -0.24;
  const lz = 0.82;

  ctx.font = `700 ${fontSize.toFixed(2)}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const rampLen = GLYPH_ORB_ASCII_RAMP.length;

  for (let r = 0; r < rows; r++) {
    const py = (r - rows / 2 + 0.5) * cellH;
    const ny = py / radius;

    for (let c = 0; c < cols; c++) {
      const px = (c - cols / 2 + 0.5) * cellW;
      const nx = px / radius;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1.0) continue;

      // Exact unit sphere Z normal at (nx, ny)
      const nz = Math.sqrt(1.0 - r2);

      // Rotate 3D surface normal (nx, ny, nz) into object space (sx, sy, sz)
      // 1) Z-axis tilt
      const x1 = nx * cosZ - ny * sinZ;
      const y1 = nx * sinZ + ny * cosZ;
      const z1 = nz;
      // 2) X-axis tilt
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;
      // 3) Y-axis spin
      const sx = x2 * cosY + z2 * sinY;
      const sy = y2;
      const sz = -x2 * sinY + z2 * cosY;

      // 3D organic warped latitude bands on the sphere surface
      const domainWarp =
        Math.sin(sx * 3.6 + sz * 3.4 - clock * 0.65) * 0.26 +
        Math.cos(sz * 4.2 - sy * 2.8 + clock * 0.4) * 0.14;
      const bandPhase = (sy + domainWarp) * 14.5 - clock * 0.95;
      const bandWave = 0.5 + 0.5 * Math.sin(bandPhase);
      const bandRidge = Math.pow(bandWave, 1.55);

      // Lambertian diffuse lighting + rim falloff
      const ndotl = Math.max(0, nx * lx + ny * ly + nz * lz);
      const diffuse = Math.pow(ndotl, 1.12);
      const horizonFade = Math.pow(nz, 0.48);

      // Combined surface luminance (0 in deep right shadow -> 1 on sunlit left-center band crests)
      const lum = Math.min(
        1,
        (0.07 + diffuse * (0.2 + 0.88 * bandRidge) + bandRidge * 0.08) * horizonFade
      );

      if (lum < 0.035) continue;

      // Deterministic spatial hash so adjacent cells in the same band have rich ASCII texture
      // without flickering randomly every frame
      const cellHash = (r * 19 + c * 37) % 5;
      const baseIdx = Math.floor(lum * (rampLen - 4));
      const charIdx = Math.max(
        1,
        Math.min(rampLen - 1, baseIdx + (lum > 0.14 ? (cellHash - 2) : 0))
      );
      const ch = GLYPH_ORB_ASCII_RAMP[charIdx];
      if (ch === ' ') continue;

      // Multi-stop color ramp tailored to the Cabinet Royal Blue (#1129e2) + Honey Amber (#f59e0b) theme:
      // Low lum (receding right shadow & outer halo): Soft Periwinkle-Sky (#60a5fa -> #3b82f6)
      // Mid lum (3D wave slopes): Vibrant Royal Cobalt & Electric Indigo (#2563eb -> #1129e2 -> #4338ca)
      // High lum (sunlit 3D wave crests on the left/center): Deep Royal Cobalt (#1129e2) -> Rich Honey Amber (#d97706 / #f59e0b)
      let red: number;
      let green: number;
      let blue: number;
      if (lum < 0.34) {
        const t = lum / 0.34;
        red = Math.round(lerpNum(96, 37, t));
        green = Math.round(lerpNum(145, 99, t));
        blue = Math.round(lerpNum(250, 235, t));
      } else if (lum < 0.72) {
        const t = (lum - 0.34) / 0.38;
        red = Math.round(lerpNum(37, 17, t));
        green = Math.round(lerpNum(99, 41, t));
        blue = Math.round(lerpNum(235, 226, t));
      } else {
        const t = (lum - 0.72) / 0.28;
        red = Math.round(lerpNum(17, 217, t));
        green = Math.round(lerpNum(41, 119, t));
        blue = Math.round(lerpNum(226, 6, t));
      }

      const alpha = Math.min(1, 0.26 + Math.pow(lum, 0.72) * 0.74);
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`;
      ctx.fillText(ch, px, py);
    }
  }

  ctx.restore();
}

function draw3DHexCapsule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rot: number,
  accentColor: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  // 3D depth extrusion
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const px = Math.cos(a) * radius + 2.5;
    const py = Math.sin(a) * radius + 3.5;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  const g = ctx.createLinearGradient(-radius, -radius, radius, radius);
  g.addColorStop(0, '#fef08a');
  g.addColorStop(0.5, '#f59e0b');
  g.addColorStop(1, '#b45309');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const px = Math.cos(a) * radius;
    const py = Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner platform accent core
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.36, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCyberBeeMini(
  ctx: CanvasRenderingContext2D,
  assets: CabinetAssets,
  x: number,
  y: number,
  angle: number,
  scale: number,
  clock: number,
  carryingColor: string | null
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // Carrying 3D honey capsule glow underneath
  if (carryingColor) {
    draw3DHexCapsule(ctx, 0, 12, 22, clock * 3.2, carryingColor);
  }

  // Draw body from spiderCanvas
  ctx.save();
  ctx.rotate(Math.PI); // align head forward
  ctx.drawImage(assets.spiderCanvas, -140, -140, 280, 280);

  // Flapping wings
  const flap = Math.sin(clock * 46) * 0.36;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 26, 10);
    ctx.scale(side, 1);
    ctx.rotate(-0.35 + flap);
    ctx.drawImage(assets.beeForewingCanvas, 0, -55, 165, 90);
    ctx.restore();

    ctx.save();
    ctx.translate(side * 22, -8);
    ctx.scale(side, 1);
    ctx.rotate(-0.62 - flap * 0.85);
    ctx.drawImage(assets.beeHindwingCanvas, 0, -42, 120, 70);
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}

// ============================================================================
// 1. Section 2: Interactive Mechanical Honey-Data Refinery Canvas
//    Left Side: 21-Platform Ecosystem + React Bits "Falling Rays" Light Fan
//    Center: React Bits "Glyph Orb" 3D Honeycomb Sphere
//    Right Side: PostgreSQL, Snowflake, REST / AI Vaults
// ============================================================================

interface FanRayPulse {
  t: number;
  speed: number;
  rayIdx: number;
  trailLen: number;
  width: number;
}

export class RefineryCanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private assets: CabinetAssets;
  private logoMap: Map<string, HTMLImageElement>;
  private particles: HoneyParticle[] = [];
  private fanPulses: FanRayPulse[] = [];
  private outParticles: HoneyParticle[] = [];
  private ingestionEvents: IngestionEvent[] = [];
  private nextIngestionTimer = 0.45;
  private ingestionCursor = 0;
  private clock = 0;
  private W = 1000;
  private H = 520;
  private dpr = 1;
  private hoveredNodeId: string | null = null;
  private beePos = { x: 560, y: 260, vx: 0, vy: 0, angle: 0 };
  private beeTarget = { x: 560, y: 260 };
  private beeColor = '#ee4d2d';

  private sinkMeta = [
    { name: 'PostgreSQL', sub: 'Row-Level Sync', color: '#1129e2' },
    { name: 'Snowflake', sub: 'Parquet Stream', color: '#0ea5e9' },
    { name: 'REST / AI', sub: 'Live Webhook', color: '#f59e0b' },
  ];

  constructor(canvas: HTMLCanvasElement, assets: CabinetAssets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.assets = assets;
    this.logoMap = buildPlatformLogoMap();

    // Spawn 56 Falling Ray pulses on the 21 platform rays (trailLength ~ 0.44..0.52)
    const totalPlatforms = PLATFORM_ECOSYSTEM_CONFIG.length;
    for (let i = 0; i < 56; i++) {
      const lane = i % totalPlatforms;
      const cfg = PLATFORM_ECOSYSTEM_CONFIG[lane];
      const clusterSpeedBonus =
        cfg.cluster === 'ecommerce'
          ? 0.03
          : cfg.cluster === 'marketplaces'
            ? 0.05
            : cfg.cluster === 'social'
              ? 0.07
              : 0.02;
      this.particles.push({
        t: (i / 56 + Math.random() * 0.25) % 1.15,
        speed: 0.26 + clusterSpeedBonus + Math.random() * 0.14,
        lane,
        size: cfg.tier === 1 ? 1.35 + Math.random() * 0.35 : 0.95 + Math.random() * 0.3,
        color: cfg.color,
        isHex: false,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Spawn 20 ambient harmonic fan ray pulses so total rayCount = 37 (React Bits Falling Rays)
    for (let i = 0; i < 20; i++) {
      this.fanPulses.push({
        t: Math.random() * 1.1,
        speed: 0.22 + Math.random() * 0.16,
        rayIdx: i % 16,
        trailLen: 0.24 + Math.random() * 0.11,
        width: 0.72 + Math.random() * 0.28,
      });
    }

    // Spawn outgoing purified golden particles (Unchanged)
    for (let i = 0; i < 27; i++) {
      const lane = i % 3;
      this.outParticles.push({
        t: Math.random(),
        speed: 0.26 + Math.random() * 0.15,
        lane,
        size: 6 + Math.random() * 4,
        color: '#f59e0b',
        isHex: i % 2 === 0,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.beeTarget.x = mx;
      this.beeTarget.y = my;

      // Check proximity to visible left-side platform ecosystem nodes
      const visible = this.getVisiblePlatforms();
      let hitId: string | null = null;
      let minDist = Infinity;
      for (const node of visible) {
        const pos = this.getNodePosition(node);
        const hitRadius = this.getNodeRadius(node) + 10;
        const d = Math.hypot(mx - pos.x, my - pos.y);
        if (d < hitRadius && d < minDist) {
          minDist = d;
          hitId = node.id;
          this.beeColor = node.color;
        }
      }
      this.hoveredNodeId = hitId;
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.hoveredNodeId = null;
    });

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      this.step(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = this.canvas.clientWidth || 1000;
    this.H = this.canvas.clientHeight || 520;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    const cx = this.getCenterX();
    this.beePos.x = cx;
    this.beePos.y = this.H * 0.5;
    this.beeTarget.x = cx;
    this.beeTarget.y = this.H * 0.38;
  }

  private getCenterX(): number {
    return this.W < 640 ? this.W * 0.54 : this.W * 0.56;
  }

  private getRightX(): number {
    return this.W * 0.87;
  }

  private getVisiblePlatforms(): PlatformNodeConfig[] {
    if (this.W >= 920) {
      return PLATFORM_ECOSYSTEM_CONFIG;
    }
    if (this.W >= 620) {
      return PLATFORM_ECOSYSTEM_CONFIG.filter((p) => p.tier <= 2);
    }
    const mobileIds = new Set([
      'shopify',
      'woocommerce',
      'amazon',
      'shopee',
      'lazada',
      'ebay',
      'tiktok',
      'metashops',
      'stripe',
      'googleads',
    ]);
    return PLATFORM_ECOSYSTEM_CONFIG.filter((p) => mobileIds.has(p.id));
  }

  private getNodeRadius(node: PlatformNodeConfig): number {
    const scale = this.W < 620 ? 0.82 : this.W < 920 ? 0.92 : 1;
    if (node.tier === 1) return 22.5 * scale;
    if (node.tier === 2) return 18 * scale;
    return 14.5 * scale;
  }

  private getNodePosition(node: PlatformNodeConfig): { x: number; y: number } {
    const rxScale = this.W < 620 ? 1.08 : 1.05;
    const baseX = this.W * Math.min(0.39, node.rx * rxScale);
    const baseY = this.H * node.ry;
    const floatX = Math.cos(this.clock * 0.62 + node.phaseOffset) * 0.85;
    const floatY = Math.sin(this.clock * 0.85 + node.phaseOffset) * 1.4;
    return { x: baseX + floatX, y: baseY + floatY };
  }

  private getClusterIntakeOffset(cluster: PlatformNodeConfig['cluster']): number {
    switch (cluster) {
      case 'ecommerce':
        return -24;
      case 'marketplaces':
        return -8;
      case 'social':
        return 8;
      case 'marketing':
        return 24;
    }
  }

  private getNodeBezierPoints(
    node: PlatformNodeConfig,
    centerX: number,
    centerY: number
  ): {
    x0: number;
    y0: number;
    cx1: number;
    cy1: number;
    cx2: number;
    cy2: number;
    x1: number;
    y1: number;
  } {
    const pos = this.getNodePosition(node);
    const r = this.getNodeRadius(node);
    const cluster = CLUSTER_META[node.cluster];
    const hubX = this.W * cluster.hubRx;
    const hubY = this.H * cluster.hubRy;
    // Converge onto the western limb of the enlarged Glyph Orb
    const orbRadius = 84;
    const intakeYOffset = this.getClusterIntakeOffset(node.cluster) + (pos.y - centerY) * 0.08;
    const clampedOffset = Math.max(-orbRadius * 0.72, Math.min(orbRadius * 0.72, intakeYOffset));
    const intakeX = centerX - Math.sqrt(Math.max(100, orbRadius * orbRadius - clampedOffset * clampedOffset));
    const intakeY = centerY + clampedOffset;

    const x0 = pos.x + r * 0.82;
    const y0 = pos.y;
    const cx1 = x0 + (hubX - x0) * 0.68;
    const cy1 = y0 + (hubY - y0) * 0.34;
    const cx2 = hubX + (intakeX - hubX) * 0.54;
    const cy2 = hubY + (intakeY - hubY) * 0.72;

    return { x0, y0, cx1, cy1, cx2, cy2, x1: intakeX, y1: intakeY };
  }

  /**
   * Computes one of the 16 intermediate harmonic fanning rays so the left-to-orb
   * connection forms a lush 37-ray "Falling Rays" optical fan.
   */
  private getHarmonicFanRayBezier(
    rayIdx: number,
    centerX: number,
    centerY: number
  ): {
    x0: number;
    y0: number;
    cx1: number;
    cy1: number;
    cx2: number;
    cy2: number;
    x1: number;
    y1: number;
  } {
    const u = (rayIdx + 0.5) / 16; // 0 .. 1 from top to bottom of the fan
    const x0 = this.W * (0.08 + (rayIdx % 3) * 0.07);
    const y0 = this.H * (0.06 + u * 0.88);
    const orbRadius = 84;
    const offset = (u - 0.5) * orbRadius * 1.35;
    const x1 = centerX - Math.sqrt(Math.max(100, orbRadius * orbRadius - offset * offset));
    const y1 = centerY + offset;

    const cx1 = x0 + (x1 - x0) * 0.42;
    const cy1 = y0;
    const cx2 = x0 + (x1 - x0) * 0.76;
    const cy2 = y1 + (y0 - y1) * 0.18;
    return { x0, y0, cx1, cy1, cx2, cy2, x1, y1 };
  }

  private getSinkY(idx: number): number {
    const pad = 78;
    const avail = this.H - pad * 2;
    return pad + (avail / 2) * idx;
  }

  private step(dt: number) {
    this.clock += dt;
    const centerX = this.getCenterX();

    // Periodic Active Data Ingestion Event simulation
    this.nextIngestionTimer -= dt;
    if (this.nextIngestionTimer <= 0) {
      const visible = this.getVisiblePlatforms();
      if (visible.length > 0) {
        this.ingestionCursor = (this.ingestionCursor + 5) % visible.length;
        const chosen = visible[this.ingestionCursor];
        this.ingestionEvents.push({
          nodeId: chosen.id,
          progress: 0,
          duration: 1.55,
        });
      }
      this.nextIngestionTimer = 0.6 + Math.random() * 0.4;
    }

    for (let i = this.ingestionEvents.length - 1; i >= 0; i--) {
      const ev = this.ingestionEvents[i];
      ev.progress += dt / ev.duration;
      if (ev.progress >= 1) {
        this.ingestionEvents.splice(i, 1);
      }
    }

    // Autonomous patrol if pointer not hovering a node
    if (!this.hoveredNodeId && Math.floor(this.clock * 0.6) % 2 === 0) {
      const visible = this.getVisiblePlatforms();
      const idx = Math.floor(this.clock * 0.45) % visible.length;
      const orbitR = 78;
      this.beeTarget.x = centerX + Math.cos(this.clock * 1.8) * orbitR;
      this.beeTarget.y = this.H * 0.5 + Math.sin(this.clock * 1.4) * (orbitR * 0.65);
      if (visible[idx]) {
        this.beeColor = visible[idx].color;
      }
    }

    const dx = this.beeTarget.x - this.beePos.x;
    const dy = this.beeTarget.y - this.beePos.y;
    this.beePos.vx += dx * 4.5 * dt;
    this.beePos.vy += dy * 4.5 * dt;
    this.beePos.vx *= 0.86;
    this.beePos.vy *= 0.86;
    this.beePos.x += this.beePos.vx;
    this.beePos.y += this.beePos.vy;

    if (Math.hypot(this.beePos.vx, this.beePos.vy) > 0.4) {
      const targetAngle = Math.atan2(this.beePos.vy, this.beePos.vx) + Math.PI / 2;
      let diff = targetAngle - this.beePos.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.beePos.angle += diff * 0.14;
    }

    for (const p of this.particles) {
      const cfg = PLATFORM_ECOSYSTEM_CONFIG[p.lane];
      const isHovered = cfg && this.hoveredNodeId === cfg.id;
      const isIngesting =
        cfg && this.ingestionEvents.some((ev) => ev.nodeId === cfg.id && ev.progress < 0.85);
      const interactionBoost = isHovered ? 2.2 : isIngesting ? 1.75 : 1;
      // Smooth Falling-Rays pulse acceleration into the Glyph Orb
      const cascadeAccel = 0.88 + Math.pow(Math.min(1, p.t), 1.4) * 1.35;
      p.t += p.speed * interactionBoost * cascadeAccel * dt;
      if (p.t > 1.15) p.t = 0;
    }

    for (const fp of this.fanPulses) {
      fp.t += fp.speed * (0.9 + Math.pow(Math.min(1, fp.t), 1.3) * 1.2) * dt;
      if (fp.t > 1.15) fp.t = 0;
    }

    for (const p of this.outParticles) {
      p.t = (p.t + p.speed * dt) % 1;
    }
  }

  private evalBezier(
    t: number,
    x0: number,
    y0: number,
    cx1: number,
    cy1: number,
    cx2: number,
    cy2: number,
    x1: number,
    y1: number
  ) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    return {
      x: uuu * x0 + 3 * uu * t * cx1 + 3 * u * tt * cx2 + ttt * x1,
      y: uuu * y0 + 3 * uu * t * cy1 + 3 * u * tt * cy2 + ttt * y1,
    };
  }

  private getNodeIngestionIntensity(nodeId: string): number {
    let maxIntensity = 0;
    for (const ev of this.ingestionEvents) {
      if (ev.nodeId === nodeId) {
        const bell = Math.sin(ev.progress * Math.PI);
        if (bell > maxIntensity) maxIntensity = bell;
      }
    }
    return maxIntensity;
  }

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, this.W, this.H);

    const centerX = this.getCenterX();
    const centerY = this.H * 0.5;
    const rightX = this.getRightX();
    const visiblePlatforms = this.getVisiblePlatforms();
    const visibleIds = new Set(visiblePlatforms.map((p) => p.id));

    // 1. Draw React Bits "Falling Rays" Light Pulses Streaming in Free Space into the Glyph Orb (No static connection lines!)
    // 1A. Harmonic fan ray pulses
    for (const fp of this.fanPulses) {
      const bz = this.getHarmonicFanRayBezier(fp.rayIdx, centerX, centerY);
      const sampleFn = (tVal: number) =>
        this.evalBezier(tVal, bz.x0, bz.y0, bz.cx1, bz.cy1, bz.cx2, bz.cy2, bz.x1, bz.y1);
      drawFallingRayPulse(ctx, sampleFn, fp.t, fp.trailLen, fp.width, '#6366f1', false);
    }

    // 1B. Platform Falling Ray pulses (slimmer & more compact trailLength)
    for (const p of this.particles) {
      const node = PLATFORM_ECOSYSTEM_CONFIG[p.lane];
      if (!node || !visibleIds.has(node.id)) continue;

      const bz = this.getNodeBezierPoints(node, centerX, centerY);
      const isHovered = this.hoveredNodeId === node.id;
      const sampleCurve = (tVal: number) =>
        this.evalBezier(tVal, bz.x0, bz.y0, bz.cx1, bz.cy1, bz.cx2, bz.cy2, bz.x1, bz.y1);

      const trailLength = node.tier === 1 ? 0.32 : 0.26;
      drawFallingRayPulse(
        ctx,
        sampleCurve,
        p.t,
        trailLength,
        p.size,
        node.color,
        isHovered
      );
    }

    // 1C. High-Intensity Falling Ray surges during Active Ingestion Events
    for (const ev of this.ingestionEvents) {
      const node = visiblePlatforms.find((n) => n.id === ev.nodeId);
      if (!node) continue;
      const bz = this.getNodeBezierPoints(node, centerX, centerY);
      const sampleCurve = (tVal: number) =>
        this.evalBezier(tVal, bz.x0, bz.y0, bz.cx1, bz.cy1, bz.cx2, bz.cy2, bz.x1, bz.y1);

      const headT = ev.progress * 1.15;
      if (headT > 0.02 && headT <= 1.12) {
        drawFallingRayPulse(ctx, sampleCurve, headT, 0.38, 1.85, node.color, true);
      }
    }

    // 4. Draw Outgoing Purified Golden Honey Stream [UNCHANGED]
    for (const p of this.outParticles) {
      const sy = this.getSinkY(p.lane);
      const pos = this.evalBezier(
        p.t,
        centerX + 82,
        centerY,
        centerX + (rightX - centerX) * 0.45,
        centerY,
        rightX - (rightX - centerX) * 0.5,
        sy,
        rightX - 48,
        sy
      );
      if (p.isHex) {
        draw3DHexCapsule(ctx, pos.x, pos.y, p.size * 1.4, -this.clock * 2 + p.phase, '#1129e2');
      } else {
        drawViscousHoneyDroplet(ctx, pos.x, pos.y, p.size * 1.05, 0);
      }
    }

    // 5. Draw Left-Side Multi-Platform Ecosystem Nodes (Frameless / Borderless Levitating Logos, No Text Labels)
    for (const node of visiblePlatforms) {
      const pos = this.getNodePosition(node);
      const baseR = this.getNodeRadius(node);
      const isHovered = this.hoveredNodeId === node.id;

      const levitatePhase = Math.sin(this.clock * 0.85 + node.phaseOffset);
      const r = isHovered ? baseR * 1.15 : baseR;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Pure Floating Brand Vector Logo (No circle container, no border, no grey radiating heartbeat!)
      ctx.save();
      const tilt = Math.sin(this.clock * 0.65 + node.phaseOffset) * 0.018;
      ctx.rotate(tilt);

      if (isHovered) {
        ctx.shadowColor = 'rgba(245, 158, 11, 0.28)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3 - levitatePhase * 0.4;
      }

      const logoImg = this.logoMap.get(node.id);
      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        const iconSize = r * 1.82;
        ctx.drawImage(logoImg, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
      } else {
        ctx.fillStyle = node.color;
        ctx.font = `800 ${Math.round(r * 0.78)}px "Inter", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name.slice(0, 2).toUpperCase(), 0, 0);
      }
      ctx.restore();

      ctx.restore();
    }

    // 6. Draw Enlarged Central Hive as React Bits Pro "Glyph Orb" (radius = 86)
    drawGlyphOrbHive(ctx, centerX, centerY, 86, this.clock);

    // 7. Draw Right 3D Data Warehouse Cylinders [UNCHANGED]
    for (let i = 0; i < 3; i++) {
      const sy = this.getSinkY(i) + Math.cos(this.clock * 2 + i) * 3;
      const meta = this.sinkMeta[i];
      ctx.save();
      ctx.translate(rightX, sy);

      // 3D Isometric Hexagonal Vault Node
      for (let d = 8; d >= 0; d--) {
        ctx.beginPath();
        ctx.roundRect(-56 + d * 0.7, -28 + d * 0.9, 112, 56, 14);
        ctx.fillStyle = d === 0 ? '#ffffff' : d > 4 ? '#09157a' : '#1129e2';
        ctx.fill();
        if (d === 0) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#1129e2';
          ctx.stroke();
        }
      }

      // Golden honey indicator orb inside vault
      drawViscousHoneyDroplet(ctx, -34, 0, 8, 0);

      ctx.fillStyle = '#1129e2';
      ctx.font = '800 12px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(meta.name, -18, -3);
      ctx.fillStyle = 'rgba(17, 41, 226, 0.65)';
      ctx.font = '600 10px "Inter", monospace';
      ctx.fillText(meta.sub, -18, 12);
      ctx.restore();
    }

    ctx.restore();
  }
}

// ============================================================================
// 2. Section 8: Interactive Bee Mission Dispenser Canvas
// ============================================================================

export class MissionSwarmEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private assets: CabinetAssets;
  private imgs: Map<string, HTMLImageElement> = new Map();
  private selected: Set<string> = new Set(['Shopee', 'TikTok Shop', 'Amazon']);
  private clock = 0;
  private W = 540;
  private H = 360;
  private dpr = 1;
  private bee = { x: 270, y: 180, angle: 0, targetIdx: 0, legProgress: 0, toHive: false };
  private onToggleCallback?: (selected: string[]) => void;

  private nodes = [
    { name: 'Shopee', color: '#ee4d2d', key: 'mugUrl' },
    { name: 'TikTok Shop', color: '#fe2c55', key: 'bookUrl' },
    { name: 'Amazon', color: '#ff9900', key: 'ibookUrl' },
    { name: 'Shopify', color: '#95bf47', key: 'tshirtUrl' },
    { name: 'Lazada', color: '#0f146d', key: 'lazadaUrl' },
    { name: 'Etsy', color: '#f1641e', key: 'etsyUrl' },
  ];

  constructor(
    canvas: HTMLCanvasElement,
    assets: CabinetAssets,
    onToggle?: (selected: string[]) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.assets = assets;
    this.onToggleCallback = onToggle;

    for (const n of this.nodes) {
      const img = new Image();
      img.src = (assets as unknown as Record<string, string>)[n.key];
      this.imgs.set(n.name, img);
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      for (let i = 0; i < this.nodes.length; i++) {
        const pos = this.getNodePos(i);
        if (Math.hypot(mx - pos.x, my - pos.y) < 38) {
          this.togglePlatform(this.nodes[i].name);
          break;
        }
      }
    });

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      this.step(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  public setSelected(list: string[]) {
    this.selected = new Set(list);
  }

  public togglePlatform(name: string) {
    if (this.selected.has(name)) {
      if (this.selected.size > 1) this.selected.delete(name);
    } else {
      this.selected.add(name);
    }
    this.onToggleCallback?.(Array.from(this.selected));
  }

  private resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = this.canvas.clientWidth || 520;
    this.H = this.canvas.clientHeight || 340;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
  }

  private getNodePos(idx: number) {
    const cx = this.W * 0.5;
    const cy = this.H * 0.52;
    const rx = Math.min(this.W * 0.37, 195);
    const ry = Math.min(this.H * 0.35, 118);
    const a = (idx / this.nodes.length) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + Math.cos(a) * rx,
      y: cy + Math.sin(a) * ry,
    };
  }

  private step(dt: number) {
    this.clock += dt;
    const activeIndices = this.nodes
      .map((n, idx) => (this.selected.has(n.name) ? idx : -1))
      .filter((idx) => idx !== -1);

    if (activeIndices.length === 0) return;
    if (!activeIndices.includes(this.bee.targetIdx)) {
      this.bee.targetIdx = activeIndices[0];
    }

    this.bee.legProgress += dt * 0.95;
    if (this.bee.legProgress >= 1) {
      this.bee.legProgress = 0;
      if (this.bee.toHive) {
        this.bee.toHive = false;
        const curPos = activeIndices.indexOf(this.bee.targetIdx);
        this.bee.targetIdx = activeIndices[(curPos + 1) % activeIndices.length];
      } else {
        this.bee.toHive = true;
      }
    }

    const hivePos = { x: this.W * 0.5, y: this.H * 0.52 };
    const nodePos = this.getNodePos(this.bee.targetIdx);
    const from = this.bee.toHive ? nodePos : hivePos;
    const to = this.bee.toHive ? hivePos : nodePos;
    const t = this.bee.legProgress;
    const smooth = t * t * (3 - 2 * t);

    const nx = from.x + (to.x - from.x) * smooth;
    const ny = from.y + (to.y - from.y) * smooth - Math.sin(t * Math.PI) * 24;
    const dx = nx - this.bee.x;
    const dy = ny - this.bee.y;
    if (Math.hypot(dx, dy) > 0.2) {
      this.bee.angle = Math.atan2(dy, dx) + Math.PI / 2;
    }
    this.bee.x = nx;
    this.bee.y = ny;
  }

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, this.W, this.H);

    const cx = this.W * 0.5;
    const cy = this.H * 0.52;

    // 1. Draw Falling Rays pulses from selected platforms into the Central Glyph Orb (No static lines!)
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const pos = this.getNodePos(i);
      const isSel = this.selected.has(n.name);

      if (isSel) {
        const sampleLine = (u: number) => ({
          x: pos.x + (cx - pos.x) * u,
          y: pos.y + (cy - pos.y) * u,
        });
        const ft1 = (this.clock * 0.65 + i * 0.23) % 1.45;
        const ft2 = (this.clock * 0.65 + i * 0.23 + 0.72) % 1.45;
        drawFallingRayPulse(ctx, sampleLine, ft1, 0.32, 1.35, n.color, true);
        drawFallingRayPulse(ctx, sampleLine, ft2, 0.26, 1.05, n.color, false);
      }
    }

    // 2. Draw Central 3D Banded Glyph Orb Hive
    drawGlyphOrbHive(ctx, cx, cy, 56, this.clock);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#1129e2';
    ctx.font = '800 9px "JetBrains Mono", "Inter", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.selected.size} ACTIVE`, 0, 66);
    ctx.restore();

    // 3. Draw 6 Orbiting Frameless 3D Platform Sculptures (Floating without borders)
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const isSel = this.selected.has(n.name);
      const pos = this.getNodePos(i);
      const phase = Math.sin(this.clock * 0.9 + i);
      const bob = phase * 1.6;

      ctx.save();
      ctx.translate(pos.x, pos.y + bob);

      const img = this.imgs.get(n.name);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.rotate(Math.sin(this.clock * 0.7 + i) * 0.018);
        ctx.globalAlpha = isSel ? 1 : 0.48;
        const sz = isSel ? 54 : 42;
        ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }

      ctx.restore();
    }

    // 4. Draw Active Harvester Cyber-Bee
    const targetNode = this.nodes[this.bee.targetIdx];
    drawCyberBeeMini(
      ctx,
      this.assets,
      this.bee.x,
      this.bee.y,
      this.bee.angle,
      0.28,
      this.clock,
      this.bee.toHive ? targetNode.color : null
    );

    ctx.restore();
  }
}
