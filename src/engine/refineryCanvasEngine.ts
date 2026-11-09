import type { CabinetAssets } from '../assets/cabinetSprites';
import {
  B2B_CLUSTER_HUB,
  B2B_ECOSYSTEM_CONFIG,
  type B2BNodeConfig,
  CLUSTER_META,
  PLATFORM_ECOSYSTEM_CONFIG,
  type PlatformNodeConfig,
  buildB2BLogoMap,
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

/**
 * Renders a React Bits Pro style "Falling Ray" light pulse along a fanning curve:
 * - Batched into 3 tapered polyline bands + 1 ambient glow pass + zero-shadowBlur optical tip
 *   (Eliminates per-pulse Gaussian shadowBlur & cuts Canvas 2D stroke calls by 85% for locked 60fps)
 */
function drawFallingRayPulse(
  ctx: CanvasRenderingContext2D,
  sampleFn: (t: number) => { x: number; y: number },
  headT: number,
  trailLength: number,
  rayWidth: number,
  _color1: string,
  isHighlighted: boolean,
  variant: 'gold' | 'blue' = 'gold'
) {
  if (headT <= 0.005) return;
  const clampedHead = Math.min(1, headT);
  const tailT = Math.max(0, clampedHead - trailLength);
  if (clampedHead <= tailT + 0.005) return;

  // Smooth fade as the pulse is absorbed at destination (t > 0.90)
  const absorbFade = headT > 0.9 ? Math.max(0, (1.12 - headT) / 0.22) : 1;
  if (absorbFade <= 0.01) return;

  const steps = 9;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const t = tailT + (clampedHead - tailT) * u;
    pts.push(sampleFn(t));
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Pass 1: Single batched motion-blur ambient bloom along upper 65% of pulse body
  const glowAlpha = (isHighlighted ? 0.13 : 0.075) * absorbFade;
  ctx.beginPath();
  ctx.moveTo(pts[3].x, pts[3].y);
  for (let i = 4; i <= steps; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.strokeStyle =
    variant === 'blue'
      ? `rgba(17, 41, 226, ${glowAlpha.toFixed(3)})`
      : `rgba(245, 158, 11, ${glowAlpha.toFixed(3)})`;
  ctx.lineWidth = rayWidth * 2.1;
  ctx.stroke();

  // Pass 2: 3 Batched Tapered Core Bands (Tail 0..4, Mid 4..7, Head 7..9)
  // Band A: Tail (0..4)
  const tailAlpha = 0.24 * absorbFade;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i <= 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle =
    variant === 'blue'
      ? `rgba(96, 165, 250, ${tailAlpha.toFixed(3)})`
      : isHighlighted
        ? `rgba(245, 158, 11, ${(tailAlpha * 1.15).toFixed(3)})`
        : `rgba(79, 70, 229, ${tailAlpha.toFixed(3)})`;
  ctx.lineWidth = Math.max(0.35, rayWidth * 0.26);
  ctx.stroke();

  // Band B: Mid-streak (4..7)
  const midAlpha = 0.64 * absorbFade;
  ctx.beginPath();
  ctx.moveTo(pts[4].x, pts[4].y);
  for (let i = 5; i <= 7; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle =
    variant === 'blue'
      ? `rgba(17, 41, 226, ${midAlpha.toFixed(3)})`
      : `rgba(245, 158, 11, ${midAlpha.toFixed(3)})`;
  ctx.lineWidth = Math.max(0.45, rayWidth * 0.52);
  ctx.stroke();

  // Band C: Incandescent Pulse Head (7..9)
  const headAlpha = Math.min(1, 0.95 * absorbFade);
  ctx.beginPath();
  ctx.moveTo(pts[7].x, pts[7].y);
  ctx.lineTo(pts[8].x, pts[8].y);
  ctx.lineTo(pts[9].x, pts[9].y);
  ctx.strokeStyle =
    variant === 'blue'
      ? `rgba(224, 242, 254, ${headAlpha.toFixed(3)})`
      : `rgba(254, 249, 195, ${headAlpha.toFixed(3)})`;
  ctx.lineWidth = Math.max(0.55, rayWidth * 0.78);
  ctx.stroke();

  // Pass 3: Delicate optical pulse tip spark (Zero shadowBlur — uses fast layered alpha halo)
  const head = pts[steps];
  const prev = pts[steps - 1] || head;
  const angle = Math.atan2(head.y - prev.y, head.x - prev.x);

  ctx.translate(head.x, head.y);
  ctx.rotate(angle);

  // Soft outer optical bloom ellipse
  ctx.fillStyle =
    variant === 'blue'
      ? `rgba(17, 41, 226, ${(0.28 * absorbFade).toFixed(3)})`
      : `rgba(245, 158, 11, ${(0.32 * absorbFade).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, rayWidth * 2.4, rayWidth * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crisp bright core spark
  ctx.fillStyle =
    variant === 'blue'
      ? `rgba(240, 249, 255, ${(0.95 * absorbFade).toFixed(3)})`
      : `rgba(255, 255, 255, ${(0.92 * absorbFade).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, rayWidth * 1.35, rayWidth * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Exact ASCII density ramp matching React Bits Pro "Glyph Orb" (from sparse punctuation in shadow
 * to dense alphanumeric/symbol clusters on sunlit 3D band crests).
 */
const GLYPH_ORB_ASCII_RAMP =
  " .',-_~:;!^\"+<>/r()|i1l?I[]{}jcvunxzftLCJUYXZO0Qoahkbdpqwm*WMB8&%$#@";

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Precompute 48 discrete RGBA style strings for the Glyph Orb so the inner loop does zero string allocations
const GLYPH_ORB_PALETTE_STEPS = 48;
const GLYPH_ORB_STYLE_LUT: string[] = (() => {
  const lut: string[] = [];
  for (let i = 0; i < GLYPH_ORB_PALETTE_STEPS; i++) {
    const lum = i / (GLYPH_ORB_PALETTE_STEPS - 1);
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
    lut.push(`rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`);
  }
  return lut;
})();

interface OrbCacheEntry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  lastClock: number;
  dpr: number;
  halfSpan: number;
}

const glyphOrbCache = new Map<number, OrbCacheEntry>();

function drawGlyphOrbHive(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  clock: number,
  dpr = 1
) {
  const halfSpan = Math.ceil(radius * 1.22);
  const fullSpan = halfSpan * 2;
  let cache = glyphOrbCache.get(radius);

  if (!cache || cache.dpr !== dpr) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = Math.round(fullSpan * dpr);
    offCanvas.height = Math.round(fullSpan * dpr);
    const offCtx = offCanvas.getContext('2d')!;
    cache = {
      canvas: offCanvas,
      ctx: offCtx,
      lastClock: -999,
      dpr,
      halfSpan,
    };
    glyphOrbCache.set(radius, cache);
  }

  // Update the offscreen ASCII sphere at ~30fps (every 32ms) and blit at 60fps
  if (Math.abs(clock - cache.lastClock) >= 0.032) {
    cache.lastClock = clock;
    const octx = cache.ctx;
    octx.save();
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, cache.canvas.width, cache.canvas.height);
    octx.scale(dpr, dpr);
    octx.translate(halfSpan, halfSpan);

    // 1. Airy Cobalt-Periwinkle & Honey Aura
    const bgRadius = radius * 1.18;
    const coreGrad = octx.createRadialGradient(0, 0, radius * 0.15, 0, 0, bgRadius);
    coreGrad.addColorStop(0, 'rgba(17, 41, 226, 0.10)');
    coreGrad.addColorStop(0.52, 'rgba(59, 130, 246, 0.06)');
    coreGrad.addColorStop(0.82, 'rgba(99, 102, 241, 0.025)');
    coreGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');

    octx.fillStyle = coreGrad;
    octx.beginPath();
    octx.arc(0, 0, bgRadius, 0, Math.PI * 2);
    octx.fill();

    // Subtle warm honey-gold inner glow on the sunlit left-center hemisphere
    const bloomGrad = octx.createRadialGradient(
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
    octx.fillStyle = bloomGrad;
    octx.beginPath();
    octx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
    octx.fill();

    // 2. Raymarched 2D Monospace ASCII Grid Mapped to a 3D Rotating Banded Sphere
    const scale = radius / 92;
    const cellW = 4.65 * scale;
    const cellH = 7.8 * scale;
    const fontSize = 7.6 * scale;
    const cols = Math.floor((radius * 2) / cellW);
    const rows = Math.floor((radius * 2) / cellH);

    const rotY = clock * 0.52;
    const rotX = 0.28 + Math.sin(clock * 0.35) * 0.12;
    const rotZ = -0.18 + Math.cos(clock * 0.28) * 0.08;

    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const cosZ = Math.cos(rotZ);
    const sinZ = Math.sin(rotZ);

    const lx = -0.52;
    const ly = -0.24;
    const lz = 0.82;

    octx.font = `700 ${fontSize.toFixed(2)}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';

    const rampLen = GLYPH_ORB_ASCII_RAMP.length;
    let lastStyleIdx = -1;

    for (let r = 0; r < rows; r++) {
      const py = (r - rows / 2 + 0.5) * cellH;
      const ny = py / radius;

      for (let c = 0; c < cols; c++) {
        const px = (c - cols / 2 + 0.5) * cellW;
        const nx = px / radius;
        const r2 = nx * nx + ny * ny;
        if (r2 > 1.0) continue;

        const nz = Math.sqrt(1.0 - r2);

        const x1 = nx * cosZ - ny * sinZ;
        const y1 = nx * sinZ + ny * cosZ;
        const z1 = nz;

        const x2 = x1;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;

        const sx = x2 * cosY + z2 * sinY;
        const sy = y2;
        const sz = -x2 * sinY + z2 * cosY;

        const domainWarp =
          Math.sin(sx * 3.6 + sz * 3.4 - clock * 0.65) * 0.26 +
          Math.cos(sz * 4.2 - sy * 2.8 + clock * 0.4) * 0.14;
        const bandPhase = (sy + domainWarp) * 14.5 - clock * 0.95;
        const bandWave = 0.5 + 0.5 * Math.sin(bandPhase);
        const bandRidge = bandWave * Math.sqrt(bandWave);

        const ndotl = Math.max(0, nx * lx + ny * ly + nz * lz);
        const horizonFade = Math.sqrt(nz);

        const lum = Math.min(
          1,
          (0.07 + ndotl * (0.2 + 0.88 * bandRidge) + bandRidge * 0.08) * horizonFade
        );

        if (lum < 0.035) continue;

        const cellHash = (r * 19 + c * 37) % 5;
        const baseIdx = Math.floor(lum * (rampLen - 4));
        const charIdx = Math.max(
          1,
          Math.min(rampLen - 1, baseIdx + (lum > 0.14 ? cellHash - 2 : 0))
        );
        const ch = GLYPH_ORB_ASCII_RAMP[charIdx];
        if (ch === ' ') continue;

        const styleIdx = Math.min(
          GLYPH_ORB_PALETTE_STEPS - 1,
          Math.floor(lum * (GLYPH_ORB_PALETTE_STEPS - 1))
        );
        if (styleIdx !== lastStyleIdx) {
          octx.fillStyle = GLYPH_ORB_STYLE_LUT[styleIdx];
          lastStyleIdx = styleIdx;
        }
        octx.fillText(ch, px, py);
      }
    }

    octx.restore();
  }

  ctx.drawImage(
    cache.canvas,
    centerX - halfSpan,
    centerY - halfSpan,
    fullSpan,
    fullSpan
  );
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
  private b2bLogoMap: Map<string, HTMLImageElement>;
  private particles: HoneyParticle[] = [];
  private fanPulses: FanRayPulse[] = [];
  private outParticles: HoneyParticle[] = [];
  private outFanPulses: FanRayPulse[] = [];
  private ingestionEvents: IngestionEvent[] = [];
  private nextIngestionTimer = 0.45;
  private ingestionCursor = 0;
  private clock = 0;
  private W = 1000;
  private H = 520;
  private dpr = 1;
  private hoveredNodeId: string | null = null;
  private hoveredB2BId: string | null = null;
  private beePos = { x: 500, y: 260, vx: 0, vy: 0, angle: 0 };
  private beeTarget = { x: 500, y: 260 };
  private beeColor = '#ee4d2d';

  constructor(canvas: HTMLCanvasElement, assets: CabinetAssets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.assets = assets;
    this.logoMap = buildPlatformLogoMap();
    this.b2bLogoMap = buildB2BLogoMap();

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

    // Spawn 64 high-speed outgoing blue Falling Ray pulses (4 dedicated staggered rays per B2B platform so every top/mid/bottom node is continuously fed)
    const totalB2B = B2B_ECOSYSTEM_CONFIG.length;
    for (let i = 0; i < totalB2B * 4; i++) {
      const lane = i % totalB2B;
      const waveIdx = Math.floor(i / totalB2B); // 0, 1, 2, 3 staggered waves per B2B node
      const b2bCfg = B2B_ECOSYSTEM_CONFIG[lane];
      this.outParticles.push({
        t: (waveIdx * 0.28 + lane * 0.04 + Math.random() * 0.14) % 1.14,
        speed: 0.56 + Math.random() * 0.52, // High-velocity randomized B2B data streaming
        lane,
        size: b2bCfg.tier === 1 ? 1.3 + Math.random() * 0.4 : 0.95 + Math.random() * 0.35,
        color: b2bCfg.color,
        isHex: waveIdx % 2 === 0,
        phase: (Math.random() - 0.5) * 1.1,
      });
    }

    // Spawn 20 right-side ambient harmonic blue fan ray pulses spanning top-to-bottom
    for (let i = 0; i < 20; i++) {
      this.outFanPulses.push({
        t: (i / 20 + Math.random() * 0.22) % 1.14,
        speed: 0.48 + Math.random() * 0.38,
        rayIdx: i % 16,
        trailLen: 0.25 + Math.random() * 0.12,
        width: 0.75 + Math.random() * 0.3,
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
      this.hoveredNodeId = null;

      // Check proximity to visible right-side B2B destination ecosystem nodes
      const visibleB2B = this.getVisibleB2BNodes();
      let hitB2B: string | null = null;
      let minDistB2B = Infinity;
      for (const node of visibleB2B) {
        const pos = this.getB2BNodePosition(node);
        const hitRadius = this.getB2BNodeRadius(node) + 10;
        const d = Math.hypot(mx - pos.x, my - pos.y);
        if (d < hitRadius && d < minDistB2B) {
          minDistB2B = d;
          hitB2B = node.id;
        }
      }
      this.hoveredB2BId = null;
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.hoveredNodeId = null;
      this.hoveredB2BId = null;
    });

    let last = performance.now();
    let rafId = 0;
    let isVisible = true;
    const loop = (now: number) => {
      if (!isVisible || document.hidden) {
        rafId = 0;
        return;
      }
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      this.step(dt);
      this.draw();
      rafId = requestAnimationFrame(loop);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisible = entry.isIntersecting;
        if (isVisible && !rafId) {
          last = performance.now();
          rafId = requestAnimationFrame(loop);
        }
      },
      { threshold: 0.02 }
    );
    observer.observe(this.canvas);

    rafId = requestAnimationFrame(loop);
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
    return this.W * 0.5;
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

  private getVisibleB2BNodes(): B2BNodeConfig[] {
    if (this.W >= 920) {
      return B2B_ECOSYSTEM_CONFIG;
    }
    if (this.W >= 620) {
      return B2B_ECOSYSTEM_CONFIG.filter((p) => p.tier <= 2);
    }
    const mobileIds = new Set([
      'snowflake',
      'databricks',
      'bigquery',
      'postgresql',
      'tableau',
      'powerbi',
      'openai',
      'kafka',
      'sap',
      'netsuite',
    ]);
    return B2B_ECOSYSTEM_CONFIG.filter((p) => mobileIds.has(p.id));
  }

  private getNodeRadius(_node: PlatformNodeConfig): number {
    const scale = this.W < 620 ? 0.82 : this.W < 920 ? 0.92 : 1;
    return 20 * scale * this.getVisualScale();
  }

  private getB2BNodeRadius(_node: B2BNodeConfig): number {
    const scale = this.W < 620 ? 0.82 : this.W < 920 ? 0.92 : 1;
    return 20 * scale * this.getVisualScale();
  }

  private getVisualScale(): number {
    const vs = this.H / 540;
    return Math.max(1, Math.min(1.7, vs));
  }

  private getNodePosition(node: PlatformNodeConfig): { x: number; y: number } {
    const rxScale = this.W < 620 ? 1.08 : 1.05;
    const baseX = this.W * Math.min(0.37, node.rx * rxScale);
    const baseY = this.H * node.ry;
    const floatX = Math.cos(this.clock * 0.62 + node.phaseOffset) * 0.85;
    const floatY = Math.sin(this.clock * 0.85 + node.phaseOffset) * 1.4;
    return { x: baseX + floatX, y: baseY + floatY };
  }

  private getB2BNodePosition(node: B2BNodeConfig): { x: number; y: number } {
    const rxScale = this.W < 620 ? 1.08 : 1.05;
    const distFromRight = 1 - node.rx;
    const baseX = this.W * Math.max(0.63, 1 - distFromRight * rxScale);
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

  private getB2BClusterExitOffset(cluster: B2BNodeConfig['cluster']): number {
    switch (cluster) {
      case 'warehouses':
        return -34;
      case 'bi':
        return -10;
      case 'ai':
        return 12;
      case 'erp':
        return 34;
      default:
        return 0;
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
    const orbRadius = 112 * this.getVisualScale();
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

  private getB2BBezierPoints(
    node: B2BNodeConfig,
    centerX: number,
    centerY: number,
    subOffset = 0
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
    const pos = this.getB2BNodePosition(node);
    const r = this.getB2BNodeRadius(node);
    const hub = B2B_CLUSTER_HUB[node.cluster];
    const hubX = this.W * hub.hubRx;
    const hubY = this.H * hub.hubRy + subOffset * 5;

    // Radiate across the full eastern limb of the central Glyph Orb (mirroring the left-side intake arc)
    const orbRadius = 112 * this.getVisualScale();
    const exitYOffset =
      this.getB2BClusterExitOffset(node.cluster) * 0.65 +
      (pos.y - centerY) * 0.22 +
      subOffset * 6;
    const clampedOffset = Math.max(-orbRadius * 0.82, Math.min(orbRadius * 0.82, exitYOffset));
    const startX =
      centerX + Math.sqrt(Math.max(100, orbRadius * orbRadius - clampedOffset * clampedOffset));
    const startY = centerY + clampedOffset;

    const x1 = pos.x - r * 0.82;
    const y1 = pos.y + subOffset * 3;
    // Exact mirror of left-side Bezier control geometry so upper, middle, and lower B2B nodes receive graceful direct arcs
    const cx1 = startX + (hubX - startX) * 0.46;
    const cy1 = startY + (hubY - startY) * 0.72;
    const cx2 = hubX + (x1 - hubX) * 0.32;
    const cy2 = hubY + (y1 - hubY) * 0.66;

    return { x0: startX, y0: startY, cx1, cy1, cx2, cy2, x1, y1 };
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
    const orbRadius = 112 * this.getVisualScale();
    const offset = (u - 0.5) * orbRadius * 1.35;
    const x1 = centerX - Math.sqrt(Math.max(100, orbRadius * orbRadius - offset * offset));
    const y1 = centerY + offset;

    const cx1 = x0 + (x1 - x0) * 0.42;
    const cy1 = y0;
    const cx2 = x0 + (x1 - x0) * 0.76;
    const cy2 = y1 + (y0 - y1) * 0.18;
    return { x0, y0, cx1, cy1, cx2, cy2, x1, y1 };
  }

  /**
   * Mirror of getHarmonicFanRayBezier on the right side: 16 intermediate blue harmonic fan rays
   * radiating from the eastern limb of the Glyph Orb across the full vertical span (0.06 .. 0.94 H).
   */
  private getRightHarmonicFanRayBezier(
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
    const u = (rayIdx + 0.5) / 16; // 0 .. 1 from top to bottom of the right fan
    const orbRadius = 112 * this.getVisualScale();
    const offset = (u - 0.5) * orbRadius * 1.38;
    const x0 = centerX + Math.sqrt(Math.max(100, orbRadius * orbRadius - offset * offset));
    const y0 = centerY + offset;

    const x1 = this.W * (0.92 - (rayIdx % 3) * 0.07);
    const y1 = this.H * (0.06 + u * 0.88);

    const cx1 = x0 + (x1 - x0) * 0.24;
    const cy1 = y0 + (y1 - y0) * 0.18;
    const cx2 = x0 + (x1 - x0) * 0.58;
    const cy2 = y1;
    return { x0, y0, cx1, cy1, cx2, cy2, x1, y1 };
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
      const b2bCfg = B2B_ECOSYSTEM_CONFIG[p.lane];
      const isHovered = b2bCfg && this.hoveredB2BId === b2bCfg.id;
      const boost = isHovered ? 1.85 : 1;
      const accel = 0.92 + Math.pow(Math.max(0, Math.min(1, p.t)), 1.25) * 1.35;
      p.t += p.speed * boost * accel * dt;
      if (p.t > 1.14) {
        // Keep p.lane assigned to its B2B node so every top/mid/bottom node is continuously fed,
        // while re-randomizing timing, high velocity, and sub-channel offset
        p.t = -Math.random() * 0.12;
        p.speed = 0.56 + Math.random() * 0.52;
        p.phase = (Math.random() - 0.5) * 1.1;
      }
    }

    for (const ofp of this.outFanPulses) {
      ofp.t += ofp.speed * (0.92 + Math.pow(Math.min(1, ofp.t), 1.25) * 1.25) * dt;
      if (ofp.t > 1.14) {
        ofp.t = -Math.random() * 0.1;
        ofp.speed = 0.48 + Math.random() * 0.38;
      }
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

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, this.W, this.H);

    const centerX = this.getCenterX();
    const centerY = this.H * 0.5;
    const visiblePlatforms = this.getVisiblePlatforms();
    const visibleIds = new Set(visiblePlatforms.map((p) => p.id));
    const visibleB2BNodes = this.getVisibleB2BNodes();
    const visibleB2BIds = new Set(visibleB2BNodes.map((p) => p.id));

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

    // 2A. Draw Right-Side Harmonic Blue Fan Rays (spanning top-to-bottom of the right hemisphere)
    for (const ofp of this.outFanPulses) {
      if (ofp.t <= 0) continue;
      const bz = this.getRightHarmonicFanRayBezier(ofp.rayIdx, centerX, centerY);
      const sampleFn = (tVal: number) =>
        this.evalBezier(tVal, bz.x0, bz.y0, bz.cx1, bz.cy1, bz.cx2, bz.cy2, bz.x1, bz.y1);
      drawFallingRayPulse(ctx, sampleFn, ofp.t, ofp.trailLen, ofp.width, '#1129e2', false, 'blue');
    }

    // 2B. Draw Outgoing High-Speed Blue "Falling Rays" Stream into all 16 B2B & Enterprise Ecosystem Nodes
    for (const p of this.outParticles) {
      if (p.t <= 0) continue;
      const b2bNode = B2B_ECOSYSTEM_CONFIG[p.lane];
      if (!b2bNode || !visibleB2BIds.has(b2bNode.id)) continue;

      const bz = this.getB2BBezierPoints(b2bNode, centerX, centerY, p.phase);
      const isHovered = this.hoveredB2BId === b2bNode.id;
      const sampleOutCurve = (tVal: number) =>
        this.evalBezier(tVal, bz.x0, bz.y0, bz.cx1, bz.cy1, bz.cx2, bz.cy2, bz.x1, bz.y1);

      const trailLen = p.isHex || isHovered ? 0.36 : 0.28;
      drawFallingRayPulse(
        ctx,
        sampleOutCurve,
        p.t,
        trailLen,
        isHovered ? p.size * 1.25 : p.size,
        '#1129e2',
        p.isHex || isHovered,
        'blue'
      );
    }

    // 3. Draw Left-Side Multi-Platform Ecosystem Nodes (Frameless / Borderless Levitating Logos, No Text Labels)
    for (const node of visiblePlatforms) {
      const pos = this.getNodePosition(node);
      const r = this.getNodeRadius(node);

      ctx.save();
      ctx.translate(pos.x, pos.y);

      // Pure Floating Brand Vector Logo (No circle container, no border, no shadowBlur!)
      ctx.save();
      const tilt = Math.sin(this.clock * 0.65 + node.phaseOffset) * 0.018;
      ctx.rotate(tilt);

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

    // 4. Draw Enlarged Central Hive as React Bits Pro "Glyph Orb" (radius = 112)
    drawGlyphOrbHive(ctx, centerX, centerY, 112 * this.getVisualScale(), this.clock, this.dpr);

    // 5. Draw Right-Side 16-Node B2B & Enterprise Ecosystem (Symmetrical Frameless / Borderless Levitating Logos)
    for (const node of visibleB2BNodes) {
      const pos = this.getB2BNodePosition(node);
      const r = this.getB2BNodeRadius(node);

      ctx.save();
      ctx.translate(pos.x, pos.y);

      ctx.save();
      const tilt = Math.sin(this.clock * 0.65 + node.phaseOffset) * 0.018;
      ctx.rotate(tilt);

      const logoImg = this.b2bLogoMap.get(node.id);
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

    ctx.restore();
  }
}

// ============================================================================
// 2. Section 4 Left Visual: Authentic ReactBits Pro WebGL "Contour Tide"
//    2-Pass GPU Ocean: Pass 1 Depth-Occlusion Surface + Pass 2 380,000 Point
//    Particles, 14 Gerstner Wave Octaves, Fresnel + Specular Sun Glint,
//    Interactive 3D Raycast Swell & Concentric Click Ripples.
// ============================================================================

export type ContourTidePresetName = 'silver' | 'ocean' | 'aqua' | 'violet' | 'ember' | 'paper';

export const CONTOUR_TIDE_PRESETS: Record<
  ContourTidePresetName,
  { colors: [string, string]; background: string }
> = {
  ocean: { colors: ['#60A5FA', '#1129E2'], background: 'transparent' },
  paper: { colors: ['#7DA2F8', '#1129E2'], background: 'transparent' },
  aqua: { colors: ['#38BDF8', '#0369A1'], background: 'transparent' },
  violet: { colors: ['#A78BFA', '#4338CA'], background: 'transparent' },
  silver: { colors: ['#94A3B8', '#1E293B'], background: 'transparent' },
  ember: { colors: ['#FBBF24', '#B45309'], background: 'transparent' },
};

const CONTOUR_TIDE_COMMON_GLSL = `
precision highp float;
#define WAVES 14
#define MAX_RIPPLES 4

uniform float uTime;
uniform float uNear;
uniform float uFar;
uniform float uSpread;
uniform float uSpreadBase;
uniform vec4 uWave[WAVES];
uniform vec4 uWaveMotion[WAVES];
uniform float uHeight;
uniform vec4 uCursor;
uniform float uCursorRadius;
uniform vec4 uRipple[MAX_RIPPLES];
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

float gridDepth(float v) {
  float inverse = 1.0 / uFar + (1.0 / uNear - 1.0 / uFar) * pow(clamp(1.0 - v, 0.0, 1.0), 1.8);
  return 1.0 / inverse;
}

vec3 surfacePoint(vec2 ground, out vec3 normal, out float fold, out float swell) {
  vec3 offset = vec3(0.0);
  normal = vec3(0.0, 1.0, 0.0);
  fold = 1.0;
  float calm = mix(0.3, 1.0, smoothstep(uNear * 0.9, uNear * 4.0, -ground.y));
  for (int i = 0; i < WAVES; i++) {
    vec4 wave = uWave[i];
    vec4 motion = uWaveMotion[i];
    float phase = wave.z * dot(wave.xy, ground) - motion.x * uTime + motion.y;
    float s = sin(phase);
    float c = cos(phase);
    float amplitude = wave.w * uHeight * calm;
    float steep = motion.z;
    offset.x += steep * amplitude * wave.x * c;
    offset.z += steep * amplitude * wave.y * c;
    offset.y += amplitude * s;
    float ka = wave.z * amplitude;
    normal.x -= wave.x * ka * c;
    normal.z -= wave.y * ka * c;
    normal.y -= steep * ka * s;
    fold -= steep * ka * s;
  }
  vec2 toCursor = ground - uCursor.xy;
  float radius2 = max(uCursorRadius * uCursorRadius, 1e-4);
  swell = uCursor.z * exp(-dot(toCursor, toCursor) / radius2);
  offset.y += swell;
  normal.x += swell * 2.0 * toCursor.x / radius2;
  normal.z += swell * 2.0 * toCursor.y / radius2;
  for (int k = 0; k < MAX_RIPPLES; k++) {
    vec4 ripple = uRipple[k];
    if (ripple.w <= 0.001) continue;
    vec2 away = ground - ripple.xy;
    float r = max(length(away), 1e-4);
    float band = r - ripple.z;
    float envelope = exp(-band * band * 3.0) * ripple.w * 0.26;
    offset.y += sin(band * 9.0) * envelope;
    float slope = (9.0 * cos(band * 9.0) - 6.0 * band * sin(band * 9.0)) * envelope;
    normal.x -= slope * away.x / r;
    normal.z -= slope * away.y / r;
  }
  return vec3(ground.x + offset.x, offset.y, ground.y + offset.z);
}
`;

const OCCLUSION_VERT_GLSL = `
${CONTOUR_TIDE_COMMON_GLSL}
attribute vec2 aGrid;
void main() {
  float depth = gridDepth(aGrid.y);
  float halfWidth = uSpreadBase + depth * uSpread;
  vec2 ground = vec2(aGrid.x * halfWidth * 1.03, -depth);
  vec3 normal;
  float fold;
  float swell;
  vec3 world = surfacePoint(ground, normal, fold, swell);
  world.y -= 0.035 + depth * 0.004;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const OCCLUSION_FRAG_GLSL = `
precision highp float;
void main() {
  gl_FragColor = vec4(0.0);
}
`;

const PARTICLES_VERT_GLSL = `
${CONTOUR_TIDE_COMMON_GLSL}
attribute vec2 aGrid;
attribute vec2 aJitter;
uniform vec3 cameraPosition;
uniform float uRows;
uniform float uColumns;
uniform vec3 uSun;
uniform float uFogDistance;
uniform float uFoam;
uniform float uSize;
uniform float uFocal;
uniform float uPixelRatio;
uniform float uGlow;
varying float vBright;
varying float vTone;

void main() {
  float depth = gridDepth(aGrid.y + aJitter.y / uRows);
  float halfWidth = uSpreadBase + depth * uSpread;
  vec2 ground = vec2((aGrid.x + aJitter.x / uColumns) * halfWidth, -depth);
  float side = 1.0 - smoothstep(0.9, 1.0, abs(aGrid.x));
  vec3 normal;
  float fold;
  float swell;
  vec3 world = surfacePoint(ground, normal, fold, swell);
  vec3 offset = vec3(world.x - ground.x, world.y, world.z - ground.y);
  vec4 view = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * view;
  vec3 n = normalize(normal);
  vec3 toEye = normalize(cameraPosition - world);
  float lit = max(dot(n, uSun), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(n, toEye), 0.0), 5.0);
  float glint = pow(max(dot(reflect(-uSun, n), toEye), 0.0), 40.0) * (0.04 + 3.6 * fresnel);
  float crest = smoothstep(0.25, 1.0, offset.y / max(uHeight * 0.5, 0.01));
  float froth = smoothstep(0.7, 0.2, fold) * uFoam;
  float near = smoothstep(uNear * 0.95, uNear * 1.2, depth) * side;
  float distant = smoothstep(uNear * 1.1, uNear * 5.0, depth);
  float far = exp(-depth / max(uFogDistance, 0.5)) * smoothstep(uFar, uFar * 0.9, depth);
  float edgeOn = clamp(abs(dot(n, toEye)) / 0.35, 0.06, 1.0);
  float pileUp = mix(edgeOn, 1.0, smoothstep(uNear * 3.0, uNear * 14.0, depth));
  float brightness = (0.24 + 0.05 * lit + 0.9 * fresnel * distant + (glint * 2.6 + 2.4 * crest * crest * crest + froth * 2.6) * mix(0.3, 1.0, distant)) * pileUp * near * far;
  vTone = clamp(glint * 0.9 + crest * 0.6 + froth, 0.0, 1.0);
  float pixels = uSize * uFocal / max(-view.z, 0.05) * (1.0 + crest * 0.35) * uPixelRatio;
  float coverage = min(pixels, 1.0);
  vBright = brightness * coverage;
  gl_PointSize = clamp(pixels, 1.0, 6.0 * uPixelRatio) * (1.0 + uGlow * 1.6);
}
`;

const PARTICLES_FRAG_GLSL = `
precision highp float;
uniform vec3 uTrough;
uniform vec3 uCrest;
uniform float uGlow;
uniform float uInk;
uniform float uIntensity;
varying float vBright;
varying float vTone;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float edge = 1.0 / (1.0 + uGlow * 1.6);
  float core = 1.0 - smoothstep(edge * 0.45, edge, r);
  float halo = exp(-r * r * 7.0) * uGlow * 0.28;
  float amount = (core + halo) * vBright * uIntensity;
  if (amount < 0.002) discard;
  vec3 color = mix(uTrough, uCrest, vTone);
  if (uInk > 0.5) {
    float alpha = clamp(amount * 1.6, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    float alpha = clamp(amount, 0.0, 1.0);
    gl_FragColor = vec4(color * amount, alpha);
  }
}
`;

function clampVal(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function mulberry32(seed: number): () => number {
  let t = (0x9e3779b9 ^ Math.floor(9973 * seed)) >>> 0;
  return () => {
    let e = (t = (t + 0x6d2b79f5) >>> 0);
    e = Math.imul(e ^ (e >>> 15), 1 | e);
    return (((e ^= e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ (e >>> 14)) >>> 0) / 0x100000000;
  };
}

function parseHexRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const clean = hex.trim().replace(/^#/, '');
  if (clean.length >= 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return [r / 255, g / 255, b / 255];
    }
  }
  return fallback;
}

export class ContourTideEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private W = 560;
  private H = 380;
  private dpr = 1.5;

  // Exact ReactBits Pro Contour Tide parameters tuned for light background & blue waves
  private settings = {
    preset: 'ocean' as ContourTidePresetName,
    colors: ['#60A5FA', '#1129E2'] as [string, string],
    backgroundColor: 'transparent',
    density: 1.15,
    particleSize: 1.15,
    waveHeight: 1.05,
    choppiness: 0.88,
    wavelength: 1.0,
    windAngle: 0,
    horizon: 0.1,
    fog: 0.95,
    glow: 0.42,
    foam: 1.25,
    speed: 1.0,
    interactive: true,
    parallax: 1.0,
    swell: 1.1,
    swellRadius: 0.95,
    clickRipples: true,
    seed: 0,
  };

  // Simulation state matching ReactBits Pro chunk 6393
  private sim = {
    time: 30,
    lookX: 0,
    lookY: 0,
    cursorX: 0,
    cursorZ: -8,
    cursorLift: 0,
    seeded: false,
    presses: 0,
    ripples: Array.from({ length: 4 }, () => ({ x: 0, z: 0, age: 99 })),
    next: 0,
  };

  private pointer = {
    x: 0.5,
    y: 0.5,
    inside: false,
    presses: 0,
    pressX: 0.5,
    pressY: 0.5,
  };

  private selected: Set<string> = new Set([
    'Shopee',
    'TikTok Shop',
    'Amazon',
    'Shopify',
    'Lazada',
    'Etsy',
  ]);
  private onToggleCallback?: (selected: string[]) => void;

  // WebGL resources
  private occProgram: WebGLProgram | null = null;
  private ptsProgram: WebGLProgram | null = null;
  private occGridBuffer: WebGLBuffer | null = null;
  private occIndexBuffer: WebGLBuffer | null = null;
  private occIndexCount = 0;
  private ptsGridBuffer: WebGLBuffer | null = null;
  private ptsJitterBuffer: WebGLBuffer | null = null;
  private ptsCount = 0;
  private cols = 1000;
  private rows = 380;

  // Precomputed uniform arrays
  private uWaveData = new Float32Array(14 * 4);
  private uWaveMotionData = new Float32Array(14 * 4);
  private uRippleData = new Float32Array(4 * 4);
  private projMatrix = new Float32Array(16);
  private viewMatrix = new Float32Array(16);
  private camPos = new Float32Array([0, 1.35, 0]);
  private sunDir = new Float32Array(3);
  private troughRgb: [number, number, number] = [0.376, 0.647, 0.98];
  private crestRgb: [number, number, number] = [0.067, 0.161, 0.886];
  private bgRgb: [number, number, number] = [0.95, 0.965, 1.0];
  private isBgTransparent = true;
  private uInk = 1;

  constructor(
    canvas: HTMLCanvasElement,
    _assets?: CabinetAssets,
    onToggle?: (selected: string[]) => void
  ) {
    this.canvas = canvas;
    this.onToggleCallback = onToggle;

    // Normalize sun vector (.06, .07, -1)
    const sx = 0.06,
      sy = 0.07,
      sz = -1.0;
    const sLen = Math.hypot(sx, sy, sz);
    this.sunDir[0] = sx / sLen;
    this.sunDir[1] = sy / sLen;
    this.sunDir[2] = sz / sLen;

    this.initWebGL();
    this.setPreset('ocean');
    this.rebuildWaves();
    this.resize();

    window.addEventListener('resize', () => this.resize());

    const updatePointer = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = (e.clientX - rect.left) / Math.max(rect.width, 1);
      this.pointer.y = 1 - (e.clientY - rect.top) / Math.max(rect.height, 1);
      this.pointer.inside = true;
    };

    this.canvas.addEventListener(
      'pointermove',
      (e) => {
        updatePointer(e);
      },
      { passive: true }
    );

    this.canvas.addEventListener(
      'pointerdown',
      (e) => {
        updatePointer(e);
        this.pointer.pressX = this.pointer.x;
        this.pointer.pressY = this.pointer.y;
        this.pointer.presses += 1;
      },
      { passive: true }
    );

    const onLeave = (e: PointerEvent) => {
      if (e.type !== 'pointerup' || e.pointerType !== 'mouse') {
        this.pointer.inside = false;
      }
    };
    this.canvas.addEventListener('pointerleave', onLeave, { passive: true });
    this.canvas.addEventListener('pointercancel', onLeave, { passive: true });
    this.canvas.addEventListener('pointerup', onLeave, { passive: true });

    let last = performance.now();
    let rafId = 0;
    let isVisible = true;
    const loop = (now: number) => {
      if (!isVisible || document.hidden) {
        rafId = 0;
        return;
      }
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
      last = now;
      this.stepAndRender(dt);
      rafId = requestAnimationFrame(loop);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisible = entry.isIntersecting;
        if (isVisible && !rafId) {
          last = performance.now();
          rafId = requestAnimationFrame(loop);
        }
      },
      { rootMargin: '80px', threshold: 0.01 }
    );
    observer.observe(this.canvas);

    rafId = requestAnimationFrame(loop);
  }

  public setPreset(preset: ContourTidePresetName) {
    const cfg = CONTOUR_TIDE_PRESETS[preset] || CONTOUR_TIDE_PRESETS.ocean;
    this.settings.preset = preset;
    this.settings.colors = [cfg.colors[0], cfg.colors[1]];
    this.settings.backgroundColor = cfg.background;
    this.updateColors();
  }

  private updateColors() {
    this.troughRgb = parseHexRgb(this.settings.colors[0], [0.376, 0.647, 0.98]);
    this.crestRgb = parseHexRgb(this.settings.colors[1], [0.067, 0.161, 0.886]);
    const bgStr = this.settings.backgroundColor.trim().toLowerCase();
    this.isBgTransparent = bgStr === 'transparent';
    if (this.isBgTransparent) {
      this.bgRgb = [0, 0, 0];
      // Light page background -> use ink particle blending so blue waves stand out crisply
      this.uInk = 1;
    } else {
      this.bgRgb = parseHexRgb(this.settings.backgroundColor, [0.95, 0.965, 1.0]);
      const lum = 0.2126 * this.bgRgb[0] + 0.7152 * this.bgRgb[1] + 0.0722 * this.bgRgb[2];
      this.uInk = lum > 0.35 ? 1 : 0;
    }
  }

  private rebuildWaves() {
    const rng = mulberry32(this.settings.seed + 1.7);
    const windRad = degToRad(this.settings.windAngle);
    const wl = clampVal(this.settings.wavelength, 0.2, 5);
    const maxLen = 11 * wl;
    const minLen = 0.4 * wl;
    const chop = clampVal(this.settings.choppiness, 0, 1.5);
    let ampSum = 0;
    const amps: number[] = [];

    for (let e = 0; e < 14; e++) {
      const o = e / 13;
      const len = maxLen * Math.pow(minLen / maxLen, o) * (0.85 + 0.3 * rng());
      const dir = windRad + (rng() - 0.5) * degToRad(150) * (0.45 + 0.55 * o);
      const k = (2 * Math.PI) / len;
      const amp = 0.012 * Math.pow(len, 1.2) * (0.7 + 0.6 * rng());
      amps.push(amp);
      ampSum += amp;

      const idx = e * 4;
      this.uWaveData[idx] = Math.sin(dir);
      this.uWaveData[idx + 1] = Math.cos(dir);
      this.uWaveData[idx + 2] = k;
      this.uWaveData[idx + 3] = amp;

      this.uWaveMotionData[idx] = 0.55 * Math.sqrt(9.8 * k);
      this.uWaveMotionData[idx + 1] = rng() * Math.PI * 2;
      this.uWaveMotionData[idx + 2] = 0;
      this.uWaveMotionData[idx + 3] = 0;
    }

    for (let e = 0; e < 14; e++) {
      const idx = e * 4;
      const normAmp = 0.8 * (amps[e] / Math.max(ampSum, 1e-5));
      this.uWaveData[idx + 3] = normAmp;
      const k = this.uWaveData[idx + 2];
      this.uWaveMotionData[idx + 2] = Math.min(
        (0.9 * chop) / Math.max(k * normAmp * 14, 1e-4),
        4
      );
    }
  }

  private compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createProgram(
    gl: WebGLRenderingContext,
    vsSource: string,
    fsSource: string
  ): WebGLProgram | null {
    const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  private initWebGL() {
    const gl = (this.canvas.getContext('webgl2', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    }) ||
      this.canvas.getContext('webgl', {
        antialias: false,
        alpha: true,
        premultipliedAlpha: true,
        powerPreference: 'high-performance',
      })) as WebGLRenderingContext | null;

    if (!gl) return;
    this.gl = gl;

    this.occProgram = this.createProgram(gl, OCCLUSION_VERT_GLSL, OCCLUSION_FRAG_GLSL);
    this.ptsProgram = this.createProgram(gl, PARTICLES_VERT_GLSL, PARTICLES_FRAG_GLSL);

    // 1. Build Pass 1 Depth-Occlusion Mesh Geometry (200 x 150 grid = 30,000 vertices)
    const occGrid = new Float32Array(200 * 150 * 2);
    for (let r = 0; r < 150; r++) {
      for (let c = 0; c < 200; c++) {
        const idx = r * 200 + c;
        occGrid[2 * idx] = (c / 199) * 2 - 1;
        occGrid[2 * idx + 1] = r / 149;
      }
    }
    const occIndices = new Uint16Array(149 * 199 * 6);
    let ptr = 0;
    for (let r = 0; r < 149; r++) {
      for (let c = 0; c < 199; c++) {
        const a = r * 200 + c;
        const o = a + 1;
        const l = a + 200;
        const n = l + 1;
        occIndices[ptr++] = a;
        occIndices[ptr++] = l;
        occIndices[ptr++] = o;
        occIndices[ptr++] = o;
        occIndices[ptr++] = l;
        occIndices[ptr++] = n;
      }
    }
    this.occIndexCount = occIndices.length;

    this.occGridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.occGridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, occGrid, gl.STATIC_DRAW);

    this.occIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.occIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, occIndices, gl.STATIC_DRAW);

    // 2. Build Pass 2 380,000-Particle Point Geometry (1000 cols x 380 rows)
    const density = clampVal(this.settings.density, 0.3, 2);
    this.cols = Math.round(1000 * density);
    this.rows = Math.round(380 * density);
    this.ptsCount = this.cols * this.rows;

    const ptsGrid = new Float32Array(2 * this.ptsCount);
    const ptsJitter = new Float32Array(2 * this.ptsCount);
    const rng = mulberry32(this.settings.seed + 0.5);

    for (let a = 0; a < this.rows; a++) {
      for (let r = 0; r < this.cols; r++) {
        const n = a * this.cols + r;
        ptsGrid[2 * n] = (r / (this.cols - 1)) * 2 - 1;
        ptsGrid[2 * n + 1] = 1 - a / (this.rows - 1);
        ptsJitter[2 * n] = (rng() - 0.5) * 0.7;
        ptsJitter[2 * n + 1] = (rng() - 0.5) * 0.7;
      }
    }

    this.ptsGridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ptsGridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, ptsGrid, gl.STATIC_DRAW);

    this.ptsJitterBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ptsJitterBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, ptsJitter, gl.STATIC_DRAW);
  }

  public triggerRipple(u = 0.5, v = 0.5, _strength = 1.0) {
    // Spawn a 3D world-space ripple across the water plane
    const rp = this.sim.ripples[this.sim.next];
    rp.x = (u - 0.5) * 8.0;
    rp.z = -3.0 - v * 10.0;
    rp.age = 0;
    this.sim.next = (this.sim.next + 1) % 4;
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
    this.triggerRipple(0.28 + Math.random() * 0.44, 0.25 + Math.random() * 0.45, 1.0);
    this.onToggleCallback?.(Array.from(this.selected));
  }

  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.65);
    this.W = this.canvas.clientWidth || 560;
    this.H = this.canvas.clientHeight || 380;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
  }

  private setCommonUniforms(gl: WebGLRenderingContext, prog: WebGLProgram, uNear: number, uSpread: number, uSpreadBase: number) {
    gl.uniform1f(gl.getUniformLocation(prog, 'uTime'), this.sim.time);
    gl.uniform1f(gl.getUniformLocation(prog, 'uNear'), uNear);
    gl.uniform1f(gl.getUniformLocation(prog, 'uFar'), 36.0);
    gl.uniform1f(gl.getUniformLocation(prog, 'uSpread'), uSpread);
    gl.uniform1f(gl.getUniformLocation(prog, 'uSpreadBase'), uSpreadBase);
    gl.uniform4fv(gl.getUniformLocation(prog, 'uWave[0]'), this.uWaveData);
    gl.uniform4fv(gl.getUniformLocation(prog, 'uWaveMotion[0]'), this.uWaveMotionData);
    gl.uniform1f(
      gl.getUniformLocation(prog, 'uHeight'),
      clampVal(this.settings.waveHeight, 0, 3)
    );
    gl.uniform4f(
      gl.getUniformLocation(prog, 'uCursor'),
      this.sim.cursorX,
      this.sim.cursorZ,
      this.sim.cursorLift * clampVal(this.settings.swell, 0, 3) * 0.14,
      0
    );
    gl.uniform1f(
      gl.getUniformLocation(prog, 'uCursorRadius'),
      clampVal(this.settings.swellRadius, 0.1, 5)
    );
    gl.uniform4fv(gl.getUniformLocation(prog, 'uRipple[0]'), this.uRippleData);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'projectionMatrix'), false, this.projMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'viewMatrix'), false, this.viewMatrix);
  }

  private stepAndRender(dt: number) {
    const gl = this.gl;
    if (!gl || !this.occProgram || !this.ptsProgram) return;

    this.sim.time += dt * clampVal(this.settings.speed, 0, 4);

    const aspect = this.W / Math.max(this.H, 1);
    const tanHalfFov = Math.tan(degToRad(50) / 2);
    const g = Math.atan((1 - 2 * clampVal(this.settings.horizon, 0.02, 0.45)) * tanHalfFov);

    const isInside = this.settings.interactive && this.pointer.inside;
    const targetLookX = isInside ? (this.pointer.x - 0.5) * 2 : 0;
    const targetLookY = isInside ? (this.pointer.y - 0.5) * 2 : 0;
    const damp = 1 - Math.exp(-2.2 * dt);
    this.sim.lookX += (targetLookX - this.sim.lookX) * damp;
    this.sim.lookY += (targetLookY - this.sim.lookY) * damp;

    const parallax = clampVal(this.settings.parallax, 0, 3);

    // Camera position & Euler('YXZ') rotation matching Three.js chunk 6393
    const px = 0.12 * this.sim.lookX * parallax;
    const py = 1.35 + 0.04 * Math.sin(0.35 * this.sim.time);
    const pz = 0;
    this.camPos[0] = px;
    this.camPos[1] = py;
    this.camPos[2] = pz;

    const rx = -g + 0.025 * this.sim.lookY * parallax;
    const ry = -0.045 * this.sim.lookX * parallax;
    const rz = 0.006 * Math.sin(0.27 * this.sim.time);

    const ca = Math.cos(rx),
      sb = Math.sin(rx);
    const cc = Math.cos(ry),
      sd = Math.sin(ry);
    const ce = Math.cos(rz),
      sf = Math.sin(rz);
    const cce = cc * ce,
      ccf = cc * sf,
      sde = sd * ce,
      sdf = sd * sf;

    // Orthonormal basis vectors X, Y, Z of camera in world space (Euler YXZ)
    const X0 = cce + sdf * sb,
      X1 = ca * sf,
      X2 = ccf * sb - sde;
    const Y0 = sde * sb - ccf,
      Y1 = ca * ce,
      Y2 = sdf + cce * sb;
    const Z0 = ca * sd,
      Z1 = -sb,
      Z2 = ca * cc;

    // View matrix = [R^T | -R^T * camPos] in column-major order
    this.viewMatrix[0] = X0;
    this.viewMatrix[1] = Y0;
    this.viewMatrix[2] = Z0;
    this.viewMatrix[3] = 0;
    this.viewMatrix[4] = X1;
    this.viewMatrix[5] = Y1;
    this.viewMatrix[6] = Z1;
    this.viewMatrix[7] = 0;
    this.viewMatrix[8] = X2;
    this.viewMatrix[9] = Y2;
    this.viewMatrix[10] = Z2;
    this.viewMatrix[11] = 0;
    this.viewMatrix[12] = -(X0 * px + X1 * py + X2 * pz);
    this.viewMatrix[13] = -(Y0 * px + Y1 * py + Y2 * pz);
    this.viewMatrix[14] = -(Z0 * px + Z1 * py + Z2 * pz);
    this.viewMatrix[15] = 1;

    // Perspective projection matrix (fov = 50, near = 0.05, far = 200)
    const f = 1.0 / tanHalfFov;
    const near = 0.05,
      far = 200.0;
    this.projMatrix.fill(0);
    this.projMatrix[0] = f / aspect;
    this.projMatrix[5] = f;
    this.projMatrix[10] = (far + near) / (near - far);
    this.projMatrix[11] = -1;
    this.projMatrix[14] = (2 * far * near) / (near - far);

    // Raycast pointer onto water plane y = 0
    const raycastPlaneY0 = (normX: number, normY: number): { x: number; z: number } | null => {
      const ndcX = 2 * normX - 1;
      const ndcY = 2 * normY - 1;
      const camX = ndcX * aspect * tanHalfFov;
      const camY = ndcY * tanHalfFov;
      const dirX = X0 * camX + Y0 * camY - Z0;
      const dirY = X1 * camX + Y1 * camY - Z1;
      const dirZ = X2 * camX + Y2 * camY - Z2;
      if (dirY >= -1e-5) return null;
      const tHit = -py / dirY;
      if (tHit <= 0) return null;
      return {
        x: px + tHit * dirX,
        z: pz + tHit * dirZ,
      };
    };

    let targetLift = 0;
    if (isInside) {
      const hit = raycastPlaneY0(this.pointer.x, this.pointer.y);
      if (hit && hit.z < -0.5 && hit.z > -21.6) {
        if (!this.sim.seeded) {
          this.sim.cursorX = hit.x;
          this.sim.cursorZ = hit.z;
          this.sim.seeded = true;
        }
        const follow = 1 - Math.exp(-5 * dt);
        this.sim.cursorX += (hit.x - this.sim.cursorX) * follow;
        this.sim.cursorZ += (hit.z - this.sim.cursorZ) * follow;
        targetLift = 1;
      }
    }

    this.sim.cursorLift +=
      (targetLift - this.sim.cursorLift) *
      (1 - Math.exp(-dt * (targetLift > this.sim.cursorLift ? 3 : 1.6)));
    if (this.sim.cursorLift < 0.002 && !targetLift) {
      this.sim.seeded = false;
    }

    // Handle click ripples
    if (this.pointer.presses !== this.sim.presses) {
      const count = Math.min(this.pointer.presses - this.sim.presses, 4);
      this.sim.presses = this.pointer.presses;
      if (this.settings.clickRipples) {
        const hit = raycastPlaneY0(this.pointer.pressX, this.pointer.pressY);
        if (hit && hit.z < -0.5) {
          for (let a = 0; a < count; a++) {
            const rp = this.sim.ripples[this.sim.next];
            rp.x = hit.x;
            rp.z = hit.z;
            rp.age = 0;
            this.sim.next = (this.sim.next + 1) % 4;
          }
        }
      }
    }

    for (let e = 0; e < 4; e++) {
      const rp = this.sim.ripples[e];
      if (rp.age < 6) rp.age += dt;
      const amp = rp.age < 6 ? Math.exp(-0.75 * rp.age) : 0;
      const idx = e * 4;
      this.uRippleData[idx] = rp.x;
      this.uRippleData[idx + 1] = rp.z;
      this.uRippleData[idx + 2] = 2.2 * rp.age;
      this.uRippleData[idx + 3] = amp;
    }

    const uNear = (1.35 / Math.tan(g + degToRad(50) / 2 + 0.025 * parallax + 0.03)) * 0.8;
    const L = aspect * tanHalfFov * 1.2;
    const uSpread = Math.cos(g) * L + Math.tan(0.06 * parallax);
    const uSpreadBase = 1.35 * Math.sin(g) * L + 0.14 * parallax + 0.35;

    // Render Pass Setup
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    if (this.isBgTransparent) {
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.clearColor(this.bgRgb[0], this.bgRgb[1], this.bgRgb[2], 1.0);
    }
    gl.depthMask(true);
    gl.colorMask(true, true, true, true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // PASS 1: Depth-Occlusion Surface Mesh (writes depth only so foreground waves occlude hidden troughs)
    gl.useProgram(this.occProgram);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    gl.colorMask(false, false, false, false);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);

    this.setCommonUniforms(gl, this.occProgram, uNear, uSpread, uSpreadBase);

    const occGridLoc = gl.getAttribLocation(this.occProgram, 'aGrid');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.occGridBuffer);
    gl.enableVertexAttribArray(occGridLoc);
    gl.vertexAttribPointer(occGridLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.occIndexBuffer);
    gl.drawElements(gl.TRIANGLES, this.occIndexCount, gl.UNSIGNED_SHORT, 0);

    // PASS 2: 380,000 Luminous Ocean Particles
    gl.useProgram(this.ptsProgram);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.colorMask(true, true, true, true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    if (this.uInk > 0.5) {
      gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    } else {
      gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    this.setCommonUniforms(gl, this.ptsProgram, uNear, uSpread, uSpreadBase);

    gl.uniform3fv(gl.getUniformLocation(this.ptsProgram, 'cameraPosition'), this.camPos);
    gl.uniform1f(gl.getUniformLocation(this.ptsProgram, 'uRows'), this.rows);
    gl.uniform1f(gl.getUniformLocation(this.ptsProgram, 'uColumns'), this.cols);
    gl.uniform3fv(gl.getUniformLocation(this.ptsProgram, 'uSun'), this.sunDir);
    gl.uniform1f(
      gl.getUniformLocation(this.ptsProgram, 'uFogDistance'),
      140 / clampVal(this.settings.fog, 0.1, 4)
    );
    gl.uniform1f(
      gl.getUniformLocation(this.ptsProgram, 'uFoam'),
      clampVal(this.settings.foam, 0, 3)
    );
    gl.uniform1f(
      gl.getUniformLocation(this.ptsProgram, 'uSize'),
      0.0028 * clampVal(this.settings.particleSize, 0.2, 4)
    );
    gl.uniform1f(
      gl.getUniformLocation(this.ptsProgram, 'uFocal'),
      this.H / 2 / tanHalfFov
    );
    gl.uniform1f(gl.getUniformLocation(this.ptsProgram, 'uPixelRatio'), this.dpr);
    gl.uniform1f(
      gl.getUniformLocation(this.ptsProgram, 'uGlow'),
      clampVal(this.settings.glow, 0, 2)
    );
    gl.uniform3f(
      gl.getUniformLocation(this.ptsProgram, 'uTrough'),
      this.troughRgb[0],
      this.troughRgb[1],
      this.troughRgb[2]
    );
    gl.uniform3f(
      gl.getUniformLocation(this.ptsProgram, 'uCrest'),
      this.crestRgb[0],
      this.crestRgb[1],
      this.crestRgb[2]
    );
    gl.uniform1f(gl.getUniformLocation(this.ptsProgram, 'uInk'), this.uInk);
    gl.uniform1f(gl.getUniformLocation(this.ptsProgram, 'uIntensity'), this.uInk > 0.5 ? 1.35 : 1.0);

    const ptsGridLoc = gl.getAttribLocation(this.ptsProgram, 'aGrid');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ptsGridBuffer);
    gl.enableVertexAttribArray(ptsGridLoc);
    gl.vertexAttribPointer(ptsGridLoc, 2, gl.FLOAT, false, 0, 0);

    const ptsJitterLoc = gl.getAttribLocation(this.ptsProgram, 'aJitter');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ptsJitterBuffer);
    gl.enableVertexAttribArray(ptsJitterLoc);
    gl.vertexAttribPointer(ptsJitterLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, this.ptsCount);

    gl.depthMask(true);
  }
}

export { ContourTideEngine as MissionSwarmEngine };

// ============================================================================
// SECTION 3 ENGINE: Interactive 3D Data Assurance & SLA Shield Canvas
// Visual-first, minimal text, frameless 60fps interactive stage matching Sec 1 & 2
// ============================================================================

interface AssuranceStageNode {
  id: string;
  metric: string;
  sub: string;
  badge: string;
  accent: string;
  imgKey: keyof CabinetAssets;
  hoverBoost: number;
}

interface ShieldSpark {
  angle: number;
  dist: number;
  speed: number;
  impactPhase: number; // 0 = flying in, >0 = ripple on shield
  impactAngle: number;
}

export class AssuranceVaultEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private assets: CabinetAssets;
  private dpr = 1;
  private W = 1100;
  private H = 390;
  private clock = 0;
  private hoveredIdx = -1;
  private imgs: Map<string, HTMLImageElement> = new Map();

  private stages: AssuranceStageNode[] = [
    {
      id: 'define-scope',
      metric: '1. Define Scope',
      sub: 'Platforms · SKUs · Cadence',
      badge: 'STEP 01 · DAY 1',
      accent: '#1129e2',
      imgKey: 'ibookUrl',
      hoverBoost: 0,
    },
    {
      id: 'free-sample',
      metric: '2. Free Sample',
      sub: 'Verify Schema & Quality',
      badge: 'STEP 02 · < 24 HOURS',
      accent: '#059669',
      imgKey: 'modAiUrl',
      hoverBoost: 0,
    },
    {
      id: 'connect-stack',
      metric: '3. Connect Stack',
      sub: 'Snowflake · BigQuery · API',
      badge: 'STEP 03 · TURNKEY',
      accent: '#d97706',
      imgKey: 'modApiUrl',
      hoverBoost: 0,
    },
    {
      id: 'guaranteed-sync',
      metric: '4. Guaranteed Sync',
      sub: '99.98% SLA · 0 Maintenance',
      badge: 'STEP 04 · 24/7 LIVE',
      accent: '#2563eb',
      imgKey: 'modSyncUrl',
      hoverBoost: 0,
    },
  ];

  private sparks: ShieldSpark[] = [];
  private bee = {
    x: 200,
    y: 160,
    vx: 0,
    vy: 0,
    angle: Math.PI / 2,
    patrolIdx: 0,
    patrolTimer: 0,
  };

  constructor(canvas: HTMLCanvasElement, assets: CabinetAssets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.assets = assets;

    // Preload 3D sculptures for the 4 stages
    for (const st of this.stages) {
      const img = new Image();
      img.src = String(assets[st.imgKey] || '');
      this.imgs.set(st.id, img);
    }

    // Initialize shield deflection sparks for Stage 1
    for (let i = 0; i < 6; i++) {
      this.sparks.push({
        angle: -Math.PI * 0.85 + (i / 5) * Math.PI * 1.3,
        dist: 76 + (i * 19) % 45,
        speed: 34 + (i % 3) * 12,
        impactPhase: 0,
        impactAngle: 0,
      });
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let found = -1;
      for (let i = 0; i < this.stages.length; i++) {
        const pos = this.getStagePos(i);
        if (Math.hypot(mx - pos.x, my - pos.y) < 88) {
          found = i;
          break;
        }
      }
      this.hoveredIdx = found;
      this.canvas.style.cursor = found !== -1 ? 'pointer' : 'default';
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.hoveredIdx = -1;
      this.canvas.style.cursor = 'default';
    });

    let last = performance.now();
    let rafId = 0;
    let isVisible = false;
    const loop = (now: number) => {
      if (!isVisible || document.hidden) {
        rafId = 0;
        return;
      }
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      this.step(dt);
      this.draw();
      rafId = requestAnimationFrame(loop);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisible = entry.isIntersecting;
        if (isVisible && !rafId) {
          last = performance.now();
          rafId = requestAnimationFrame(loop);
        }
      },
      { threshold: 0.02 }
    );
    observer.observe(this.canvas);
  }

  private resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = this.canvas.clientWidth || 1100;
    this.H = this.canvas.clientHeight || 390;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
  }

  private getStagePos(idx: number): { x: number; y: number } {
    if (this.W < 680) {
      // 2x2 grid on compact screens
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      return {
        x: this.W * (col === 0 ? 0.28 : 0.72),
        y: this.H * (row === 0 ? 0.28 : 0.72),
      };
    }
    const padX = Math.max(115, this.W * 0.13);
    const usableW = this.W - padX * 2;
    const x = padX + (idx / (this.stages.length - 1)) * usableW;
    const archY = Math.sin((idx / (this.stages.length - 1)) * Math.PI) * -14;
    return {
      x,
      y: this.H * 0.45 + archY,
    };
  }

  private step(dt: number) {
    this.clock += dt;

    for (let i = 0; i < this.stages.length; i++) {
      const target = this.hoveredIdx === i ? 1 : 0;
      this.stages[i].hoverBoost += (target - this.stages[i].hoverBoost) * Math.min(1, dt * 8);
    }

    // Step Stage 1 shield deflection sparks
    const shieldRadius = 66;
    for (const sp of this.sparks) {
      if (sp.impactPhase > 0) {
        sp.impactPhase += dt * 2.4;
        if (sp.impactPhase >= 1) {
          sp.impactPhase = 0;
          sp.dist = 108 + Math.random() * 28;
          sp.angle = -Math.PI * 0.9 + Math.random() * Math.PI * 1.8;
        }
      } else {
        sp.dist -= sp.speed * dt * (1 + this.stages[0].hoverBoost * 0.6);
        if (sp.dist <= shieldRadius) {
          sp.dist = shieldRadius;
          sp.impactPhase = 0.01;
          sp.impactAngle = sp.angle;
        }
      }
    }

    // Step Cyber-Bee Inspector drone
    this.bee.patrolTimer += dt;
    if (this.hoveredIdx !== -1) {
      this.bee.patrolIdx = this.hoveredIdx;
    } else if (this.bee.patrolTimer > 2.3) {
      this.bee.patrolTimer = 0;
      this.bee.patrolIdx = (this.bee.patrolIdx + 1) % this.stages.length;
    }

    const targetPos = this.getStagePos(this.bee.patrolIdx);
    const orbitAngle = this.clock * 2.1;
    const tx = targetPos.x + Math.cos(orbitAngle) * 52;
    const ty = targetPos.y - 54 + Math.sin(orbitAngle * 2) * 10;

    const dx = tx - this.bee.x;
    const dy = ty - this.bee.y;
    this.bee.vx += dx * dt * 6.5;
    this.bee.vy += dy * dt * 6.5;
    this.bee.vx *= Math.pow(0.12, dt);
    this.bee.vy *= Math.pow(0.12, dt);
    this.bee.x += this.bee.vx * dt * 3.2;
    this.bee.y += this.bee.vy * dt * 3.2;

    if (Math.hypot(this.bee.vx, this.bee.vy) > 1.5) {
      const targetAngle = Math.atan2(this.bee.vy, this.bee.vx) + Math.PI / 2;
      let diff = targetAngle - this.bee.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.bee.angle += diff * Math.min(1, dt * 10);
    }
  }

  private drawHexPolygon(ctx: CanvasRenderingContext2D, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, this.W, this.H);

    // 1. Draw Animated Falling-Ray Bridges connecting Stage 0 -> 1 -> 2 -> 3
    for (let i = 0; i < this.stages.length - 1; i++) {
      const p1 = this.getStagePos(i);
      const p2 = this.getStagePos(i + 1);
      const midX = (p1.x + p2.x) * 0.5;
      const midY = Math.min(p1.y, p2.y) - 34;

      const sampleArc = (u: number) => {
        const inv = 1 - u;
        return {
          x: inv * inv * p1.x + 2 * inv * u * midX + u * u * p2.x,
          y: inv * inv * p1.y + 2 * inv * u * midY + u * u * p2.y,
        };
      };

      const speed = 0.72;
      const ft1 = (this.clock * speed + i * 0.31) % 1.45;
      const ft2 = (this.clock * speed + i * 0.31 + 0.72) % 1.45;
      const rayColor = i === 1 ? '#d97706' : '#1129e2';
      drawFallingRayPulse(ctx, sampleArc, ft1, 0.38, 1.5, rayColor, true);
      drawFallingRayPulse(ctx, sampleArc, ft2, 0.3, 1.15, '#3b82f6', false);
    }

    // 2. Draw Each of the 4 Visual Assurance Stages
    for (let i = 0; i < this.stages.length; i++) {
      const st = this.stages[i];
      const pos = this.getStagePos(i);
      const boost = st.hoverBoost;
      const bob = Math.sin(this.clock * 1.7 + i * 1.2) * 3.5;

      ctx.save();
      ctx.translate(pos.x, pos.y + bob);

      // Soft ambient radial aura behind sculpture
      const auraR = 76 + boost * 14;
      const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, auraR);
      aura.addColorStop(0, i === 2 ? 'rgba(245, 158, 11, 0.16)' : 'rgba(17, 41, 226, 0.14)');
      aura.addColorStop(0.65, 'rgba(59, 130, 246, 0.04)');
      aura.addColorStop(1, 'rgba(17, 41, 226, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, auraR, 0, Math.PI * 2);
      ctx.fill();

      // Stage-specific visual mechanics (before 3D sculpture)
      if (i === 0) {
        // STAGE 1: 99.98% SLA Force-Field Hex Shield + 28 Uptime Segments + Spark Deflection
        ctx.save();
        ctx.rotate(this.clock * (0.28 + boost * 0.35));
        ctx.strokeStyle = `rgba(17, 41, 226, ${0.28 + boost * 0.25})`;
        ctx.lineWidth = 1.6;
        this.drawHexPolygon(ctx, 64);
        ctx.stroke();

        ctx.rotate(-this.clock * 0.56);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.lineWidth = 1.1;
        this.drawHexPolygon(ctx, 52);
        ctx.stroke();
        ctx.restore();

        // 28-segment circular SLA uptime ring
        const segs = 28;
        const ringR = 74 + boost * 4;
        for (let s = 0; s < segs; s++) {
          const a0 = (s / segs) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((s + 0.68) / segs) * Math.PI * 2 - Math.PI / 2;
          const isPulse = Math.floor((this.clock * 14) % segs) === s;
          ctx.beginPath();
          ctx.arc(0, 0, ringR, a0, a1);
          ctx.strokeStyle = isPulse
            ? '#f59e0b'
            : s % 7 === 0
              ? '#059669'
              : 'rgba(17, 41, 226, 0.45)';
          ctx.lineWidth = isPulse ? 4.2 : 2.8;
          ctx.stroke();
        }

        // Incoming upstream sparks deflected harmlessly at the shield perimeter
        for (const sp of this.sparks) {
          if (sp.impactPhase > 0) {
            const ix = Math.cos(sp.impactAngle) * 66;
            const iy = Math.sin(sp.impactAngle) * 66;
            const ripR = 4 + sp.impactPhase * 18;
            ctx.beginPath();
            ctx.arc(ix, iy, ripR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(16, 185, 129, ${(1 - sp.impactPhase) * 0.85})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            const sx = Math.cos(sp.angle) * sp.dist;
            const sy = Math.sin(sp.angle) * sp.dist;
            ctx.beginPath();
            ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
            ctx.fillStyle = '#f97316';
            ctx.fill();
          }
        }
      } else if (i === 1) {
        // STAGE 2: 100% Verified Schema Laser Gate + Orbiting Check Nodes
        const ringR = 66 + boost * 4;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(5, 150, 105, 0.24)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Orbiting verified check badges
        const tags = ['✓ SKU', '✓ FX', '✓ BRAND'];
        for (let t = 0; t < tags.length; t++) {
          const a = this.clock * (0.65 + boost * 0.4) + (t * Math.PI * 2) / tags.length;
          const tx = Math.cos(a) * ringR;
          const ty = Math.sin(a) * ringR;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(tx - 24, ty - 9, 48, 18, 9);
          ctx.fill();
          ctx.strokeStyle = 'rgba(5, 150, 105, 0.45)';
          ctx.lineWidth = 1.1;
          ctx.stroke();

          ctx.fillStyle = '#059669';
          ctx.font = '800 8.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tags[t], tx, ty + 0.5);
        }
      } else if (i === 2) {
        // STAGE 3: 36-Mo Vault Concentric 3D Isometric Time Rings & Golden Memory Orbs
        const rings = [
          { rx: 72, ry: 26, rot: 0.25, color: 'rgba(217, 119, 6, 0.42)' },
          { rx: 64, ry: 24, rot: -0.32, color: 'rgba(17, 41, 226, 0.36)' },
          { rx: 78, ry: 22, rot: 0.04, color: 'rgba(245, 158, 11, 0.52)' },
        ];
        for (let r = 0; r < rings.length; r++) {
          const rg = rings[r];
          ctx.save();
          ctx.rotate(rg.rot + Math.sin(this.clock * 0.7 + r) * 0.08);
          ctx.beginPath();
          ctx.ellipse(0, 0, rg.rx + boost * 5, rg.ry + boost * 2, 0, 0, Math.PI * 2);
          ctx.strokeStyle = rg.color;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // Golden memory orb travelling on the time ring
          const oa = this.clock * (1.2 + r * 0.35) + r * 2.1;
          const ox = Math.cos(oa) * (rg.rx + boost * 5);
          const oy = Math.sin(oa) * (rg.ry + boost * 2);
          ctx.beginPath();
          ctx.arc(ox, oy, 4.2, 0, Math.PI * 2);
          ctx.fillStyle = r === 1 ? '#1129e2' : '#f59e0b';
          ctx.fill();
          ctx.restore();
        }
      } else if (i === 3) {
        // STAGE 4: Turnkey Sync — 4 Orbiting Frameless B2B Destination Logos around Nectar Torus
        const b2bTargets = ['Snowflake', 'Google BigQuery', 'Databricks', 'Microsoft Power BI'];
        const orbitR = 70 + boost * 5;
        ctx.beginPath();
        ctx.arc(0, 0, orbitR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(17, 41, 226, 0.16)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        for (let b = 0; b < b2bTargets.length; b++) {
          const a = this.clock * (0.55 + boost * 0.35) + (b * Math.PI) / 2;
          const bx = Math.cos(a) * orbitR;
          const by = Math.sin(a) * orbitR;

          // Mini radial pulse line from center to B2B icon
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 32, Math.sin(a) * 32);
          ctx.lineTo(bx * 0.82, by * 0.82);
          ctx.strokeStyle = 'rgba(37, 99, 235, 0.32)';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          drawB2BBrandIcon(ctx, b2bTargets[b], bx, by, 21);
        }
      }

      // Draw Central 3D Extruded Sculpture for this Stage
      const img = this.imgs.get(st.id);
      if (img && img.complete && img.naturalWidth > 0) {
        const sz = 78 + boost * 10;
        ctx.save();
        ctx.rotate(Math.sin(this.clock * 1.1 + i) * 0.035);
        ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }

      // Stage 2 Foreground Laser Scan Line sweeping over the 3D sculpture
      if (i === 1) {
        const scanY = Math.sin(this.clock * 2.8) * 38;
        const grad = ctx.createLinearGradient(-48, scanY, 48, scanY);
        grad.addColorStop(0, 'rgba(16, 185, 129, 0)');
        grad.addColorStop(0.2, 'rgba(16, 185, 129, 0.85)');
        grad.addColorStop(0.5, '#1129e2');
        grad.addColorStop(0.8, 'rgba(16, 185, 129, 0.85)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-48, scanY);
        ctx.lineTo(48, scanY);
        ctx.stroke();
      }

      // Floating Top Pill Badge (Always subtly visible, brightens on hover)
      ctx.save();
      const pillY = -92 - boost * 4;
      ctx.globalAlpha = 0.78 + boost * 0.22;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      ctx.roundRect(-64, pillY - 11, 128, 22, 11);
      ctx.fill();
      ctx.strokeStyle = boost > 0.2 ? st.accent : 'rgba(17, 41, 226, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = st.accent;
      ctx.font = '800 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(st.badge, 0, pillY);
      ctx.restore();

      // Minimal Visual Metric + 2-Word Label Below Sculpture
      ctx.fillStyle = '#1129e2';
      ctx.font = '800 18px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.metric, 0, 104);

      ctx.fillStyle = 'rgba(17, 41, 226, 0.68)';
      ctx.font = '600 11.5px "Inter", system-ui, sans-serif';
      ctx.fillText(st.sub, 0, 122);

      ctx.restore();
    }

    // 3. Draw Patrolling Cyber-Bee Quality Inspector Drone
    drawCyberBeeMini(
      ctx,
      this.assets,
      this.bee.x,
      this.bee.y,
      this.bee.angle,
      0.27,
      this.clock,
      '#f59e0b'
    );

    ctx.restore();
  }
}

// ============================================================================
// 4. Authentic ReactBits Pro "Rising Ink" 3D Spring-Physics Typography Engine
//    Ported verbatim from pro.reactbits.dev chunk 81024 (240Hz spring solver,
//    24-step oklch 3D extrusion gradient, pointer perspective + click pop +
//    scroll-triggered intro wave)
// ============================================================================

interface RisingLetterItem {
  node: HTMLElement;
  body: HTMLElement;
  face: HTMLElement;
  x: number;
  y: number;
  h: number;
  v: number;
}

export interface RisingInkOptions {
  color?: string;
  colors?: [string, string];
  extrusion?: 'solid' | 'stack';
  plates?: number;
  lift?: number;
  radius?: number;
  view?: 'pointer' | 'fixed';
  perspective?: number;
  angle?: number;
  stiffness?: number;
  damping?: number;
  pop?: number;
  shadow?: number;
  intro?: boolean;
  area?: 'parent' | 'self';
}

const STACK_OFFSETS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.71, 0.71],
  [-0.71, 0.71],
  [0.71, -0.71],
  [-0.71, -0.71],
];

export class RisingInkEngine {
  private root: HTMLElement;
  private inner: HTMLElement;
  private letters: RisingLetterItem[] = [];
  private opts: Required<RisingInkOptions>;
  private palette: string[] = [];

  private fontSize = 16;
  private ptrX = 0;
  private ptrY = 0;
  private isInside = false;
  private introStart = -1;
  private waveDir = 1;
  private isInView = false;
  private autoWaveTimer = 0;
  private rafId = 0;
  private lastTime = 0;
  private isRunning = false;

  constructor(root: HTMLElement, options: RisingInkOptions = {}) {
    this.root = root;
    this.opts = {
      color: options.color ?? '#0a1236',
      colors: options.colors ?? ['#93C5FD', '#1129E2'],
      extrusion: options.extrusion ?? 'solid',
      plates: options.plates ?? 7,
      lift: options.lift ?? 0.52,
      radius: options.radius ?? 1.45,
      view: options.view ?? 'pointer',
      perspective: options.perspective ?? 1.35,
      angle: options.angle ?? 35,
      stiffness: options.stiffness ?? 1.0,
      damping: options.damping ?? 0.5,
      pop: options.pop ?? 1.0,
      shadow: options.shadow ?? 0.6,
      intro: options.intro ?? true,
      area: options.area ?? 'parent',
    };

    const near = this.opts.colors[0];
    const far = this.opts.colors[1];
    this.palette = Array.from({ length: 24 }, (_, idx) => {
      const r = Math.round((idx / 23) * 100);
      return `color-mix(in oklch, ${near} ${100 - r}%, ${far})`;
    });

    this.inner = this.buildDOM();
    this.measure();

    const targetEl =
      this.opts.area === 'parent' ? (this.root.parentElement ?? this.root) : this.root;

    targetEl.addEventListener(
      'pointermove',
      (e: PointerEvent) => {
        if (e.pointerType !== 'touch') {
          this.isInside = true;
          this.introStart = -1;
          this.updatePointer(e.clientX, e.clientY);
          this.wake();
        }
      },
      { passive: true }
    );

    targetEl.addEventListener(
      'pointerleave',
      () => {
        this.isInside = false;
        this.scheduleNextAutoWave(2200);
        this.wake();
      },
      { passive: true }
    );

    targetEl.addEventListener(
      'pointerdown',
      (e: PointerEvent) => {
        this.updatePointer(e.clientX, e.clientY);
        this.triggerPop(e.clientX, e.clientY);
      },
      { passive: true }
    );

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.measure());
      ro.observe(this.inner);
    }

    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          this.isInView = entry.isIntersecting;
          if (this.isInView) {
            if (this.opts.intro) {
              this.scheduleNextAutoWave(300);
            }
          } else if (this.autoWaveTimer) {
            window.clearTimeout(this.autoWaveTimer);
            this.autoWaveTimer = 0;
          }
        },
        { threshold: 0.15 }
      );
      io.observe(this.root);
    }
  }

  private scheduleNextAutoWave(delayMs = 2400) {
    if (this.autoWaveTimer) {
      window.clearTimeout(this.autoWaveTimer);
      this.autoWaveTimer = 0;
    }
    if (!this.isInView || !this.opts.intro) return;
    this.autoWaveTimer = window.setTimeout(() => {
      this.autoWaveTimer = 0;
      if (this.isInView && !this.isInside && !document.hidden) {
        this.wave();
      }
      this.scheduleNextAutoWave(2500);
    }, delayMs);
  }

  private buildDOM(): HTMLElement {
    const rawText = (this.root.textContent || '').trim().replace(/\s+/g, ' ');
    this.root.textContent = '';
    this.root.style.position = 'relative';
    this.root.style.display = 'inline-block';

    // Accessible screen-reader span
    const srSpan = document.createElement('span');
    Object.assign(srSpan.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    srSpan.textContent = rawText;
    this.root.appendChild(srSpan);

    // Visual container
    const inner = document.createElement('span');
    inner.setAttribute('aria-hidden', 'true');
    Object.assign(inner.style, {
      position: 'relative',
      display: 'inline-block',
      isolation: 'isolate',
      color: this.opts.color,
    });

    const tokens = rawText.split(/(\s+)/).filter((t) => t.length > 0);
    for (const token of tokens) {
      if (/^\s+$/.test(token)) {
        const spaceSpan = document.createElement('span');
        spaceSpan.style.whiteSpace = 'pre-wrap';
        spaceSpan.textContent = token;
        inner.appendChild(spaceSpan);
      } else {
        const wordSpan = document.createElement('span');
        wordSpan.style.display = 'inline-block';
        wordSpan.style.whiteSpace = 'nowrap';

        const chars = Array.from(token);
        for (const ch of chars) {
          const letterSpan = document.createElement('span');
          letterSpan.setAttribute('data-rising-letter', '');
          letterSpan.style.position = 'relative';
          letterSpan.style.display = 'inline-block';

          const bodySpan = document.createElement('span');
          bodySpan.setAttribute('data-rising-body', '');
          Object.assign(bodySpan.style, {
            position: 'absolute',
            inset: '0',
            color: 'transparent',
            pointerEvents: 'none',
            userSelect: 'none',
            webkitUserSelect: 'none',
            willChange: 'transform',
          });
          bodySpan.textContent = ch;

          const faceSpan = document.createElement('span');
          faceSpan.setAttribute('data-rising-face', '');
          Object.assign(faceSpan.style, {
            position: 'relative',
            display: 'inline-block',
            willChange: 'transform',
          });
          faceSpan.textContent = ch;

          letterSpan.appendChild(bodySpan);
          letterSpan.appendChild(faceSpan);
          wordSpan.appendChild(letterSpan);

          this.letters.push({
            node: letterSpan,
            body: bodySpan,
            face: faceSpan,
            x: 0,
            y: 0,
            h: 0,
            v: 0,
          });
        }
        inner.appendChild(wordSpan);
      }
    }

    this.root.appendChild(inner);
    return inner;
  }

  private measure() {
    this.fontSize = Number.parseFloat(getComputedStyle(this.inner).fontSize) || 16;
    const w = this.inner.offsetWidth;
    const h = this.inner.offsetHeight;
    for (const l of this.letters) {
      l.x = l.node.offsetLeft + l.node.offsetWidth / 2 - w / 2;
      l.y = l.node.offsetTop + l.node.offsetHeight / 2 - h / 2;
    }
  }

  private updatePointer(clientX: number, clientY: number) {
    const rect = this.inner.getBoundingClientRect();
    this.ptrX = clientX - (rect.left + rect.width / 2);
    this.ptrY = clientY - (rect.top + rect.height / 2);
  }

  public wave() {
    this.measure();
    this.introStart = performance.now();
    this.waveDir = this.waveDir === 1 ? -1 : 1;
    this.wake();
  }

  public triggerPop(clientX?: number, clientY?: number) {
    const popStrength = clampVal(this.opts.pop, 0, 4);
    if (popStrength <= 0) return;
    const rect = this.inner.getBoundingClientRect();
    const lx = (clientX ?? rect.left + rect.width / 2) - (rect.left + rect.width / 2);
    const ly = (clientY ?? rect.top + rect.height / 2) - (rect.top + rect.height / 2);
    const rad = Math.max(this.opts.radius, 0.1) * this.fontSize * 1.3;
    for (const l of this.letters) {
      const dist = Math.hypot(l.x - lx, l.y - ly) / rad;
      l.v += popStrength * this.fontSize * 9 * Math.exp(-dist * dist);
    }
    this.wake();
  }

  private wake() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame((now) => this.tick(now));
    }
  }

  private stepPhysics(dt: number, now: number): boolean {
    const maxLift = Math.max(this.opts.lift, 0) * this.fontSize;
    const rad = Math.max(this.opts.radius, 0.1) * this.fontSize;
    const omega = 2 * Math.PI * 2.4 * clampVal(this.opts.stiffness, 0.1, 5);
    const damp = clampVal(this.opts.damping, 0.05, 2);
    let active = this.isInside;
    let isAutoWave = false;

    if (this.introStart >= 0) {
      const progress = (now - this.introStart) / 1650;
      if (progress >= 1) {
        this.introStart = -1;
      } else if (!this.isInside) {
        const span = this.inner.offsetWidth / 2 + 1.4 * rad;
        const smooth = progress * progress * (3 - 2 * progress);
        this.ptrX = (-span + smooth * span * 2) * this.waveDir;
        this.ptrY = Math.sin(progress * Math.PI * 2) * (this.inner.offsetHeight * 0.28);
        active = true;
        isAutoWave = true;
      }
    }

    let moving = false;
    for (const l of this.letters) {
      const dyScale = isAutoWave ? 0.55 : 1.0;
      const dist = Math.hypot(l.x - this.ptrX, (l.y - this.ptrY) * dyScale) / rad;
      const targetH = active ? maxLift * Math.exp(-dist * dist) : 0;
      const acc = omega * omega * (targetH - l.h) - 2 * damp * omega * l.v;
      l.v += acc * dt;
      l.h += l.v * dt;
      if (Math.abs(l.v) > 0.5 || Math.abs(targetH - l.h) > 0.05) {
        moving = true;
      }
    }
    return moving || this.introStart >= 0;
  }

  private renderLetters() {
    const maxLift = Math.max(this.opts.lift, 0) * this.fontSize;
    const s = 4.5 * this.fontSize;
    const angleRad = (this.opts.angle * Math.PI) / 180;
    const shadowStrength = clampVal(this.opts.shadow, 0, 1);
    const near = this.opts.colors[0];
    const far = this.opts.colors[1];

    for (const l of this.letters) {
      const v = Math.max(l.h, 0);
      if (v < 0.05) {
        l.body.style.transform = '';
        l.body.style.textShadow = '';
        l.body.style.zIndex = '';
        l.face.style.transform = '';
        l.face.style.zIndex = '';
        continue;
      }

      const g = s / Math.max(s - Math.min(v, 1.6 * maxLift), 0.35 * s);
      let tx = 0,
        ty = 0,
        fx = 0,
        fy = 0,
        scale = 1;

      if (this.opts.view === 'fixed') {
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);
        const a = v * clampVal(this.opts.perspective, 0, 4) * 0.75;
        scale = 1 + (g - 1) * 0.35;
        tx = -cosA * a * 0.18;
        ty = -sinA * a * 0.18;
        fx = cosA * a;
        fy = sinA * a;
      } else {
        const n = (g - 1) * clampVal(this.opts.perspective, 0, 4);
        scale = g;
        tx = (l.x - this.ptrX) * n;
        ty = (l.y - this.ptrY) * n - 0.18 * v;
        fx = -tx;
        fy = -ty;
      }

      const extLen = Math.hypot(fx, fy);
      const shadows: string[] = [];

      if (this.opts.extrusion === 'stack') {
        const maxPlates = Math.round(clampVal(this.opts.plates, 1, 16));
        const invScale = 1 / scale;
        const pct = Math.round(100 * clampVal((extLen - 1.5) / 5, 0, 1));
        const outlineCol =
          pct >= 100 ? near : `color-mix(in srgb, ${near} ${pct}%, transparent)`;
        const plateCount = Math.max(1, Math.min(maxPlates, Math.round(extLen / 2.5)));
        if (pct > 0) {
          for (let e = 1; e <= plateCount; e++) {
            const frac = e / plateCount;
            const ox = (fx * frac) / scale;
            const oy = (fy * frac) / scale;
            shadows.push(`${ox.toFixed(2)}px ${oy.toFixed(2)}px 0 ${far}`);
            for (const [dx, dy] of STACK_OFFSETS) {
              shadows.push(
                `${(ox + dx * invScale).toFixed(2)}px ${(oy + dy * invScale).toFixed(2)}px 0 ${outlineCol}`
              );
            }
          }
        }
      } else {
        const steps = Math.min(56, Math.ceil(extLen / 0.7));
        for (let t = 1; t <= steps; t++) {
          const frac = t / steps;
          const col =
            this.palette[Math.min(this.palette.length - 1, Math.round(frac * (this.palette.length - 1)))];
          shadows.push(`${((fx * frac) / scale).toFixed(2)}px ${((fy * frac) / scale).toFixed(2)}px 0 ${col}`);
        }
      }

      if (shadowStrength > 0) {
        const normV = v / Math.max(maxLift, 1);
        shadows.push(
          `${(fx / scale).toFixed(2)}px ${(fy / scale + 0.04 * this.fontSize).toFixed(2)}px ${(0.12 * this.fontSize * normV).toFixed(2)}px rgba(10, 24, 90, ${(0.38 * shadowStrength * clampVal(normV, 0, 1)).toFixed(3)})`
        );
      }

      const tf = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      const zOrder = Math.round(4 * v);
      l.body.style.transform = tf;
      l.body.style.textShadow = shadows.join(', ');
      l.body.style.zIndex = String(1 + zOrder);
      l.face.style.transform = tf;
      l.face.style.zIndex = String(2000 + zOrder);
    }
  }

  private tick(now: number) {
    const dt = Math.min(Math.max((now - this.lastTime) / 1000, 0), 0.05);
    this.lastTime = now;
    const subSteps = Math.max(1, Math.ceil(dt / (1 / 240)));
    let stillMoving = false;
    for (let i = 0; i < subSteps; i++) {
      stillMoving = this.stepPhysics(dt / subSteps, now) || stillMoving;
    }
    this.renderLetters();

    if (stillMoving) {
      this.rafId = requestAnimationFrame((t) => this.tick(t));
    } else {
      this.isRunning = false;
      if (!this.isInside) {
        for (const l of this.letters) {
          l.h = 0;
          l.v = 0;
        }
        this.renderLetters();
      }
    }
  }
}

// ============================================================================
// 5. REACTBITS SPECULAR BUTTON ENGINE (WebGL2 Rounded-Box Rim & Pool Light)
// Ported from https://reactbits.dev/components/specular-button?lineColor=3541a3
// ============================================================================

const SB_PAD = 24;
const SB_TAU = Math.PI * 2;

const SB_VERTEX_GLSL = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const SB_FRAGMENT_GLSL = `#version 300 es
precision highp float;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uRadius;
uniform float uPx;
uniform float uSpot;
uniform vec2 uEntry;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform vec2 uWindow;
uniform float uThickness;
uniform float uGlow;
out vec4 outColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float loopPosition(vec2 p, vec2 b, float r) {
  vec2 inner = b - r;
  float arc = 1.5707963 * r;
  float quarter = inner.x + inner.y + arc;
  vec2 a = abs(p);
  vec2 q = a - inner;
  float s = q.x > 0.0 && q.y > 0.0
    ? inner.y + atan(q.y, q.x) * r
    : (q.x > q.y ? min(a.y, inner.y) : inner.y + arc + inner.x - min(a.x, inner.x));
  if (p.x < 0.0) s = p.y >= 0.0 ? 2.0 * quarter - s : 2.0 * quarter + s;
  else if (p.y < 0.0) s = 4.0 * quarter - s;
  return s / max(4.0 * quarter, 0.0001);
}

float lobe(float position, float center) {
  float gap = abs(fract(position - center + 0.5) - 0.5);
  return 1.0 - smoothstep(uWindow.x, uWindow.x + uWindow.y, gap);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = roundedBox(p, uHalf, uRadius);
  float position = loopPosition(p, uHalf, uRadius);
  float key = lobe(position, uSpot);
  float back = lobe(position, uSpot + 0.5);
  float streak = key + back * 0.45;
  float width = max(uThickness * uPx * mix(1.0, max(key, back), 0.6), 0.35);
  float band = smoothstep(-width - 0.6, -width + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float hair = smoothstep(-uPx - 0.6, -uPx + 0.6, d) * (1.0 - smoothstep(-0.6, 0.6, d));
  float inside = 1.0 - smoothstep(-0.6, 0.6, d);
  vec2 pool = (p - uEntry) / (uHalf.y * vec2(1.6, 1.1));
  float glow = streak * 0.24 * exp(-abs(d + width * 0.5) / (5.0 * uPx)) + inside * 0.14 * exp(-dot(pool, pool));
  float light = clamp((band * streak + glow * uGlow) * uIntensity, 0.0, 1.0);
  outColor = vec4(uLineColor, 1.0) * light;
}`;

const SB_UNIFORMS = [
  'uCenter',
  'uHalf',
  'uRadius',
  'uPx',
  'uSpot',
  'uEntry',
  'uLineColor',
  'uBaseColor',
  'uIntensity',
  'uWindow',
  'uThickness',
  'uGlow',
] as const;

function sbWrap(value: number): number {
  return value - Math.floor(value);
}

function sbLoopPosition(x: number, y: number, halfX: number, halfY: number, r: number): number {
  const innerX = halfX - r;
  const innerY = halfY - r;
  const arc = (Math.PI / 2) * r;
  const quarter = innerX + innerY + arc;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const qx = ax - innerX;
  const qy = ay - innerY;
  let s: number;
  if (qx > 0 && qy > 0) s = innerY + Math.atan2(qy, qx) * r;
  else if (qx > qy) s = Math.min(ay, innerY);
  else s = innerY + arc + innerX - Math.min(ax, innerX);
  if (x < 0) s = y >= 0 ? 2 * quarter - s : 2 * quarter + s;
  else if (y < 0) s = 4 * quarter - s;
  return sbWrap(s / Math.max(4 * quarter, 0.0001));
}

function sbRimPoint(position: number, halfX: number, halfY: number, r: number): [number, number] {
  const innerX = halfX - r;
  const innerY = halfY - r;
  const arc = (Math.PI / 2) * r;
  const quarter = innerX + innerY + arc;
  let s = sbWrap(position) * 4 * quarter;
  let signX = 1;
  let signY = 1;
  if (s > 3 * quarter) {
    s = 4 * quarter - s;
    signY = -1;
  } else if (s > 2 * quarter) {
    s -= 2 * quarter;
    signX = -1;
    signY = -1;
  } else if (s > quarter) {
    s = 2 * quarter - s;
    signX = -1;
  }
  let x = innerX - (s - innerY - arc);
  let y = halfY;
  if (s <= innerY) {
    x = halfX;
    y = s;
  } else if (s <= innerY + arc) {
    const angle = (s - innerY) / Math.max(r, 0.0001);
    x = innerX + Math.cos(angle) * r;
    y = innerY + Math.sin(angle) * r;
  }
  return [x * signX, y * signY];
}

function sbCompile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function sbLink(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vertex = sbCompile(gl, gl.VERTEX_SHADER, SB_VERTEX_GLSL);
  const fragment = sbCompile(gl, gl.FRAGMENT_SHADER, SB_FRAGMENT_GLSL);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

export interface SpecularButtonOptions {
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  idleIntensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  glow?: number;
  speed?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
}

export class SpecularButtonEngine {
  private button: HTMLButtonElement;
  private canvas: HTMLCanvasElement;
  private settings: Required<SpecularButtonOptions>;

  constructor(button: HTMLButtonElement, options: SpecularButtonOptions = {}) {
    this.button = button;
    this.settings = {
      radius: Math.max(0, options.radius ?? 18),
      tint: options.tint ?? '#18181b',
      tintOpacity: options.tintOpacity ?? 1,
      blur: options.blur ?? 0,
      textColor: options.textColor ?? '#fafafa',
      lineColor: options.lineColor ?? '#3541a3',
      baseColor: options.baseColor ?? '#3f3f46',
      intensity: Math.max(0, options.intensity ?? 1),
      idleIntensity: clampVal(options.idleIntensity ?? 0.35, 0, 1),
      shineSize: Math.max(0, options.shineSize ?? 10),
      shineFade: Math.max(0, options.shineFade ?? 34),
      thickness: Math.max(0, options.thickness ?? 1.2),
      glow: Math.max(0, options.glow ?? 1),
      speed: options.speed ?? 0.35,
      followMouse: options.followMouse ?? true,
      proximity: Math.max(1, options.proximity ?? 250),
      autoAnimate: options.autoAnimate ?? false,
    };

    this.button.style.setProperty('--sb-radius', `${this.settings.radius}px`);
    this.button.style.setProperty('--sb-tint', this.settings.tint);
    this.button.style.setProperty('--sb-tint-opacity', String(this.settings.tintOpacity));
    this.button.style.setProperty('--sb-blur', `${this.settings.blur}px`);
    this.button.style.setProperty('--sb-text-color', this.settings.textColor);

    let canvas = this.button.querySelector<HTMLCanvasElement>('.specular-button__light');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'specular-button__light';
      canvas.setAttribute('aria-hidden', 'true');
      this.button.insertBefore(canvas, this.button.firstChild);
    }
    this.canvas = canvas;

    this.init();
  }

  private init() {
    const button = this.button;
    const canvas = this.canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) return;

    const program = sbLink(gl);
    if (!program) return;

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    for (const name of SB_UNIFORMS) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const colors = new Map<string, [number, number, number]>();
    const view = { width: 1, height: 1, ratio: 1 };
    const pointer = { x: 0, y: 0, known: false };
    const state = { spot: 0, level: 0, press: 0, ready: false };
    let raf = 0;
    let last = 0;
    let visible = true;

    const toRgb = (value: string): [number, number, number] => {
      const cached = colors.get(value);
      if (cached) return cached;
      let rgb: [number, number, number] = [1, 1, 1];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#000000';
        probe.fillStyle = value;
        probe.fillRect(0, 0, 1, 1);
        const data = probe.getImageData(0, 0, 1, 1).data;
        rgb = [data[0] / 255, data[1] / 255, data[2] / 255];
      }
      colors.set(value, rgb);
      return rgb;
    };

    const cornerRadius = (s: Required<SpecularButtonOptions>) =>
      Math.min(s.radius, view.width / 2, view.height / 2);

    const restSpot = (s: Required<SpecularButtonOptions>) => {
      const r = cornerRadius(s);
      const inset = r * (1 - Math.SQRT1_2);
      return sbLoopPosition(
        inset - view.width / 2,
        view.height / 2 - inset,
        view.width / 2,
        view.height / 2,
        r
      );
    };

    const aim = (s: Required<SpecularButtonOptions>) => {
      if (!s.followMouse || button.disabled || !pointer.known) return null;
      const rect = button.getBoundingClientRect();
      const scale = rect.width / view.width || 1;
      const halfX = view.width / 2;
      const halfY = view.height / 2;
      const x = (pointer.x - rect.left - rect.width / 2) / scale;
      const y = (rect.top + rect.height / 2 - pointer.y) / scale;
      const distance = Math.hypot(Math.max(Math.abs(x) - halfX, 0), Math.max(Math.abs(y) - halfY, 0));
      const t = clampVal(1 - distance / s.proximity, 0, 1);
      const near = t * t * (3 - 2 * t);
      const nearest = sbLoopPosition(x, y, halfX, halfY, cornerRadius(s));
      if (distance > 0) return { spot: nearest, near };
      const depth = clampVal(Math.min(halfX - Math.abs(x), halfY - Math.abs(y)) / (halfY * 0.8), 0, 1);
      const sway = restSpot(s) - (x / halfX) * 0.06 - (y / halfY) * 0.02;
      const offset = sway - nearest - Math.round(sway - nearest);
      return { spot: sbWrap(nearest + offset * depth * depth * (3 - 2 * depth)), near };
    };

    const draw = (s: Required<SpecularButtonOptions>) => {
      const { width, height } = view;
      const scaleX = canvas.width / (width + SB_PAD * 2);
      const scaleY = canvas.height / (height + SB_PAD * 2);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(uniforms.uCenter, (SB_PAD + width / 2) * scaleX, (SB_PAD + height / 2) * scaleY);
      gl.uniform2f(uniforms.uHalf, (width / 2) * scaleX, (height / 2) * scaleY);
      gl.uniform1f(uniforms.uRadius, Math.min(s.radius, width / 2, height / 2) * scaleX);
      gl.uniform1f(uniforms.uPx, view.ratio);
      const r = Math.min(s.radius, width / 2, height / 2);
      const [rimX, rimY] = sbRimPoint(state.spot, width / 2, height / 2, r);
      const pull =
        1 - Math.min(0.35 * (height / 2), Math.hypot(rimX, rimY)) / Math.max(Math.hypot(rimX, rimY), 0.0001);
      gl.uniform1f(uniforms.uSpot, state.spot);
      gl.uniform2f(uniforms.uEntry, rimX * pull * scaleX, rimY * pull * scaleY);
      gl.uniform3fv(uniforms.uLineColor, toRgb(s.lineColor));
      gl.uniform3fv(uniforms.uBaseColor, toRgb(s.baseColor));
      gl.uniform1f(uniforms.uIntensity, s.intensity * (state.level + state.press * 0.8));
      gl.uniform2f(uniforms.uWindow, s.shineSize / 360 + state.press * 0.06, s.shineFade / 360 + 0.0001);
      gl.uniform1f(uniforms.uThickness, s.thickness);
      gl.uniform1f(uniforms.uGlow, s.glow);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      const s = this.settings;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const target = aim(s);
      const spinning = s.autoAnimate && !reduce;
      const steering = !!target && target.near > 0;
      if (!state.ready) {
        state.spot = restSpot(s);
        state.level = s.autoAnimate ? 1 : s.idleIntensity;
        state.ready = true;
      }
      let diff = 0;
      if (spinning && !steering) {
        state.spot = sbWrap(state.spot + (s.speed / SB_TAU) * dt);
      } else {
        diff = (steering ? target!.spot : restSpot(s)) - state.spot;
        diff -= Math.round(diff);
        state.spot = sbWrap(state.spot + diff * (1 - Math.exp(-dt * 8)));
      }
      const level = s.autoAnimate ? 1 : s.idleIntensity + (1 - s.idleIntensity) * (target ? target.near : 0);
      state.level += (level - state.level) * (1 - Math.exp(-dt * 7));
      state.press *= Math.exp(-dt * 5);
      draw(s);
      const settling =
        Math.abs(diff) > 0.0002 || Math.abs(level - state.level) > 0.001 || state.press > 0.002;
      if (settling || (spinning && !steering)) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const wake = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    const measure = (entry?: ResizeObserverEntry) => {
      const box = entry?.borderBoxSize?.[0];
      view.width = Math.max(1, box ? box.inlineSize : button.offsetWidth);
      view.height = Math.max(1, box ? box.blockSize : button.offsetHeight);
      view.ratio = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.max(1, Math.round((view.width + SB_PAD * 2) * view.ratio));
      canvas.height = Math.max(1, Math.round((view.height + SB_PAD * 2) * view.ratio));
      if (state.ready) draw(this.settings);
      wake();
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.known = true;
      wake();
    };
    const onPointerDown = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.known = true;
      if (!button.disabled) state.press = 1;
      wake();
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      pointer.known = false;
      wake();
    };
    const onPointerLeave = () => {
      pointer.known = false;
      wake();
    };

    const resizeObserver = new ResizeObserver((entries) => measure(entries[entries.length - 1]));
    resizeObserver.observe(button);

    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) {
        last = 0;
        wake();
      }
    });
    intersection.observe(button);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerEnd, { passive: true });
    window.addEventListener('pointercancel', onPointerEnd, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);
    button.addEventListener('pointerdown', onPointerDown);
    measure();
  }
}


