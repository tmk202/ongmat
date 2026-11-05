import { CabinetAssets } from '../assets/cabinetSprites';

interface Vec2 {
  x: number;
  y: number;
}

interface LegRig {
  side: number; // 1 = right, -1 = left
  index: number; // 0..3 front to back
  group: number; // 0 or 1 alternating tetrapod
  hip: Vec2; // in body space
  rest: Vec2; // in body space
  a: number; // femur length in sprite units
  b: number; // tibia length in sprite units
  strip: HTMLCanvasElement;
  split: number; // femur ratio 0..1
  // Runtime world state
  foot: Vec2;
  stepStart: Vec2;
  stepGoal: Vec2;
  stepT: number; // 1 = planted, <1 = stepping
  stepDur: number;
}

interface RopePoint {
  x: number;
  y: number;
  ox: number;
  oy: number;
}

interface DewDrop {
  u: number; // 0..1 position along rope
  du: number; // sliding velocity
  r: number; // radius 1.6..6.2
  sliding: boolean;
}

interface FluffClump {
  u: number;
  type: 'dust' | 'fibres';
  seed: number;
}

interface SilkThread {
  pts: RopePoint[];
  segLen: number;
  thickness: number;
  phase: number;
  born: number;
  drops: DewDrop[];
  fluff: FluffClump[];
  hairsSeed: number;
}

interface FallingDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  startY: number;
  born: number;
  maxLife: number;
}

interface SplatSatellite {
  ox: number;
  oy: number;
  r: number;
}

interface Splat {
  x: number;
  y: number;
  landX: number;
  landY: number;
  vx: number;
  vy: number;
  oozeVy: number;
  airTime: number;
  maxAirTime: number;
  r: number;
  rx: number;
  ry: number;
  rot: number;
  fallingOff: boolean;
  born: number;
  maxLife: number;
  satellites: SplatSatellite[];
}

interface WobbleItem {
  el: HTMLElement;
  rect: DOMRect;
  stickBottom: boolean;
  angle: number;
  va: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
}

export class SpiderCabinetEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private assets: CabinetAssets;

  private W = 1440;
  private H = 810;
  private dpr = 1;

  // Scale & units (Section 3)
  private tScale = 1;
  private size = 1.63;
  private flySize = 1.05;
  private K = 0.1956; // size * 0.12 px per sprite unit
  private imgScale = 560 / 1254;

  // Rig parts (Section 5)
  private abdomenPart!: HTMLCanvasElement;
  private headPart!: HTMLCanvasElement;
  private idleHeadCanvas!: HTMLCanvasElement;
  private eyeSkinColors: [number, number, number][] = [];
  private legs: LegRig[] = [];

  // Fly parts (Section 7)
  private flyBodyCanvas!: HTMLCanvasElement;
  private flyLeftWingCanvas!: HTMLCanvasElement;
  private flyRightWingCanvas!: HTMLCanvasElement;

  // Dew drop 64px glass-bead sprite (Section 8)
  private dewSprite!: HTMLCanvasElement;

  // Offscreen canvases for spider shadow & web shadow masking
  private spiderOff!: HTMLCanvasElement;
  private spiderOffCtx!: CanvasRenderingContext2D;
  private shadowOff!: HTMLCanvasElement;
  private shadowOffCtx!: CanvasRenderingContext2D;
  private maskCanvas!: HTMLCanvasElement;
  private maskCtx!: CanvasRenderingContext2D;

  // Anchor outline points & wobbling objects
  private anchors: Vec2[] = [];
  private wobbleItems: WobbleItem[] = [];
  private resampleTimer = 0;
  private needsResample = false;

  // Time & clock
  private clock = 0;
  private rafId = 0;
  private destroyed = false;
  private isTouch = false;

  // Pointer & Fly state
  private pointer = { x: 960, y: 540, active: false, overControl: false, stillTime: 0 };
  private fly = {
    x: 960,
    y: 540,
    vx: 0,
    vy: 0,
    heading: -Math.PI / 2,
    landed: 0,
    recoil: 0,
    alpha: 1,
    caught: 0,
    caughtDur: 3.5,
    cocoonProgress: 0,
    cocoonFade: 0,
    cocoonX: 0,
    cocoonY: 0,
    cocoonHeading: 0,
  };

  // Spider state (Section 6)
  private sp = {
    x: 720,
    y: -150,
    vx: 0,
    vy: 0,
    speed: 0,
    heading: Math.PI / 2,
    angVel: 0,
    sway: 0,
    breathPhase: 0,
    lt: 0, // landing squash
    qt: 0, // rest face blend 0..1
    sleep: 0, // sleep blend 0..1
    restTimer: 0,
    blinkTimer: 1.5,
    blinkDur: 0.2,
    blinkT: 0,
    secondBlinkPending: false,
    // Intro state
    intro: true,
    introTime: 0,
    introLanded: false,
    // Jump / pounce state
    jumping: false,
    jumpT: 0,
    jumpDur: 0.4,
    jumpStart: { x: 0, y: 0 },
    jumpEnd: { x: 0, y: 0 },
    jumpMaxH: 0,
    jumpH: 0,
  };

  // Silk & Web state (Section 8)
  private threads: SilkThread[] = [];
  private liveAnchor: Vec2 = { x: 720, y: -2 };
  private spillCooldown = 0.15;
  private spillBurstRemaining = 0;
  private spillBurstSize = 3.5;
  private turnSpillCooldown = 0;
  private usedAnchors: Vec2[] = [];
  private fallingDrops: FallingDrop[] = [];
  private splats: Splat[] = [];
  private clearingWeb = false;
  private clearAlpha = 1;

  // Autonomous Foraging State (Platform -> Central 'ecommarketdata' Hive)
  private forage = {
    initialized: false,
    phase: 'TO_PLATFORM' as 'TO_PLATFORM' | 'HARVESTING' | 'TO_HIVE' | 'DEPOSITING',
    carryingHoney: false,
    lastPlatformIdx: -1,
    targetPlatformIdx: 0,
    p0: { x: 720, y: 400 },
    c1: { x: 720, y: 400 },
    c2: { x: 720, y: 400 },
    p3: { x: 720, y: 400 },
    legT: 0,
    legDur: 2.0,
    dwellTimer: 0,
    dwellAnchor: { x: 720, y: 400 },
    wavePhase: 0,
    waveFreq: 6.0,
    waveAmp: 18,
  };

  // Market Data Volatility state (0..1) driving the pulsing hexagonal hive network
  private marketVolatility = 0.64;
  private smoothVolatility = 0.64;

  // Touch gestures
  private holdTimer: number | null = null;
  private lastTapTime = 0;

  constructor(canvas: HTMLCanvasElement, assets: CabinetAssets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.assets = assets;
    this.isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    this.spiderOff = document.createElement('canvas');
    this.spiderOffCtx = this.spiderOff.getContext('2d')!;
    this.shadowOff = document.createElement('canvas');
    this.shadowOffCtx = this.shadowOff.getContext('2d')!;
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d')!;

    this.buildSpiderRig();
    this.buildFlyRig();
    this.buildDewSprite();
    this.updateSize();
    this.initSpiderIntro();
    this.bindEvents();

    // Sample anchors on ready & after 600ms
    this.sampleAnchors();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!this.destroyed) this.sampleAnchors();
      });
    }
    setTimeout(() => {
      if (!this.destroyed) this.sampleAnchors();
    }, 600);

    let last = performance.now();
    const tick = (now: number) => {
      if (this.destroyed) return;
      const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
      last = now;
      this.step(dt);
      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    if (this.holdTimer) clearTimeout(this.holdTimer);
    this.unbindEvents();
  }

  public triggerClearWeb() {
    if (this.threads.length === 0 && this.splats.length === 0 && this.fallingDrops.length === 0) return;
    this.clearingWeb = true;
    this.clearAlpha = 1;
    // Every honey drop slides/falls off-screen
    for (const sp of this.splats) {
      sp.fallingOff = true;
      sp.vy = 20 + Math.random() * 80;
    }
    const spPos = this.getSpinneretWorld();
    this.liveAnchor = { x: spPos.x, y: spPos.y };
  }

  public triggerSpiderJump() {
    if (this.sp.intro || this.sp.jumping) return;
    this.startJumpToFly();
  }

  public setMarketVolatility(volatility: number) {
    this.marketVolatility = Math.max(0.08, Math.min(1, volatility));
  }

  // ============================================================================
  // 1. Rig Construction (Sections 5, 7, 8)
  // ============================================================================

  private bodyPointFromImage(ix: number, iy: number): Vec2 {
    // Section 5: image point -> body point (y - 600, -(x - 627)), head points along +x
    return { x: iy - 600, y: -(ix - 627) };
  }

  private buildSpiderRig() {
    const src = this.assets.spiderCanvas;
    const S = this.imgScale; // 560 / 1254

    // 1. Cut Abdomen with ellipse (628,345) r 220x205, blur(2*scale px) and destination-in
    this.abdomenPart = document.createElement('canvas');
    this.abdomenPart.width = 560;
    this.abdomenPart.height = 560;
    const actx = this.abdomenPart.getContext('2d')!;
    actx.drawImage(src, 0, 0);
    actx.globalCompositeOperation = 'destination-in';
    actx.filter = `blur(${(2 * S).toFixed(2)}px)`;
    actx.fillStyle = '#000';
    actx.beginPath();
    actx.ellipse(628 * S, 345 * S, 220 * S, 205 * S, 0, 0, Math.PI * 2);
    actx.fill();
    actx.filter = 'none';
    actx.globalCompositeOperation = 'source-over';

    // 2. Cut Head with ellipses (630,680) r 172x148, (545,880) r 74x70, (712,880) r 74x70
    this.headPart = document.createElement('canvas');
    this.headPart.width = 560;
    this.headPart.height = 560;
    const hctx = this.headPart.getContext('2d')!;
    hctx.drawImage(src, 0, 0);
    hctx.globalCompositeOperation = 'destination-in';
    hctx.filter = `blur(${(2 * S).toFixed(2)}px)`;
    hctx.fillStyle = '#000';
    hctx.beginPath();
    hctx.ellipse(630 * S, 680 * S, 172 * S, 148 * S, 0, 0, Math.PI * 2);
    hctx.ellipse(545 * S, 880 * S, 74 * S, 70 * S, 0, 0, Math.PI * 2);
    hctx.ellipse(712 * S, 880 * S, 74 * S, 70 * S, 0, 0, Math.PI * 2);
    hctx.fill();
    hctx.filter = 'none';
    hctx.globalCompositeOperation = 'source-over';

    // 3. Idle Head & sample eye skin colours for eyelids
    this.idleHeadCanvas = this.assets.idleHeadCanvas;
    const ictx = this.idleHeadCanvas.getContext('2d')!;
    const iData = ictx.getImageData(0, 0, 308, 308).data;
    const eyes: [number, number, number][] = [
      [139, 158, 12.5],
      [170, 158, 12.5],
      [117, 150, 7.5],
      [192, 150, 7.5],
      [112, 136, 4],
      [197, 136, 4],
    ];
    this.eyeSkinColors = eyes.map(([ex, ey, er]) => {
      const sx = Math.max(0, Math.min(307, Math.round(ex)));
      const sy = Math.max(0, Math.min(307, Math.round(ey - er - 4)));
      const idx = (sy * 308 + sx) * 4;
      const r = iData[idx] || 185;
      const g = iData[idx + 1] || 138;
      const b = iData[idx + 2] || 92;
      return [r, g, b];
    });

    // 4. Resample 8 legs from spider photo via bilinear sampling along hip->knee->foot polyline
    const srcCtx = src.getContext('2d')!;
    const srcData = srcCtx.getImageData(0, 0, 560, 560);
    const rightCoords: [number, number][][] = [
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

    const legWidthSprite = 92;
    this.legs = [];

    for (const rightSide of [true, false]) {
      for (let i = 0; i < 4; i++) {
        const pts = rightCoords[i].map(([x, y]) => [rightSide ? x : 1254 - x, y] as [number, number]);
        const [hipImg, kneeImg, footImg] = pts;
        const femurLen = Math.hypot(kneeImg[0] - hipImg[0], kneeImg[1] - hipImg[1]);
        const tibiaLen = Math.hypot(footImg[0] - kneeImg[0], footImg[1] - kneeImg[1]);
        const totalLen = femurLen + tibiaLen;
        const split = femurLen / totalLen;

        const stripW = Math.max(16, Math.round(totalLen * S));
        const stripH = Math.max(8, Math.round(legWidthSprite * S));
        const strip = document.createElement('canvas');
        strip.width = stripW;
        strip.height = stripH;
        const sctx = strip.getContext('2d')!;
        const outImg = sctx.createImageData(stripW, stripH);
        const out = outImg.data;

        const u1x = (kneeImg[0] - hipImg[0]) / femurLen;
        const u1y = (kneeImg[1] - hipImg[1]) / femurLen;
        const n1x = -u1y;
        const n1y = u1x;

        const u2x = (footImg[0] - kneeImg[0]) / tibiaLen;
        const u2y = (footImg[1] - kneeImg[1]) / tibiaLen;
        const n2x = -u2y;
        const n2y = u2x;

        const halfW = legWidthSprite * 0.5;

        for (let px = 0; px < stripW; px++) {
          const d = (px / Math.max(1, stripW - 1)) * totalLen;
          let cx = 0;
          let cy = 0;
          let nx = 0;
          let ny = 0;
          if (d <= femurLen) {
            cx = hipImg[0] + u1x * d;
            cy = hipImg[1] + u1y * d;
            nx = n1x;
            ny = n1y;
          } else {
            const td = d - femurLen;
            cx = kneeImg[0] + u2x * td;
            cy = kneeImg[1] + u2y * td;
            nx = n2x;
            ny = n2y;
          }

          for (let py = 0; py < stripH; py++) {
            const vNorm = (py / Math.max(1, stripH - 1)) * 2 - 1; // -1..1
            const offset = vNorm * halfW;
            const sx = (cx + nx * offset) * S;
            const sy = (cy + ny * offset) * S;

            const rgba = this.sampleBilinear(srcData, sx, sy);
            // Alpha fades out over the outer 28% of the half-width (|vNorm| > 0.72)
            let fade = 1;
            const absV = Math.abs(vNorm);
            if (absV > 0.72) {
              fade = Math.max(0, 1 - (absV - 0.72) / 0.28);
            }

            const oIdx = (py * stripW + px) * 4;
            out[oIdx] = rgba[0];
            out[oIdx + 1] = rgba[1];
            out[oIdx + 2] = rgba[2];
            out[oIdx + 3] = Math.round(rgba[3] * fade);
          }
        }
        sctx.putImageData(outImg, 0, 0);

        const hipBody = this.bodyPointFromImage(hipImg[0], hipImg[1]);
        const restBody = this.bodyPointFromImage(footImg[0], footImg[1]);
        let a = femurLen;
        let b = tibiaLen;
        const restDist = Math.hypot(restBody.x - hipBody.x, restBody.y - hipBody.y);
        if (a + b < 1.15 * restDist) {
          const factor = (1.15 * restDist) / (a + b);
          a *= factor;
          b *= factor;
        }

        const group = (i + (rightSide ? 0 : 1)) % 2;
        this.legs.push({
          side: rightSide ? 1 : -1,
          index: i,
          group,
          hip: hipBody,
          rest: restBody,
          a,
          b,
          strip,
          split,
          foot: { x: 0, y: 0 },
          stepStart: { x: 0, y: 0 },
          stepGoal: { x: 0, y: 0 },
          stepT: 1,
          stepDur: 0.1,
        });
      }
    }
  }

  private sampleBilinear(img: ImageData, x: number, y: number): [number, number, number, number] {
    const w = img.width;
    const h = img.height;
    if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return [0, 0, 0, 0];
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const d = img.data;
    const i00 = (y0 * w + x0) * 4;
    const i10 = i00 + 4;
    const i01 = i00 + w * 4;
    const i11 = i01 + 4;

    const w00 = (1 - fx) * (1 - fy);
    const w10 = fx * (1 - fy);
    const w01 = (1 - fx) * fy;
    const w11 = fx * fy;

    return [
      d[i00] * w00 + d[i10] * w10 + d[i01] * w01 + d[i11] * w11,
      d[i00 + 1] * w00 + d[i10 + 1] * w10 + d[i01 + 1] * w01 + d[i11 + 1] * w11,
      d[i00 + 2] * w00 + d[i10 + 2] * w10 + d[i01 + 2] * w01 + d[i11 + 2] * w11,
      d[i00 + 3] * w00 + d[i10 + 3] * w10 + d[i01 + 3] * w01 + d[i11 + 3] * w11,
    ];
  }

  private buildFlyRig() {
    // Section 7: 240x246 image in 920x945 sprite space.
    const src = this.assets.flyCanvas;
    const W = 240;
    const H = 246;
    const sx = W / 920;
    const sy = H / 945;

    const leftPoly: [number, number][] = [
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
    const rightPoly = leftPoly.map(([x, y]) => [920 - x, y] as [number, number]);

    const makeWingCanvas = (poly: [number, number][]) => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d')!;
      ctx.save();
      ctx.beginPath();
      poly.forEach(([px, py], idx) => {
        if (idx === 0) ctx.moveTo(px * sx, py * sy);
        else ctx.lineTo(px * sx, py * sy);
      });
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(src, 0, 0);
      ctx.restore();
      return c;
    };

    this.flyLeftWingCanvas = makeWingCanvas(leftPoly);
    this.flyRightWingCanvas = makeWingCanvas(rightPoly);

    // Body = photo minus wings
    this.flyBodyCanvas = document.createElement('canvas');
    this.flyBodyCanvas.width = W;
    this.flyBodyCanvas.height = H;
    const bctx = this.flyBodyCanvas.getContext('2d')!;
    bctx.drawImage(src, 0, 0);
    bctx.globalCompositeOperation = 'destination-out';
    for (const poly of [leftPoly, rightPoly]) {
      bctx.beginPath();
      poly.forEach(([px, py], idx) => {
        if (idx === 0) bctx.moveTo(px * sx, py * sy);
        else bctx.lineTo(px * sx, py * sy);
      });
      bctx.closePath();
      bctx.fillStyle = 'rgba(0,0,0,0.85)';
      bctx.fill();
    }
    bctx.globalCompositeOperation = 'source-over';
  }

  private buildDewSprite() {
    // 96x96 Photorealistic 3D Refractive Liquid Honey Droplet Sprite (Zero cartoon outlines)
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext('2d')!;

    ctx.save();
    const cx = 46;
    const cy = 46;
    const r = 30;

    // 1. Soft Warm Amber-Gold Contact & Caustic Shadow underneath (offset down-right)
    const shadowGrad = ctx.createRadialGradient(cx + 5, cy + 7, r * 0.15, cx + 5, cy + 7, r * 1.38);
    shadowGrad.addColorStop(0, 'rgba(180, 83, 9, 0.34)');
    shadowGrad.addColorStop(0.55, 'rgba(217, 119, 6, 0.18)');
    shadowGrad.addColorStop(0.82, 'rgba(245, 158, 11, 0.06)');
    shadowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(cx + 5, cy + 7, r * 1.38, 0, Math.PI * 2);
    ctx.fill();

    // 2. Main Translucent Viscous Honey Dome Base
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // Rich amber-to-gold translucent body gradient (deeper amber at top-left, glowing nectar at bottom-right)
    const bodyGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    bodyGrad.addColorStop(0, 'rgba(217, 119, 6, 0.90)');
    bodyGrad.addColorStop(0.32, 'rgba(245, 158, 11, 0.86)');
    bodyGrad.addColorStop(0.7, 'rgba(251, 191, 36, 0.88)');
    bodyGrad.addColorStop(1, 'rgba(253, 224, 71, 0.94)');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // 3. Internal Subsurface Caustic Focal Glow (light focusing through the honey lens at lower-right)
    const causticGrad = ctx.createRadialGradient(
      cx + r * 0.32,
      cy + r * 0.34,
      r * 0.05,
      cx + r * 0.25,
      cy + r * 0.28,
      r * 0.78
    );
    causticGrad.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
    causticGrad.addColorStop(0.38, 'rgba(253, 224, 71, 0.72)');
    causticGrad.addColorStop(0.75, 'rgba(251, 191, 36, 0.22)');
    causticGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = causticGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 4. Upper-Left Internal Refraction Depth Crescent (rich organic raw honey tone)
    ctx.strokeStyle = 'rgba(146, 64, 14, 0.28)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(cx + 1.5, cy + 1.5, r - 1.5, Math.PI * 0.85, Math.PI * 1.65);
    ctx.stroke();

    // 5. Delicate Surface-Tension Meniscus Rim (soft translucent amber edge, NOT a cartoon outline)
    const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.76, cx, cy, r);
    rimGrad.addColorStop(0, 'rgba(180, 83, 9, 0)');
    rimGrad.addColorStop(0.82, 'rgba(180, 83, 9, 0.08)');
    rimGrad.addColorStop(1, 'rgba(146, 64, 14, 0.32)');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 6. Primary Curved Liquid Lens Specular Highlight (top-left glossy reflection)
    ctx.save();
    ctx.translate(cx - r * 0.36, cy - r * 0.36);
    ctx.rotate(-Math.PI * 0.25);
    const specGrad = ctx.createRadialGradient(0, 0, 0.5, 0, 0, r * 0.36);
    specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    specGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.78)');
    specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.34, r * 0.19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 7. Crisp Pinpoint Secondary Specular Glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.52, cy - r * 0.08, r * 0.075, 0, Math.PI * 2);
    ctx.fill();

    // 8. Subtle Lower-Right Secondary Rim Reflection
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.86, Math.PI * 0.12, Math.PI * 0.38);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
    this.dewSprite = c;
  }

  // ============================================================================
  // 2. Sizing, Anchor Outline Sampling & Events
  // ============================================================================

  private updateSize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);

    this.spiderOff.width = Math.round(520 * this.dpr);
    this.spiderOff.height = Math.round(520 * this.dpr);

    this.shadowOff.width = this.canvas.width;
    this.shadowOff.height = this.canvas.height;

    this.maskCanvas.width = this.canvas.width;
    this.maskCanvas.height = this.canvas.height;

    // Section 3: Spider scale t
    const w = this.W;
    const h = this.H;
    let t = 1;
    if (w <= h) {
      t = Math.max(0.78, Math.min(1.1, w / 480));
    } else if (h < 560) {
      t = Math.max(0.68, h / 620);
    } else {
      t = Math.min(w / 1440, h / 810);
    }
    this.tScale = Math.max(0.6, Math.min(1.25, t));
    // Mechanical Cyber-Bee Harvester Drone sprite scaling
    this.size = 1.48 * this.tScale;
    this.flySize = Math.max(0.75, 1.02 * this.tScale);
    this.K = this.size * 0.115;
  }

  private initSpiderIntro() {
    // Section 6: Start x = W/2, y = -760K, heading straight down, live thread from (W/2, -2)
    this.sp.x = this.W * 0.5;
    this.sp.y = -760 * this.K;
    this.sp.heading = Math.PI / 2;
    this.sp.intro = true;
    this.sp.introTime = 0;
    this.sp.introLanded = false;
    this.liveAnchor = { x: this.W * 0.5, y: -2 };
    this.snapFeetToRest();
  }

  private snapFeetToRest() {
    for (const leg of this.legs) {
      const w = this.bodyToWorld(leg.rest.x, leg.rest.y);
      leg.foot.x = w.x;
      leg.foot.y = w.y;
      leg.stepStart.x = w.x;
      leg.stepStart.y = w.y;
      leg.stepGoal.x = w.x;
      leg.stepGoal.y = w.y;
      leg.stepT = 1;
    }
  }

  public sampleAnchors() {
    // Collect wobble items & sample visible outlines of all [data-web-anchor] elements
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-web-anchor]'));
    const points: Vec2[] = [];

    const mctx = this.maskCtx;
    mctx.save();
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    mctx.scale(this.dpr, this.dpr);
    mctx.fillStyle = '#000000';

    // Update wobble items list
    const existingMap = new Map<HTMLElement, WobbleItem>();
    for (const item of this.wobbleItems) existingMap.set(item.el, item);
    const nextWobble: WobbleItem[] = [];

    for (const el of els) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;

      if (el.tagName === 'IMG' || el.classList.contains('cabinet-obj')) {
        const prev = existingMap.get(el);
        nextWobble.push(
          prev
            ? { ...prev, rect }
            : {
                el,
                rect,
                stickBottom: el.dataset.stick === 'bottom',
                angle: 0,
                va: 0,
                ox: 0,
                oy: 0,
                vx: 0,
                vy: 0,
              }
        );
      }

      if (el.tagName === 'IMG') {
        const imgEl = el as HTMLImageElement;
        if (imgEl.complete && imgEl.naturalWidth > 0) {
          this.sampleImageOutline(imgEl, rect, points, mctx);
        } else {
          this.sampleRectPerimeter(rect, 12, points, mctx);
        }
      } else if (el.classList.contains('player')) {
        const radius = parseFloat(style.borderRadius) || 24;
        this.sampleRectPerimeter(rect, radius, points, mctx);
      } else {
        this.sampleTextOutline(el, rect, style, points, mctx);
      }
    }

    mctx.restore();
    this.wobbleItems = nextWobble;
    this.anchors = points;
  }

  private sampleRectPerimeter(
    rect: DOMRect,
    radius: number,
    out: Vec2[],
    mctx: CanvasRenderingContext2D
  ) {
    mctx.beginPath();
    mctx.roundRect(rect.left, rect.top, rect.width, rect.height, radius);
    mctx.fill();

    const step = 7;
    const w = rect.width;
    const h = rect.height;
    for (let x = 0; x <= w; x += step) {
      out.push({ x: rect.left + x, y: rect.top });
      out.push({ x: rect.left + x, y: rect.bottom });
    }
    for (let y = step; y < h; y += step) {
      out.push({ x: rect.left, y: rect.top + y });
      out.push({ x: rect.right, y: rect.top + y });
    }
  }

  private sampleImageOutline(
    img: HTMLImageElement,
    rect: DOMRect,
    out: Vec2[],
    mctx: CanvasRenderingContext2D
  ) {
    // Draw onto mask canvas so shadows fall on image silhouette
    mctx.drawImage(img, rect.left, rect.top, rect.width, rect.height);

    // Sample alpha > 140 boundary every ~7px
    const sw = Math.max(16, Math.min(180, Math.round(rect.width)));
    const sh = Math.max(16, Math.min(180, Math.round(rect.height)));
    const off = document.createElement('canvas');
    off.width = sw;
    off.height = sh;
    const octx = off.getContext('2d')!;
    octx.drawImage(img, 0, 0, sw, sh);
    const data = octx.getImageData(0, 0, sw, sh).data;

    const strideX = Math.max(2, Math.round((7 / rect.width) * sw));
    const strideY = Math.max(2, Math.round((7 / rect.height) * sh));

    const isSolid = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= sw || y >= sh) return false;
      return data[(y * sw + x) * 4 + 3] > 140;
    };

    for (let y = 0; y < sh; y += strideY) {
      for (let x = 0; x < sw; x += strideX) {
        if (!isSolid(x, y)) continue;
        if (
          !isSolid(x - strideX, y) ||
          !isSolid(x + strideX, y) ||
          !isSolid(x, y - strideY) ||
          !isSolid(x, y + strideY)
        ) {
          out.push({
            x: rect.left + (x / sw) * rect.width,
            y: rect.top + (y / sh) * rect.height,
          });
        }
      }
    }
  }

  private sampleTextOutline(
    el: HTMLElement,
    rect: DOMRect,
    style: CSSStyleDeclaration,
    out: Vec2[],
    mctx: CanvasRenderingContext2D
  ) {
    const text = (el.innerText || el.textContent || '').trim();
    if (!text) return;

    const pad = 16;
    const cw = Math.min(1200, Math.ceil(rect.width + pad * 2));
    const ch = Math.min(500, Math.ceil(rect.height + pad * 2));
    if (cw < 4 || ch < 4) return;

    const off = document.createElement('canvas');
    off.width = cw;
    off.height = ch;
    const octx = off.getContext('2d')!;
    const scaleX = cw / (rect.width + pad * 2);
    const scaleY = ch / (rect.height + pad * 2);
    octx.scale(scaleX, scaleY);

    octx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    octx.textBaseline = 'top';
    octx.fillStyle = '#000';
    if ('letterSpacing' in octx) {
      (octx as unknown as { letterSpacing: string }).letterSpacing = style.letterSpacing;
    }

    const lines = text.split('\n');
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.1;
    lines.forEach((line, i) => {
      octx.fillText(line, pad, pad + i * lineHeight);
    });

    // Stamp onto mask canvas for web shadow masking
    mctx.drawImage(off, rect.left - pad, rect.top - pad, rect.width + pad * 2, rect.height + pad * 2);

    const data = octx.getImageData(0, 0, cw, ch).data;
    const stepX = Math.max(2, Math.round(7 * scaleX));
    const stepY = Math.max(2, Math.round(7 * scaleY));

    const isOpaque = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= cw || y >= ch) return false;
      return data[(y * cw + x) * 4 + 3] > 128;
    };

    for (let y = 0; y < ch; y += stepY) {
      for (let x = 0; x < cw; x += stepX) {
        if (!isOpaque(x, y)) continue;
        if (
          !isOpaque(x - stepX, y) ||
          !isOpaque(x + stepX, y) ||
          !isOpaque(x, y - stepY) ||
          !isOpaque(x, y + stepY)
        ) {
          out.push({
            x: rect.left - pad + x / scaleX,
            y: rect.top - pad + y / scaleY,
          });
        }
      }
    }
  }

  // ============================================================================
  // 3. Input & Event Listeners (Section 10)
  // ============================================================================

  private onPointerMove = (e: PointerEvent) => {
    const dx = e.clientX - this.pointer.x;
    const dy = e.clientY - this.pointer.y;
    const moved = Math.hypot(dx, dy) > 1.5;

    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.active = true;

    const target = e.target as HTMLElement | null;
    this.pointer.overControl = Boolean(
      target && target.closest('button, a, input, [data-no-spider]')
    );

    if (moved) {
      this.pointer.stillTime = 0;
      // Waking from sleep (> 0.6) makes a startled hop (0.3s, height 26)
      if (this.sp.sleep > 0.6 && !this.sp.jumping && !this.sp.intro) {
        this.sp.sleep = 0;
        this.sp.qt = 0;
        this.sp.restTimer = 0;
        this.sp.jumping = true;
        this.sp.jumpT = 0;
        this.sp.jumpDur = 0.3;
        this.sp.jumpStart = { x: this.sp.x, y: this.sp.y };
        this.sp.jumpEnd = { x: this.sp.x, y: this.sp.y };
        this.sp.jumpMaxH = 26;
        this.vibrateWebAt(this.sp.x, this.sp.y, 120, 1.8);
      }
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    const isControl = Boolean(target && target.closest('button, a, input, [data-no-spider]'));
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.active = true;
    this.pointer.overControl = isControl;

    if (isControl) return;

    if (e.pointerType === 'touch') {
      const now = performance.now();
      if (now - this.lastTapTime < 340) {
        if (this.holdTimer) clearTimeout(this.holdTimer);
        this.fly.x = e.clientX;
        this.fly.y = e.clientY;
        this.startJumpToFly();
      } else {
        this.holdTimer = window.setTimeout(() => {
          if (navigator.vibrate) navigator.vibrate(30);
          this.triggerClearWeb();
        }, 650);
      }
      this.lastTapTime = now;
    } else if (e.button === 0) {
      this.startJumpToFly();
    }
  };

  private onPointerUp = () => {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  };

  private onPointerLeave = () => {
    this.pointer.active = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.triggerClearWeb();
    }
  };

  private onResize = () => {
    this.updateSize();
    this.sampleAnchors();
  };

  private bindEvents() {
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.onResize);
  }

  private unbindEvents() {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onResize);
  }

  // ============================================================================
  // 4. Frame Update Loop (Section 11)
  // ============================================================================

  private step(dt: number) {
    this.clock += dt;
    this.pointer.stillTime += dt;

    // 1. Update the fly
    this.updateFly(dt);

    // 2. Update the image nudges
    this.updateImageNudges(dt);

    // 3. Update the spider (intro, jump, follow, feet)
    this.updateSpider(dt);

    // 4. Update the rest and sleep state
    this.updateRestAndSleep(dt);

    // 5. Update the anchoring and the silk physics
    this.updateAnchoringAndSilk(dt);
  }

  private updateFly(dt: number) {
    const B = this.clock;
    // Target alpha (fades out over controls or when pointer leaves window)
    const targetAlpha = this.pointer.active && !this.pointer.overControl ? 1 : 0;
    this.fly.alpha += (targetAlpha - this.fly.alpha) * (1 - Math.exp(-14 * dt));

    if (this.fly.caught > 0) {
      this.fly.caught -= dt;
      this.fly.cocoonProgress = Math.min(1, this.fly.cocoonProgress + dt * 1.4);
      // Trembles at 47 and 31 Hz
      this.fly.x = this.fly.cocoonX + Math.sin(47 * B * Math.PI * 2) * 1.6;
      this.fly.y = this.fly.cocoonY + Math.cos(31 * B * Math.PI * 2) * 1.6;

      if (this.fly.caught <= 0) {
        // Breaks free and is flung 150px away, while cocoon fades
        const angle = Math.random() * Math.PI * 2;
        this.fly.x += Math.cos(angle) * 150;
        this.fly.y += Math.sin(angle) * 150;
        this.fly.recoil = 1;
        this.fly.cocoonFade = 1;
        this.vibrateWebAt(this.fly.cocoonX, this.fly.cocoonY, 110, 2.2);
      }
      return;
    }

    if (this.fly.cocoonFade > 0) {
      this.fly.cocoonFade = Math.max(0, this.fly.cocoonFade - dt * 1.2);
    }
    this.fly.recoil = Math.max(0, this.fly.recoil - dt * 2.5);

    // Landing: after 1.2s still, landed ramps up 3/s (down 10/s)
    if (this.pointer.stillTime > 1.2) {
      this.fly.landed = Math.min(1, this.fly.landed + 3 * dt);
    } else {
      this.fly.landed = Math.max(0, this.fly.landed - 10 * dt);
    }

    // High-frequency mechanical drone piezo/servo stabilization jitter
    const jitterScale = 1 - this.fly.landed;
    const jx = (Math.sin(64.0 * B) * 0.75 + Math.cos(112.0 * B + 0.9) * 0.45) * 1.45 * jitterScale;
    const jy = (Math.cos(72.0 * B + 0.4) * 0.75 + Math.sin(128.0 * B) * 0.45) * 1.45 * jitterScale;

    const ease = 1 - Math.exp(-(32 - 20 * this.fly.recoil) * dt);
    const oldX = this.fly.x;
    const oldY = this.fly.y;
    this.fly.x += (this.pointer.x + jx - this.fly.x) * ease;
    this.fly.y += (this.pointer.y + jy - this.fly.y) * ease;

    this.fly.vx = (this.fly.x - oldX) / dt;
    this.fly.vy = (this.fly.y - oldY) / dt;
    const speed = Math.hypot(this.fly.vx, this.fly.vy);
    if (speed > 60) {
      const targetH = Math.atan2(this.fly.vy, this.fly.vx) + Math.PI / 2;
      const diff = Math.atan2(Math.sin(targetH - this.fly.heading), Math.cos(targetH - this.fly.heading));
      this.fly.heading += diff * (1 - Math.exp(-14 * dt));
    }
  }

  private updateImageNudges(dt: number) {
    // Section 9: Objects react when spider walks past within 260K at speed > 40
    const reach = 260 * this.K;
    let anyMoving = false;

    for (const item of this.wobbleItems) {
      const cx = item.rect.left + item.rect.width * 0.5 + item.ox;
      const cy = item.rect.top + (item.stickBottom ? item.rect.height : item.rect.height * 0.5) + item.oy;

      const rx = this.sp.x - cx;
      const ry = this.sp.y - cy;
      const dist = Math.hypot(rx, ry);
      const boxSize = Math.max(60, Math.hypot(item.rect.width, item.rect.height) * 0.5);

      if (dist < reach + boxSize * 0.6 && this.sp.speed > 40 && !this.sp.intro) {
        const cross = (rx * this.sp.vy - ry * this.sp.vx) / (boxSize * boxSize);
        const clampedTorque = Math.max(-2.5, Math.min(2.5, cross));
        item.va += clampedTorque * 120 * dt;
        if (!item.stickBottom) {
          item.vx += 0.85 * this.sp.vx * dt;
          item.vy += 0.85 * this.sp.vy * dt;
        }
      }

      // Spring forces
      const maxAngle = item.stickBottom ? 8 : 24;
      const angleSpring = item.stickBottom ? 20 : 8;
      if (Math.abs(item.angle) > maxAngle) {
        const excess = item.angle - Math.sign(item.angle) * maxAngle;
        item.va -= excess * angleSpring * dt;
      } else {
        item.va -= item.angle * 3.5 * dt;
      }

      if (!item.stickBottom) {
        const offsetMag = Math.hypot(item.ox, item.oy);
        if (offsetMag > 50) {
          const excess = (offsetMag - 50) / offsetMag;
          item.vx -= item.ox * excess * 8 * dt;
          item.vy -= item.oy * excess * 8 * dt;
        } else {
          item.vx -= item.ox * 2.4 * dt;
          item.vy -= item.oy * 2.4 * dt;
        }
      }

      const damp = Math.exp(-2.8 * dt);
      item.va *= damp;
      item.vx *= damp;
      item.vy *= damp;

      item.angle += item.va * dt * 18;
      if (!item.stickBottom) {
        item.ox += item.vx * dt;
        item.oy += item.vy * dt;
      }

      if (Math.abs(item.va) > 0.02 || Math.hypot(item.vx, item.vy) > 0.2) {
        anyMoving = true;
        this.needsResample = true;
        this.resampleTimer = 0.3;
      }

      item.el.style.rotate = `${item.angle.toFixed(2)}deg`;
      if (!item.stickBottom) {
        item.el.style.translate = `${item.ox.toFixed(1)}px ${item.oy.toFixed(1)}px`;
      }
    }

    if (!anyMoving && this.needsResample) {
      this.resampleTimer -= dt;
      if (this.resampleTimer <= 0) {
        this.needsResample = false;
        this.sampleAnchors();
      }
    }
  }

  private startJumpToFly() {
    if (this.sp.intro || this.sp.jumping) return;
    this.sp.sleep = 0;
    this.sp.qt = 0;
    this.sp.restTimer = 0;

    // Spider turns toward fly and pounces so its mouth (heading * 360K) meets the fly, travelling at most 360K
    const dx = this.fly.x - this.sp.x;
    const dy = this.fly.y - this.sp.y;
    const targetHeading = Math.atan2(dy, dx);
    this.sp.heading = targetHeading;

    const mouthOffset = 360 * this.K;
    const rawDist = Math.hypot(dx, dy);
    const travelDist = Math.min(360 * this.K, Math.max(0, rawDist - mouthOffset * 0.65));

    this.sp.jumping = true;
    this.sp.jumpT = 0;
    this.sp.jumpDur = Math.max(0.28, Math.min(0.6, travelDist / 1100));
    this.sp.jumpStart = { x: this.sp.x, y: this.sp.y };
    this.sp.jumpEnd = {
      x: Math.max(10, Math.min(this.W - 10, this.sp.x + Math.cos(targetHeading) * travelDist)),
      y: Math.max(10, Math.min(this.H - 10, this.sp.y + Math.sin(targetHeading) * travelDist)),
    };
    this.sp.jumpMaxH = Math.max(22, Math.min(0.3 * travelDist, 130));
  }

  private updateSpider(dt: number) {
    // Decay landing squash lt (4/s)
    this.sp.lt = Math.max(0, this.sp.lt - 4 * dt);

    // Breathing phase
    const smoothSleep = this.sp.sleep * this.sp.sleep * (3 - 2 * this.sp.sleep);
    this.sp.breathPhase += (3.2 - 1.8 * smoothSleep) * dt;

    // 1. Intro sequence (Section 6)
    if (this.sp.intro) {
      this.sp.introTime += dt;
      const startDelay = 0.8; // Quick responsive start so user immediately sees spider descend
      if (this.sp.introTime < startDelay) {
        this.sp.x = this.W * 0.5;
        this.sp.y = -760 * this.K;
        this.snapFeetToRest();
        return;
      }
      const elapsed = this.sp.introTime - startDelay;
      const dropDur = 2.3;
      const targetY = this.H * 0.5;
      const startY = -760 * this.K;

      if (elapsed <= dropDur) {
        const v = elapsed / dropDur;
        const ease = 1 - Math.pow(1 - v, 2.4);
        this.sp.y = startY + (targetY - startY) * ease;
        this.sp.x = this.W * 0.5 + Math.sin(1.8 * elapsed) * 8 * Math.exp(-0.5 * elapsed);
        this.sp.heading = Math.PI / 2 + Math.sin(3.2 * elapsed) * 0.06;
      } else {
        const v = elapsed - dropDur;
        const bounce = 14 * Math.exp(-3.2 * v) * Math.sin(6.5 * v);
        this.sp.y = targetY + bounce;
        this.sp.x = this.W * 0.5 + Math.sin(1.8 * elapsed) * 8 * Math.exp(-0.5 * elapsed);
        this.sp.heading = Math.PI / 2 + Math.sin(4.1 * v) * 0.05 * Math.exp(-2 * v);

        if (v >= 1.3 && !this.sp.introLanded) {
          this.sp.introLanded = true;
          this.sp.intro = false;
          this.sp.lt = 1;
          this.vibrateWebAt(this.sp.x, this.sp.y, 140, 2);
          this.pinLiveThread({ x: this.sp.x, y: this.sp.y - 40 * this.K });
          this.startNextForageToPlatform();
        }
      }
      this.snapFeetToRest();
      return;
    }

    // 2. Jump / Pounce sequence (Section 10 - when user clicks)
    if (this.sp.jumping) {
      this.sp.jumpT += dt / this.sp.jumpDur;
      const t = Math.min(1, this.sp.jumpT);
      // Ease-in-out quad
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const oldX = this.sp.x;
      const oldY = this.sp.y;
      this.sp.x = this.sp.jumpStart.x + (this.sp.jumpEnd.x - this.sp.jumpStart.x) * ease;
      this.sp.y = this.sp.jumpStart.y + (this.sp.jumpEnd.y - this.sp.jumpStart.y) * ease;
      this.sp.vx = (this.sp.x - oldX) / dt;
      this.sp.vy = (this.sp.y - oldY) / dt;
      this.sp.speed = Math.hypot(this.sp.vx, this.sp.vy);
      this.sp.jumpH = Math.sin(Math.PI * t) * this.sp.jumpMaxH;
      this.snapFeetToRest();

      if (t >= 1) {
        this.sp.jumping = false;
        this.sp.jumpH = 0;
        this.sp.lt = 1;
        this.vibrateWebAt(this.sp.x, this.sp.y, 140, 3);

        // Spin nearby objects by +-16..28 deg
        for (const item of this.wobbleItems) {
          const cx = item.rect.left + item.rect.width * 0.5;
          const cy = item.rect.top + item.rect.height * 0.5;
          if (Math.hypot(cx - this.sp.x, cy - this.sp.y) < 340 * this.K + 120) {
            const spin = (16 + Math.random() * 12) * (Math.random() < 0.5 ? -1 : 1);
            item.va += spin * 0.6;
          }
        }

        // Check if fly is within 55*flySize of mouth (heading * 360K)
        const mouthX = this.sp.x + Math.cos(this.sp.heading) * 300 * this.K;
        const mouthY = this.sp.y + Math.sin(this.sp.heading) * 300 * this.K;
        if (
          this.pointer.active &&
          !this.pointer.overControl &&
          Math.hypot(this.fly.x - mouthX, this.fly.y - mouthY) < 68 * this.flySize
        ) {
          this.fly.caught = 3 + Math.random() * 1.2;
          this.fly.caughtDur = this.fly.caught;
          this.fly.cocoonProgress = 0;
          this.fly.cocoonX = this.fly.x;
          this.fly.cocoonY = this.fly.y;
          this.fly.cocoonHeading = this.fly.heading;
        }

        // Resume foraging from current position after jump
        if (this.forage.carryingHoney) {
          this.startNextForageToHive();
        } else {
          this.startNextForageToPlatform();
        }
      }
      return;
    }

    // 3. Autonomous Foraging Flight Cycle (Platform <-> Central 'ecommarketdata' Hive)
    if (!this.forage.initialized) {
      this.startNextForageToPlatform();
    }
    this.updateAutonomousForaging(dt);

    // Aerodynamic banking/yaw gimbal sway (snappier servo damping)
    const targetSway = Math.max(-0.24, Math.min(0.24, -this.sp.angVel * 0.055));
    this.sp.sway += (targetSway - this.sp.sway) * (1 - Math.exp(-12 * dt));

    // 4. Compact Retractable Landing Gear / Micro-Manipulator Struts
    // Tucks closely under chassis in flight (0.38) so silhouette is a sleek Cyber-Bee Drone, not a sprawling spider
    const flightRetract = this.sp.speed > 55 ? 0.36 : 0.48;
    const sleepTuck = flightRetract * (1 - 0.32 * this.sp.sleep);
    const groupStepping = [false, false];
    for (const leg of this.legs) {
      if (leg.stepT < 1) groupStepping[leg.group] = true;
    }

    for (const leg of this.legs) {
      if (leg.stepT < 1) {
        leg.stepT += dt / leg.stepDur;
        if (leg.stepT >= 1) {
          leg.stepT = 1;
          leg.foot.x = leg.stepGoal.x;
          leg.foot.y = leg.stepGoal.y;
        } else {
          const ease = 1 - Math.pow(1 - leg.stepT, 3);
          leg.foot.x = leg.stepStart.x + (leg.stepGoal.x - leg.stepStart.x) * ease;
          leg.foot.y = leg.stepStart.y + (leg.stepGoal.y - leg.stepStart.y) * ease;
        }
        continue;
      }

      // Check step trigger for compact retracted landing struts
      const tuckedRestX = leg.hip.x + (leg.rest.x - leg.hip.x) * sleepTuck;
      const tuckedRestY = leg.hip.y + (leg.rest.y - leg.hip.y) * sleepTuck;
      const worldRest = this.bodyToWorld(tuckedRestX, tuckedRestY);
      const targetX = worldRest.x + this.sp.vx * 0.06;
      const targetY = worldRest.y + this.sp.vy * 0.06;

      const distToTarget = Math.hypot(leg.foot.x - targetX, leg.foot.y - targetY);
      const baseTrigger = (leg.index === 0 ? 0.7 : 1) * 130 * this.K;
      const triggerDist = this.sp.speed < 18 ? baseTrigger * 0.3 : baseTrigger;

      const worldHip = this.bodyToWorld(leg.hip.x, leg.hip.y);
      const hipToFootDist = Math.hypot(leg.foot.x - worldHip.x, leg.foot.y - worldHip.y);
      const maxReach = (leg.a + leg.b) * this.K;
      const overextended = hipToFootDist > 0.98 * maxReach;

      // Check if front foot fell behind hip in body space
      const footBody = this.worldToBody(leg.foot.x, leg.foot.y);
      const frontBehindHip = leg.index === 0 && footBody.x < leg.hip.x - 10;

      const needsStep = distToTarget > triggerDist || overextended || frontBehindHip;
      const otherGroupActive = groupStepping[1 - leg.group];
      const urgent = overextended || distToTarget > 1.6 * triggerDist;

      if (needsStep && (!otherGroupActive || urgent)) {
        leg.stepStart.x = leg.foot.x;
        leg.stepStart.y = leg.foot.y;
        leg.stepGoal.x = targetX;
        leg.stepGoal.y = targetY;
        leg.stepDur = Math.max(0.055, Math.min(0.15, 0.15 - this.sp.speed / 3200));
        leg.stepT = 0;
        groupStepping[leg.group] = true;
      }
    }
  }

  private pickRandomPlatformPoint(): Vec2 {
    const validIndices: number[] = [];
    for (let i = 0; i < this.wobbleItems.length; i++) {
      const r = this.wobbleItems[i].rect;
      if (r.width > 20 && r.height > 20) {
        validIndices.push(i);
      }
    }

    if (validIndices.length === 0) {
      // Fallback corner positions if DOM rects aren't ready yet
      const fallbacks: Vec2[] = [
        { x: this.W * 0.16, y: this.H * 0.34 },
        { x: this.W * 0.84, y: this.H * 0.32 },
        { x: this.W * 0.76, y: this.H * 0.72 },
        { x: this.W * 0.5, y: this.H * 0.88 },
      ];
      const idx = Math.floor(Math.random() * fallbacks.length);
      this.forage.targetPlatformIdx = idx;
      this.forage.lastPlatformIdx = idx;
      return fallbacks[idx];
    }

    let candidates = validIndices.filter((idx) => idx !== this.forage.lastPlatformIdx);
    if (candidates.length === 0) candidates = validIndices;

    const chosenIdx = candidates[Math.floor(Math.random() * candidates.length)];
    this.forage.targetPlatformIdx = chosenIdx;
    this.forage.lastPlatformIdx = chosenIdx;

    const item = this.wobbleItems[chosenIdx];
    const cx = item.rect.left + item.rect.width * (0.36 + Math.random() * 0.28) + item.ox;
    const cy = item.rect.top + item.rect.height * (0.36 + Math.random() * 0.28) + item.oy;
    return {
      x: Math.max(60, Math.min(this.W - 60, cx)),
      y: Math.max(60, Math.min(this.H - 60, cy)),
    };
  }

  private pickRandomHivePoint(): Vec2 {
    const foundEl = document.querySelector<HTMLElement>('.frame .found');
    if (foundEl) {
      const r = foundEl.getBoundingClientRect();
      if (r.width > 40 && r.height > 20) {
        return {
          x: r.left + r.width * (0.28 + Math.random() * 0.44),
          y: r.top + r.height * (0.32 + Math.random() * 0.36),
        };
      }
    }
    return {
      x: this.W * (0.38 + Math.random() * 0.24),
      y: this.H * (0.44 + Math.random() * 0.1),
    };
  }

  private planRandomBezierLeg(from: Vec2, to: Vec2) {
    this.forage.p0 = { x: from.x, y: from.y };
    this.forage.p3 = { x: to.x, y: to.y };

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.max(80, Math.hypot(dx, dy));
    const ux = dx / dist;
    const uy = dy / dist;
    const nx = -uy;
    const ny = ux;

    // Compact, organic curved flight path with shorter detour distance
    const styleRoll = Math.random();
    let offset1: number;
    let offset2: number;

    if (styleRoll < 0.5) {
      // Gentle C-arc
      const side = Math.random() < 0.5 ? 1 : -1;
      offset1 = side * dist * (0.10 + Math.random() * 0.12);
      offset2 = side * dist * (0.08 + Math.random() * 0.12);
    } else if (styleRoll < 0.85) {
      // Subtle S-curve
      const side = Math.random() < 0.5 ? 1 : -1;
      offset1 = side * dist * (0.11 + Math.random() * 0.12);
      offset2 = -side * dist * (0.09 + Math.random() * 0.11);
    } else {
      // Slight asymmetric bank
      const side = Math.random() < 0.5 ? 1 : -1;
      offset1 = side * dist * (0.15 + Math.random() * 0.10);
      offset2 = side * dist * (0.05 + Math.random() * 0.08);
    }

    const along1 = 0.28 + Math.random() * 0.14;
    const along2 = 0.64 + Math.random() * 0.14;

    const clampX = (x: number) => Math.max(65, Math.min(this.W - 65, x));
    const clampY = (y: number) => Math.max(65, Math.min(this.H - 65, y));

    this.forage.c1 = {
      x: clampX(from.x + dx * along1 + nx * offset1),
      y: clampY(from.y + dy * along1 + ny * offset1),
    };
    this.forage.c2 = {
      x: clampX(from.x + dx * along2 + nx * offset2),
      y: clampY(from.y + dy * along2 + ny * offset2),
    };

    this.forage.legT = 0;
    const cruiseSpeed = 340 + Math.random() * 110;
    this.forage.legDur = Math.max(1.1, Math.min(2.2, (dist * 1.06) / cruiseSpeed));
    this.forage.wavePhase = Math.random() * Math.PI * 2;
    this.forage.waveFreq = (1.2 + Math.random() * 1.4) * Math.PI;
    this.forage.waveAmp = (5 + Math.random() * 9) * (Math.random() < 0.5 ? 1 : -1);
  }

  private startNextForageToPlatform() {
    this.forage.initialized = true;
    this.forage.phase = 'TO_PLATFORM';
    this.forage.carryingHoney = false;
    const dest = this.pickRandomPlatformPoint();
    this.planRandomBezierLeg({ x: this.sp.x, y: this.sp.y }, dest);
  }

  private startNextForageToHive() {
    this.forage.initialized = true;
    this.forage.phase = 'TO_HIVE';
    this.forage.carryingHoney = true;
    const dest = this.pickRandomHivePoint();
    this.planRandomBezierLeg({ x: this.sp.x, y: this.sp.y }, dest);
  }

  private evalBezierPoint(u: number): Vec2 {
    const inv = 1 - u;
    const b0 = inv * inv * inv;
    const b1 = 3 * inv * inv * u;
    const b2 = 3 * inv * u * u;
    const b3 = u * u * u;
    const { p0, c1, c2, p3 } = this.forage;

    const baseX = b0 * p0.x + b1 * c1.x + b2 * c2.x + b3 * p3.x;
    const baseY = b0 * p0.y + b1 * c1.y + b2 * c2.y + b3 * p3.y;

    // Superimposed organic flight weave that tapers to 0 at both endpoints (sin(pi * u))
    const envelope = Math.sin(Math.PI * u);
    const wave = Math.sin(u * this.forage.waveFreq + this.forage.wavePhase) * this.forage.waveAmp * envelope;
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;

    return {
      x: baseX + nx * wave,
      y: baseY + ny * wave,
    };
  }

  private updateAutonomousForaging(dt: number) {
    const f = this.forage;

    if (f.phase === 'TO_PLATFORM' || f.phase === 'TO_HIVE') {
      f.legT = Math.min(1, f.legT + dt / f.legDur);
      // Smooth ease-in-out flight velocity profile (accelerates smoothly from platform, cruises, decelerates into target)
      const u = f.legT;
      const uEase = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      // Blend 65% constant cruise + 35% ease-in-out so it never stalls mid-flight
      const s = 0.65 * u + 0.35 * uEase;

      const nextPos = this.evalBezierPoint(s);
      const lookAheadPos = this.evalBezierPoint(Math.min(1, s + 0.025));

      const oldX = this.sp.x;
      const oldY = this.sp.y;

      const hoverBuzzX = Math.sin(78 * this.clock) * 0.38;
      const hoverBuzzY = Math.cos(92 * this.clock) * 0.38;

      this.sp.x = nextPos.x + hoverBuzzX;
      this.sp.y = nextPos.y + hoverBuzzY;
      this.sp.vx = (this.sp.x - oldX) / dt;
      this.sp.vy = (this.sp.y - oldY) / dt;
      this.sp.speed = Math.hypot(this.sp.vx, this.sp.vy);

      const tdx = lookAheadPos.x - nextPos.x;
      const tdy = lookAheadPos.y - nextPos.y;
      if (Math.hypot(tdx, tdy) > 0.2) {
        const targetHeading = Math.atan2(tdy, tdx);
        const diff = Math.atan2(
          Math.sin(targetHeading - this.sp.heading),
          Math.cos(targetHeading - this.sp.heading)
        );
        const stepAngle = diff * (1 - Math.exp(-10 * dt));
        this.sp.angVel = stepAngle / dt;
        this.sp.heading += stepAngle;
      } else {
        this.sp.angVel = 0;
      }

      if (f.legT >= 1) {
        if (f.phase === 'TO_PLATFORM') {
          // Arrived at Platform -> hover & harvest honey!
          f.phase = 'HARVESTING';
          f.dwellTimer = 0.65 + Math.random() * 0.45;
          f.dwellAnchor = { x: this.sp.x, y: this.sp.y };
          this.sp.lt = 0.7;

          // Gently rock the 3D platform emblem as the bee lands to harvest
          const item = this.wobbleItems[f.targetPlatformIdx];
          if (item) {
            item.va += (Math.random() < 0.5 ? 1 : -1) * (12 + Math.random() * 8);
          }
        } else {
          // Arrived at central 'ecommarketdata' -> deposit harvested honey!
          f.phase = 'DEPOSITING';
          f.dwellTimer = 0.55 + Math.random() * 0.4;
          f.dwellAnchor = { x: this.sp.x, y: this.sp.y };
          this.sp.lt = 0.75;
          // Deposit 1-2 subtle golden honey drops onto ecommarketdata
          const spPos = this.getSpinneretWorld();
          this.vibrateWebAt(spPos.x, spPos.y, 45, 0.9);
        }
      }
    } else if (f.phase === 'HARVESTING') {
      f.dwellTimer -= dt;
      // Lively micro-figure-8 hover while extracting honey from the 3D Platform logo
      const orbitX = Math.sin(this.clock * 7.5) * 7;
      const orbitY = Math.sin(this.clock * 15.0) * 4;
      const oldX = this.sp.x;
      const oldY = this.sp.y;
      this.sp.x = f.dwellAnchor.x + orbitX;
      this.sp.y = f.dwellAnchor.y + orbitY;
      this.sp.vx = (this.sp.x - oldX) / dt;
      this.sp.vy = (this.sp.y - oldY) / dt;
      this.sp.speed = Math.hypot(this.sp.vx, this.sp.vy);
      this.sp.angVel = Math.cos(this.clock * 7.5) * 0.8;
      this.sp.heading += this.sp.angVel * dt * 0.25;

      if (f.dwellTimer <= 0) {
        // Honey sac is now full! Start flying back to ecommarketdata with sparse, natural drips
        this.spillCooldown = 0.14 + Math.random() * 0.18;
        this.spillBurstRemaining = 1;
        this.spillBurstSize = 3.2 + Math.random() * 1.8;
        this.startNextForageToHive();
      }
    } else if (f.phase === 'DEPOSITING') {
      f.dwellTimer -= dt;
      const orbitX = Math.cos(this.clock * 6.5) * 5;
      const orbitY = Math.sin(this.clock * 13.0) * 3.5;
      const oldX = this.sp.x;
      const oldY = this.sp.y;
      this.sp.x = f.dwellAnchor.x + orbitX;
      this.sp.y = f.dwellAnchor.y + orbitY;
      this.sp.vx = (this.sp.x - oldX) / dt;
      this.sp.vy = (this.sp.y - oldY) / dt;
      this.sp.speed = Math.hypot(this.sp.vx, this.sp.vy);
      this.sp.angVel = 0;

      if (f.dwellTimer <= 0) {
        // Finished depositing at ecommarketdata -> fly out to next random Platform!
        this.startNextForageToPlatform();
      }
    }
  }

  private updateRestAndSleep(dt: number) {
    // Since the Cyber-Bee continuously forages, keep it awake and alert
    this.sp.qt = Math.max(0, this.sp.qt - 6 * dt);
    this.sp.sleep = Math.max(0, this.sp.sleep - 6 * dt);
    this.sp.restTimer = 0;
  }

  // ============================================================================
  // 5. Silk Threads, Anchoring & Dew Drops (Section 8)
  // ============================================================================

  private getSpinneretWorld(): Vec2 {
    // Spinneret is at (627, 150) in sprite space -> body space (-450, 0) rotated around waist (-52, 0) by sway
    const waistX = -52;
    const dx = -450 - waistX;
    const bx = waistX + dx * Math.cos(this.sp.sway);
    const by = dx * Math.sin(this.sp.sway);
    return this.bodyToWorld(bx, by);
  }

  private createThread(a: Vec2, b: Vec2, thickness: number, withDrops: boolean): SilkThread {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const segs = 12;
    // Honey strands sag slightly more than spider silk for a syrupy cartoon feel
    const sagFactor = 1.028 + Math.random() * 0.022;
    const segLen = (dist / segs) * sagFactor;
    const pts: RopePoint[] = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const x = a.x + (b.x - a.x) * u;
      const y = a.y + (b.y - a.y) * u;
      pts.push({ x, y, ox: x, oy: y });
    }

    const drops: DewDrop[] = [];
    if (withDrops && dist > 40) {
      const count = Math.max(1, Math.floor((dist / 62) * (0.55 + Math.random() * 0.85)));
      for (let i = 0; i < count; i++) {
        drops.push({
          u: 0.14 + Math.random() * 0.72,
          du: 0,
          r: 4.2 + Math.random() * 5.2,
          sliding: false,
        });
      }
    }

    // Hanging cartoon honey drips along the strand
    const fluff: FluffClump[] = [];
    if (dist > 50) {
      const dripCount = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < dripCount; i++) {
        fluff.push({
          u: 0.18 + Math.random() * 0.64,
          type: Math.random() < 0.5 ? 'dust' : 'fibres',
          seed: 6 + Math.floor(Math.random() * 11),
        });
      }
    }

    return {
      pts,
      segLen,
      thickness,
      phase: Math.random() * Math.PI * 2,
      born: this.clock,
      drops,
      fluff,
      hairsSeed: Math.floor(Math.random() * 100000),
    };
  }

  private rollRandomHoneySize(): { r: number; isBigStreak: boolean; isTiny: boolean } {
    const roll = Math.random();
    if (roll < 0.45) {
      // 45%: Tiny delicate honey micro-droplets ("lúc nhỏ")
      return { r: 0.9 + Math.random() * 1.15, isBigStreak: false, isTiny: true };
    } else if (roll < 0.78) {
      // 33%: Medium organic honey drops
      return { r: 2.1 + Math.random() * 1.7, isBigStreak: false, isTiny: false };
    } else {
      // 22%: Heavy dripping honey blob ("lúc vệt to") that will ooze downward after landing
      return { r: 4.0 + Math.random() * 2.5, isBigStreak: true, isTiny: false };
    }
  }

  private spawnHoneySplat(
    x: number,
    y: number,
    baseR = 0,
    stretch = 0,
    dirAngle?: number,
    initVx?: number,
    initVy?: number,
    airborneDur?: number
  ) {
    let r = baseR;
    let isBigStreak = r >= 3.8;
    let isTiny = r > 0 && r < 2.0;

    if (r <= 0) {
      const rolled = this.rollRandomHoneySize();
      r = rolled.r;
      isBigStreak = rolled.isBigStreak;
      isTiny = rolled.isTiny;
    }

    const satellites: SplatSatellite[] = [];

    if (isBigStreak) {
      // Add 1-2tiny splashed micro-beads that scatter around when the heavy drop lands
      const speckCount = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < speckCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = r * (1.2 + Math.random() * 1.1);
        satellites.push({
          ox: Math.cos(ang) * dist,
          oy: Math.sin(ang) * dist,
          r: 0.75 + Math.random() * 1.1,
        });
      }
    } else if (!isTiny && Math.random() < 0.5) {
      const ang = Math.random() * Math.PI * 2;
      const dist = r * (1.25 + Math.random() * 0.85);
      satellites.push({
        ox: Math.cos(ang) * dist,
        oy: Math.sin(ang) * dist,
        r: r * (0.25 + Math.random() * 0.2),
      });
    }

    const rxFactor = isBigStreak
      ? 1.05 + Math.random() * 0.35 + stretch * 0.2
      : isTiny
        ? 0.92 + Math.random() * 0.2
        : 0.95 + Math.random() * 0.3 + stretch * 0.18;
    const ryFactor = isBigStreak
      ? 0.88 + Math.random() * 0.28
      : isTiny
        ? 0.88 + Math.random() * 0.2
        : 0.82 + Math.random() * 0.24;

    const rot =
      dirAngle !== undefined && stretch > 0.15
        ? dirAngle + (Math.random() - 0.5) * 0.45
        : Math.random() * Math.PI * 2;

    // Physical motion parameters (compact airborne arc + short viscous surface ooze):
    const maxAirTime =
      airborneDur !== undefined ? airborneDur : 0.08 + Math.random() * 0.11;
    const vx =
      initVx !== undefined
        ? initVx
        : this.sp.vx * (0.10 + Math.random() * 0.12) + (Math.random() - 0.5) * 32;
    const vy =
      initVy !== undefined
        ? initVy
        : this.sp.vy * (0.10 + Math.random() * 0.12) + 16 + Math.random() * 28;

    // 2. Surface viscous ooze speed: subtle, short downward honey slide after landing
    const oozeVy = isBigStreak
      ? 6 + Math.random() * 8
      : !isTiny && Math.random() < 0.5
        ? 2.5 + Math.random() * 5
        : 0;

    this.splats.push({
      x,
      y,
      landX: x,
      landY: y,
      vx,
      vy,
      oozeVy,
      airTime: 0,
      maxAirTime,
      r,
      rx: r * rxFactor,
      ry: r * ryFactor,
      rot,
      fallingOff: false,
      born: this.clock,
      maxLife: (isBigStreak ? 4.6 : 3.8) + Math.random() * 0.9,
      satellites,
    });
  }

  private pinLiveThread(pinPt: Vec2) {
    // Spill a single honey drop at anchor point
    const mainR = 3.0 + Math.random() * 2.0;
    this.spawnHoneySplat(pinPt.x, pinPt.y, mainR, 0.18, this.sp.heading);
    this.liveAnchor = { x: pinPt.x, y: pinPt.y };
  }

  private vibrateThread(_th: SilkThread, _strength: number) {
    // No threads
  }

  private vibrateWebAt(x: number, y: number, _radius: number, strength: number) {
    // Fling 1-2 subtle honey droplets outward when depositing or pouncing
    const count = Math.min(2, Math.max(1, Math.round(strength * 1.1)));
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const flingSpeed = (24 + Math.random() * 42) * Math.min(1.2, strength * 0.55);
      const splashR =
        i === 0
          ? 3.4 + Math.random() * 1.8
          : 1.2 + Math.random() * 1.2;
      this.spawnHoneySplat(
        x + Math.cos(ang) * 4,
        y + Math.sin(ang) * 4,
        splashR,
        0.2,
        ang,
        Math.cos(ang) * flingSpeed,
        Math.sin(ang) * flingSpeed + 12,
        0.09 + Math.random() * 0.09
      );
    }
  }

  private updateAnchoringAndSilk(dt: number) {
    const spPos = this.getSpinneretWorld();
    this.turnSpillCooldown = Math.max(0, this.turnSpillCooldown - dt);

    // Check if clearing honey drops
    if (this.clearingWeb) {
      this.clearAlpha -= 2.6 * dt;
      if (this.clearAlpha <= 0) {
        this.threads = [];
        this.usedAnchors = [];
        this.splats = [];
        this.fallingDrops = [];
        this.clearingWeb = false;
        this.clearAlpha = 1;
        this.liveAnchor = { x: spPos.x, y: spPos.y };
      }
    } else if (!this.sp.intro && (this.forage.carryingHoney || this.sp.jumping)) {
      // Only spill/drip honey sparsely when carrying harvested honey from a Platform back to 'ecommarketdata'
      // 1. Centrifugal Turn Slosh: occasional 1-2 drop fling on sharp turns
      if (
        Math.abs(this.sp.angVel) > 2.2 &&
        this.sp.speed > 95 &&
        this.turnSpillCooldown <= 0
      ) {
        this.turnSpillCooldown = 0.55 + Math.random() * 0.45;
        const outwardAngle =
          this.sp.heading + (this.sp.angVel > 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
        const flingCount = 1 + (Math.random() < 0.35 ? 1 : 0);
        for (let i = 0; i < flingCount; i++) {
          const spread = outwardAngle + (Math.random() - 0.5) * 0.45;
          const speed = 28 + Math.random() * 42 + i * 14;
          const r = i === 0 ? 3.2 + Math.random() * 1.8 : 1.1 + Math.random() * 1.3;
          this.spawnHoneySplat(
            spPos.x,
            spPos.y,
            r,
            0.22,
            spread,
            this.sp.vx * 0.12 + Math.cos(spread) * speed,
            this.sp.vy * 0.12 + Math.sin(spread) * speed + 14,
            0.09 + Math.random() * 0.10
          );
        }
      }

      // 2. Sparse, organic honey drips while flying from Platform -> Central 'ecommarketdata'
      if (this.sp.speed > 18 || this.sp.jumping) {
        this.spillCooldown -= dt * (this.sp.jumping ? 1.4 : 0.85 + this.sp.speed / 520);
        if (this.spillCooldown <= 0) {
          if (this.spillBurstRemaining <= 0) {
            // 1 to 2 drops per drip event, followed by a clean pause
            this.spillBurstRemaining = 1 + (Math.random() < 0.32 ? 1 : 0);
            this.spillBurstSize =
              Math.random() < 0.38
                ? 3.8 + Math.random() * 2.0 // Heavy dripping blob ("lúc vệt to")
                : 1.5 + Math.random() * 1.6; // Delicate small/medium drop ("lúc nhỏ")
          }

          // Emit one drop with compact lateral/downward motion
          const perpAngle = this.sp.heading + (Math.random() < 0.5 ? 1 : -1) * (Math.PI * 0.5);
          const lateralKick = (Math.random() - 0.5) * 36;
          const backSpray = -10 - Math.random() * 20;
          const vx =
            this.sp.vx * 0.12 +
            Math.cos(this.sp.heading) * backSpray +
            Math.cos(perpAngle) * lateralKick;
          const vy =
            this.sp.vy * 0.12 +
            Math.sin(this.sp.heading) * backSpray +
            Math.sin(perpAngle) * lateralKick +
            18 +
            Math.random() * 26;

          this.spawnHoneySplat(
            spPos.x + (Math.random() - 0.5) * 5,
            spPos.y + (Math.random() - 0.5) * 5,
            this.spillBurstSize,
            0.2,
            this.sp.heading,
            vx,
            vy,
            0.08 + Math.random() * 0.11
          );

          // Subsequent drop in a 2-drop pair tapers down into a tiny satellite droplet
          this.spillBurstSize = Math.max(0.85, this.spillBurstSize * (0.48 + Math.random() * 0.18));
          this.spillBurstRemaining--;

          if (this.spillBurstRemaining > 0) {
            this.spillCooldown = 0.06 + Math.random() * 0.06;
          } else {
            // Longer pause between drips so only a few tasteful drops fall per trip
            const pauseRoll = Math.random();
            this.spillCooldown =
              pauseRoll < 0.45
                ? 0.32 + Math.random() * 0.22
                : pauseRoll < 0.85
                  ? 0.52 + Math.random() * 0.26
                  : 0.75 + Math.random() * 0.3;
          }
        }
      }
    }

    // Update purely vertical falling honey drops (gravity) & landing on object/letter silhouettes
    const mData = this.maskCtx;
    for (let i = this.fallingDrops.length - 1; i >= 0; i--) {
      const fd = this.fallingDrops[i];
      fd.vy += 820 * dt;
      fd.x += fd.vx * dt;
      fd.y += fd.vy * dt;

      if (fd.y > this.H + 30 || this.clock - fd.born >= fd.maxLife) {
        this.fallingDrops.splice(i, 1);
        continue;
      }

      // Check if drop lands on an object or letter silhouette after falling > 12px
      if (fd.y - fd.startY > 12) {
        const mx = Math.round(fd.x * this.dpr);
        const my = Math.round(fd.y * this.dpr);
        if (mx >= 0 && my >= 0 && mx < this.maskCanvas.width && my < this.maskCanvas.height) {
          const pixel = mData.getImageData(mx, my, 1, 1).data;
          if (pixel[3] > 100) {
            this.spawnHoneySplat(fd.x, fd.y, fd.r * 1.15, 0.2, Math.PI * 0.5, 0, 0, 0);
            this.fallingDrops.splice(i, 1);
          }
        }
      }
    }

    // Update honey splats:
    // Phase 1: Airborne arcing/falling motion (airTime < maxAirTime)
    // Phase 2: Viscous downward honey ooze / dripping streak on the surface (oozeVy > 0)
    for (let i = this.splats.length - 1; i >= 0; i--) {
      const sp = this.splats[i];
      if (this.clock - sp.born >= sp.maxLife) {
        this.splats.splice(i, 1);
        continue;
      }
      if (sp.fallingOff) {
        sp.vy += 980 * dt;
        sp.y += sp.vy * dt;
        if (sp.y > this.H + 30) {
          this.splats.splice(i, 1);
        }
        continue;
      }

      if (sp.airTime < sp.maxAirTime) {
        sp.airTime = Math.min(sp.maxAirTime, sp.airTime + dt);
        // Gravity pull + air resistance while falling from the bee
        sp.vy += 460 * dt;
        const drag = Math.exp(-3.2 * dt);
        sp.vx *= drag;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.landX = sp.x;
        sp.landY = sp.y;
      } else if (sp.oozeVy > 0.25) {
        // Viscous downward honey creep after landing (creates a live dripping trail!)
        sp.y += sp.oozeVy * dt;
        sp.oozeVy *= Math.exp(-0.92 * dt);
      }
    }
  }

  private getPointOnRope(pts: RopePoint[], u: number): Vec2 {
    const n = pts.length - 1;
    const f = Math.max(0, Math.min(n - 0.0001, u * n));
    const idx = Math.floor(f);
    const frac = f - idx;
    const p0 = pts[idx];
    const p1 = pts[idx + 1];
    return {
      x: p0.x + (p1.x - p0.x) * frac,
      y: p0.y + (p1.y - p0.y) * frac,
    };
  }

  // ============================================================================
  // 6. Coordinate Transforms & Two-Bone IK (Sections 5 & 6)
  // ============================================================================

  private bodyToWorld(bx: number, by: number): Vec2 {
    const c = Math.cos(this.sp.heading);
    const s = Math.sin(this.sp.heading);
    return {
      x: this.sp.x + (bx * c - by * s) * this.K,
      y: this.sp.y + (bx * s + by * c) * this.K,
    };
  }

  private worldToBody(wx: number, wy: number): Vec2 {
    const dx = (wx - this.sp.x) / this.K;
    const dy = (wy - this.sp.y) / this.K;
    const c = Math.cos(this.sp.heading);
    const s = Math.sin(this.sp.heading);
    return {
      x: dx * c + dy * s,
      y: -dx * s + dy * c,
    };
  }

  // ============================================================================
  // 7. Rendering (Section 11 Draw Order: Shadows -> Threads/Drops -> Spider -> Z -> Fly/Cocoon)
  // ============================================================================

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.dpr, this.dpr);

    // 1. Web shadows (masked by anchor silhouettes so they fall ONLY on letters and objects)
    this.drawWebShadows(ctx);

    // 2. Threads, splats and drops
    this.drawThreadsAndDrops(ctx);

    // 3. The spider through its shadowed offscreen
    this.drawSpider(ctx);

    // 4. The z letters (when sleeping)
    this.drawSleepZ(ctx);

    // 5. The fly, and the cocoon when it is caught
    this.drawFlyAndCocoon(ctx);

    ctx.restore();
  }

  private drawWebShadows(_mainCtx: CanvasRenderingContext2D) {
    // No silk/honey strings are drawn; each realistic liquid honey drop renders its own warm amber caustic shadow
  }

  private computeHoneyAlpha(born: number, maxLife: number): number {
    const age = Math.max(0, this.clock - born);
    if (age >= maxLife) return 0;
    // Smooth 0.14s ease-in pop when drop first forms
    const popT = Math.min(1, age / 0.14);
    const popIn = popT * popT * (3 - 2 * popT);

    // Hold full gloss for first 20% of life, then dissolve smoothly over the remaining 80%
    const fadeStart = maxLife * 0.2;
    if (age <= fadeStart) return popIn * this.clearAlpha;

    const t = Math.min(1, (age - fadeStart) / Math.max(0.1, maxLife - fadeStart));
    const rem = 1 - t;
    // C2-continuous smoothstep * linear tail so slope at both t=0 and t=1 is zero (zero pop/snap at disappearance)
    const smoothFade = rem * rem * (3 - 2 * rem) * rem;
    return popIn * smoothFade * this.clearAlpha;
  }

  private drawThreadsAndDrops(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // 1. Spilled & Oozing Liquid Honey Droplets (Airborne Arc -> Surface Splash -> Viscous Downward Drip)
    for (const sp of this.splats) {
      const alpha = this.computeHoneyAlpha(sp.born, sp.maxLife);
      if (alpha <= 0.0015) continue;

      const isAirborne = sp.airTime < sp.maxAirTime && sp.maxAirTime > 0;

      if (isAirborne) {
        // Phase A: Airborne honey droplet falling/arcing off the bee in motion
        const z = 1 - sp.airTime / sp.maxAirTime; // 1 at bee belly -> 0 on surface
        const velAngle = Math.atan2(sp.vy, sp.vx);
        const speedMag = Math.hypot(sp.vx, sp.vy);
        const stretch = Math.min(1.65, 1 + speedMag / 260);
        const airScale = 1 + 0.28 * z;
        const w = sp.r * 2.35 * stretch * airScale;
        const h = sp.r * 2.15 * airScale;

        ctx.save();
        // Soft ground shadow below the airborne drop that converges as it lands
        ctx.globalAlpha = alpha * 0.26 * (1 - 0.4 * z);
        ctx.fillStyle = 'rgba(180, 83, 9, 0.55)';
        ctx.beginPath();
        ctx.ellipse(
          sp.x + z * 5,
          sp.y + z * 14,
          sp.r * 0.9,
          sp.r * 0.6,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Trailing micro-bead behind the falling drop for motion streak feel
        ctx.globalAlpha = alpha * 0.85;
        if (sp.r > 1.8) {
          const tailDist = sp.r * 1.45 * stretch;
          const tailSz = sp.r * 1.15;
          ctx.drawImage(
            this.dewSprite,
            sp.x - Math.cos(velAngle) * tailDist - tailSz * 0.5,
            sp.y - Math.sin(velAngle) * tailDist - tailSz * 0.5,
            tailSz,
            tailSz
          );
        }

        // Main airborne honey drop oriented along its velocity vector
        ctx.translate(sp.x, sp.y);
        ctx.rotate(velAngle);
        ctx.drawImage(this.dewSprite, -w * 0.5, -h * 0.5, w, h);
        ctx.restore();
      } else {
        // Phase B: Landed honey drop with viscous downward oozing drip trail
        ctx.save();

        const oozeDist = sp.y - sp.landY;
        if (oozeDist > 1.2) {
          // Draw tapering viscous honey drip trail from (landX, landY) down to current (x, y)
          // Scale neck alpha slightly so overlapping stamps fade out just as smoothly as single drops
          ctx.globalAlpha = alpha * (0.55 + 0.35 * alpha);
          const steps = Math.min(6, Math.max(2, Math.ceil(oozeDist / Math.max(2.6, sp.r * 0.75))));
          for (let s = 0; s < steps; s++) {
            const u = s / steps; // 0 at top origin -> 1 near bottom bulb
            const tx = sp.landX + (sp.x - sp.landX) * u;
            const ty = sp.landY + oozeDist * u;
            // Taper: small bead at top origin, thinner neck in the middle, swelling into the bottom bulb
            const neckProfile = u < 0.25 ? 0.52 - u * 0.4 : 0.38 + (u - 0.25) * 0.62;
            const beadW = sp.r * 2.25 * neckProfile;
            const beadH = beadW * 1.25;
            ctx.drawImage(this.dewSprite, tx - beadW * 0.5, ty - beadH * 0.5, beadW, beadH);
          }
        }

        ctx.globalAlpha = alpha;
        ctx.translate(sp.x, sp.y);

        // Draw tiny satellite micro-droplets around the landing spot
        for (const sat of sp.satellites) {
          const satSize = sat.r * 2.35;
          ctx.drawImage(
            this.dewSprite,
            sat.ox - satSize * 0.5,
            sat.oy - satSize * 0.5 - oozeDist * 0.65,
            satSize,
            satSize
          );
        }

        // Draw main refractive liquid honey bulb (elongates slightly while actively oozing down)
        const oozeStretch = 1 + Math.min(0.32, sp.oozeVy / 45);
        ctx.rotate(oozeDist > 2 ? 0 : sp.rot);
        const w = sp.rx * 2.35;
        const h = sp.ry * 2.35 * oozeStretch;
        ctx.drawImage(this.dewSprite, -w * 0.5, -h * 0.5, w, h);

        ctx.restore();
      }
    }

    // 2. Purely Vertical Falling Liquid Honey Droplets (when hovering or shaking)
    for (const fd of this.fallingDrops) {
      const alpha = this.computeHoneyAlpha(fd.born, fd.maxLife);
      if (alpha <= 0.0015) continue;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(fd.x, fd.y);
      const speedStretch = Math.min(1.35, 1 + Math.abs(fd.vy) / 1400);
      const w = fd.r * 2.2;
      const h = w * speedStretch;
      ctx.drawImage(this.dewSprite, -w * 0.5, -h * 0.5, w, h);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawSpider(mainCtx: CanvasRenderingContext2D) {
    // Render whole spider onto spiderOff, then composite with jump-height shadow onto mainCtx
    const octx = this.spiderOffCtx;
    const cw = this.spiderOff.width / this.dpr;
    const ch = this.spiderOff.height / this.dpr;
    const cx = cw * 0.5;
    const cy = ch * 0.5;

    octx.save();
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, this.spiderOff.width, this.spiderOff.height);
    octx.scale(this.dpr, this.dpr);
    octx.translate(cx, cy);

    // Sleep shrinks body by 3%; jump height scales spider by 1 + h/260
    const h = this.sp.jumpH;
    const sleepShrink = 1 - 0.03 * this.sp.sleep;
    const jumpScale = (1 + h / 260) * sleepShrink;
    octx.scale(jumpScale, jumpScale);
    octx.rotate(this.sp.heading);

    const K = this.K;
    const S = this.imgScale; // 560 / 1254

    // 1. Draw 6 compact CNC landing/manipulator struts (only 3 pairs, index 0..2, tucked tightly under chassis)
    const sortedLegs = [...this.legs]
      .filter((l) => l.index < 3)
      .sort((a, b) => b.index - a.index);

    for (const leg of sortedLegs) {
      const hip = leg.hip;
      const footBody = this.worldToBody(leg.foot.x, leg.foot.y);

      const outDir = leg.side;
      const sinStep = leg.stepT < 1 ? Math.sin(Math.PI * leg.stepT) : 0;
      const kneeLift = sinStep * 10;
      const footLift = sinStep * 8;

      // Keep landing struts compact and tucked close to the drone body
      const fx = hip.x + (footBody.x - hip.x) * 0.58;
      const fy = hip.y + (footBody.y - hip.y) * 0.54 + outDir * footLift;

      const dx = fx - hip.x;
      const dy = fy - hip.y;
      const a = leg.a * 0.56;
      const b = leg.b * 0.56;
      const d = Math.max(8, Math.min(a + b - 0.5, Math.hypot(dx, dy)));

      const cosAngle = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)));
      const baseAngle = Math.atan2(dy, dx);
      const bendAngle = Math.acos(cosAngle);

      const cand1Angle = baseAngle + bendAngle;
      const cand2Angle = baseAngle - bendAngle;
      const k1x = hip.x + Math.cos(cand1Angle) * a;
      const k1y = hip.y + Math.sin(cand1Angle) * a;
      const k2x = hip.x + Math.cos(cand2Angle) * a;
      const k2y = hip.y + Math.sin(cand2Angle) * a;

      const score1 = k1y * outDir + (leg.index <= 1 ? k1x * 0.25 : -k1x * 0.25);
      const score2 = k2y * outDir + (leg.index <= 1 ? k2x * 0.25 : -k2x * 0.25);
      const kx = score1 >= score2 ? k1x : k2x;
      const ky = (score1 >= score2 ? k1y : k2y) + outDir * kneeLift;

      const strip = leg.strip;
      const sw = strip.width;
      const sh = strip.height;
      const splitPx = sw * leg.split;
      const halfW = 30 * K;

      const femDx = (kx - hip.x) * K;
      const femDy = (ky - hip.y) * K;
      const femLen = Math.hypot(femDx, femDy);
      const femAng = Math.atan2(femDy, femDx);

      octx.save();
      octx.translate(hip.x * K, hip.y * K);
      octx.rotate(femAng);
      octx.drawImage(
        strip,
        0,
        0,
        Math.min(sw, splitPx * 1.12),
        sh,
        -femLen * 0.12,
        -halfW,
        femLen * 1.24,
        halfW * 2
      );
      octx.restore();

      const tibDx = (fx - kx) * K;
      const tibDy = (fy - ky) * K;
      const tibLen = Math.hypot(tibDx, tibDy);
      const tibAng = Math.atan2(tibDy, tibDx);

      octx.save();
      octx.translate(kx * K, ky * K);
      octx.rotate(tibAng);
      const srcStart = Math.max(0, splitPx * 0.88);
      octx.drawImage(
        strip,
        srcStart,
        0,
        sw - srcStart,
        sh,
        -tibLen * 0.12,
        -halfW,
        tibLen * 1.24,
        halfW * 2
      );
      octx.restore();
    }

    // Helper to draw a 560x560 sprite-space canvas in body space:
    const drawRigLayer = (img: HTMLCanvasElement) => {
      octx.save();
      octx.scale(K, K);
      octx.transform(0, -1 / S, 1 / S, 0, -600, 627);
      octx.drawImage(img, 0, 0);
      octx.restore();
    };

    // 2. Draw Armored Honey-Data Payload Pod (Abdomen) cleanly without heavy per-frame gradient effects
    octx.save();
    const waistX = -52 * K;
    octx.translate(waistX, 0);
    octx.rotate(this.sp.sway);
    const turbinePulse = 1 + Math.sin(this.sp.breathPhase * 2.5) * 0.012;
    const squashY = 1 - 0.06 * this.sp.lt;
    const squashX = 2 - squashY;
    octx.scale(turbinePulse * squashX, turbinePulse * squashY);
    octx.translate(-waistX, 0);
    drawRigLayer(this.abdomenPart);
    octx.restore();

    // 4. Draw Aero-Thorax & Optical Gimbal Head (or Holo-Visor HUD Matrix when resting)
    octx.save();
    octx.globalAlpha = 1 - 0.85 * this.sp.qt;
    drawRigLayer(this.headPart);
    octx.restore();

    if (this.sp.qt > 0.01) {
      const qt = this.sp.qt;
      const idleScale = 3.3 * (0.9 + 0.1 * qt);
      octx.save();
      octx.globalAlpha = qt;
      octx.scale(K, K);
      octx.translate(90, -3);
      octx.rotate(Math.PI / 2);
      octx.scale(idleScale, idleScale);
      octx.translate(-154, -150);
      octx.drawImage(this.idleHeadCanvas, 0, 0);

      // Digital HUD Shutter Blink on the 6 Optical Visor Eyes
      const blinkClosure =
        this.sp.sleep > 0.05
          ? Math.min(1, this.sp.sleep * 1.2)
          : this.sp.blinkT > 0
            ? Math.sin(Math.PI * this.sp.blinkT)
            : 0;

      if (blinkClosure > 0.01) {
        const eyes: [number, number, number][] = [
          [139, 158, 12.5],
          [170, 158, 12.5],
          [117, 150, 7.5],
          [192, 150, 7.5],
          [112, 136, 4],
          [197, 136, 4],
        ];

        eyes.forEach(([ex, ey, er]) => {
          octx.save();
          octx.beginPath();
          octx.arc(ex, ey, er + 0.8, 0, Math.PI * 2);
          octx.clip();

          const lidY = ey - er + 2 * er * blinkClosure;
          octx.fillStyle = '#090d16';
          octx.beginPath();
          octx.moveTo(ex - er - 2, ey - er - 2);
          octx.lineTo(ex + er + 2, ey - er - 2);
          octx.lineTo(ex + er + 2, lidY);
          octx.lineTo(ex - er - 2, lidY);
          octx.closePath();
          octx.fill();

          // Glowing cyan digital shutter line
          octx.strokeStyle = '#38bdf8';
          octx.lineWidth = 1.6;
          octx.beginPath();
          octx.moveTo(ex - er - 1, lidY);
          octx.lineTo(ex + er + 1, lidY);
          octx.stroke();

          octx.restore();
        });
      }

      octx.restore();
    }

    // 5. Draw 4 High-Frequency Aero-Foil Carbon-Mesh Bee Wings (2 Forewings + 2 Hindwings)
    // Mounted on dorsal thorax hinges; beats at 58 Hz in flight, 34 Hz in hover, folds back in sleep
    const wingFreq =
      this.sp.jumping || this.sp.speed > 120 ? 58 : this.sp.speed > 15 ? 46 : 34;
    const activeFlap = 1 - Math.min(1, this.sp.sleep * 1.15);
    const ghostCount = this.sp.sleep > 0.7 ? 1 : 4;

    const foreW = 460 * K;
    const foreH = 248 * K;
    const hindW = 335 * K;
    const hindH = 194 * K;

    for (let g = 0; g < ghostCount; g++) {
      const phase = (this.clock * wingFreq + g * 0.19) * Math.PI * 2;
      const strokeWave = Math.sin(phase) * activeFlap;
      const featherScale = 1 - 0.22 * Math.abs(Math.cos(phase)) * activeFlap;
      const alpha = g === 0 ? 0.82 : 0.24;

      for (const side of [-1, 1]) {
        // Hindwing mounted at (-22 * K, side * 56 * K)
        octx.save();
        octx.globalAlpha = alpha;
        octx.translate(-22 * K, side * 56 * K);
        // Point backward-outward (-x is backward, side*+y is outward)
        const hindBaseAng = Math.PI + side * (-0.52 - 0.34 * activeFlap);
        const hindFlapAng = side * strokeWave * 0.52;
        octx.rotate(hindBaseAng + hindFlapAng);
        octx.scale(1, side * featherScale);
        octx.drawImage(this.assets.beeHindwingCanvas, -22 * (hindW / 190), -hindH * 0.5, hindW, hindH);
        octx.restore();

        // Forewing mounted at (38 * K, side * 68 * K)
        octx.save();
        octx.globalAlpha = alpha;
        octx.translate(38 * K, side * 68 * K);
        const foreBaseAng = Math.PI + side * (-0.38 - 0.48 * activeFlap);
        const foreFlapAng = side * strokeWave * 0.68;
        octx.rotate(foreBaseAng + foreFlapAng);
        octx.scale(1, side * featherScale);
        octx.drawImage(this.assets.beeForewingCanvas, -22 * (foreW / 260), -foreH * 0.5, foreW, foreH);
        octx.restore();
      }
    }

    octx.restore();

    // Composite spiderOff onto main canvas with dynamic jump shadow (Section 6)
    mainCtx.save();
    const shadowAlpha = Math.max(0.18, 0.42 - Math.min(0.24, h / 500));
    mainCtx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha.toFixed(3)})`;
    mainCtx.shadowBlur = 7 + 0.14 * h;
    mainCtx.shadowOffsetX = 5 + 0.35 * h;
    mainCtx.shadowOffsetY = 9 + 0.6 * h;
    mainCtx.drawImage(this.spiderOff, this.sp.x - cx, this.sp.y - cy, cw, ch);
    mainCtx.restore();
  }

  private drawSleepZ(ctx: CanvasRenderingContext2D) {
    // Section 6: Three white z letters drift up and right from body point (260, -170)
    if (this.sp.sleep > 0.1) {
      const origin = this.bodyToWorld(260, -170);
      this.renderZLetters(ctx, origin.x, origin.y, this.tScale, this.sp.sleep);
    }
    // Landed fly also snores at half size when spider sleeps
    if (this.sp.sleep > 0.2 && this.fly.landed > 0.8 && this.fly.alpha > 0.2) {
      this.renderZLetters(ctx, this.fly.x + 12, this.fly.y - 12, this.tScale * 0.5, this.sp.sleep);
    }
  }

  private renderZLetters(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    scale: number,
    alphaScale: number
  ) {
    ctx.save();
    ctx.font = '700 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(17, 41, 226, 0.18)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    for (let i = 0; i < 3; i++) {
      const c = (this.clock * 0.45 + i / 3) % 1;
      const zAlpha = Math.sin(Math.PI * c) * alphaScale;
      const fontSize = (12 + 14 * c) * scale;
      const x = ox + c * 38 * scale + Math.sin(c * Math.PI * 2 + i) * 5;
      const y = oy - c * 70 * scale;

      ctx.font = `700 ${fontSize.toFixed(1)}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = `rgba(17, 41, 226, ${zAlpha.toFixed(3)})`;
      ctx.fillText('z', x, y);
    }
    ctx.restore();
  }

  private drawFlyAndCocoon(ctx: CanvasRenderingContext2D) {
    const B = this.clock;
    const flyW = 79 * this.flySize;
    const flyH = flyW * (246 / 240);
    const scaleX = flyW / 240;
    const scaleY = flyH / 246;

    if (this.fly.alpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.fly.alpha;

      // Hover height y = 1 - landed, bob of sin(6B) * 1.2 * y
      const yHover = 1 - this.fly.landed;
      const bob = Math.sin(6 * B) * 1.2 * yHover;

      ctx.translate(this.fly.x, this.fly.y + bob);
      ctx.rotate(this.fly.heading);

      // Fly shadow: rgba(0,0,0, 0.2 + 0.18*landed), blur 3 + 9y, offset (3 + 14y, 5 + 26y)
      ctx.shadowColor = `rgba(0, 0, 0, ${(0.2 + 0.18 * this.fly.landed).toFixed(3)})`;
      ctx.shadowBlur = 3 + 9 * yHover;
      ctx.shadowOffsetX = 3 + 14 * yHover;
      ctx.shadowOffsetY = 5 + 26 * yHover;

      // Draw fly body centered
      ctx.drawImage(this.flyBodyCanvas, -flyW * 0.5, -flyH * 0.5, flyW, flyH);

      // Reset shadow for rapid ghost wings
      ctx.shadowColor = 'transparent';

      // Wing hinge at (388, 405) in 920x945 space
      const lHingeX = (388 / 920 - 0.5) * flyW;
      const lHingeY = (405 / 945 - 0.5) * flyH;
      const rHingeX = -lHingeX;
      const rHingeY = lHingeY;

      if (this.fly.landed > 0.85 && this.fly.caught <= 0) {
        // Landed: wings fold neatly
        ctx.drawImage(this.flyLeftWingCanvas, -flyW * 0.5, -flyH * 0.5, flyW, flyH);
        ctx.drawImage(this.flyRightWingCanvas, -flyW * 0.5, -flyH * 0.5, flyW, flyH);
      } else {
        // Flying: four ghost copies at 34 Hz (46 Hz when caught)
        const freq = this.fly.caught > 0 ? 46 : 34;
        for (let g = 0; g < 4; g++) {
          const q = Math.sin((B * freq + g * 0.21) * Math.PI * 2);
          ctx.save();
          ctx.globalAlpha = this.fly.alpha * (g === 0 ? 0.55 : 0.24);

          // Left wing
          ctx.save();
          ctx.translate(lHingeX, lHingeY);
          ctx.rotate(0.9 * q * 0.45);
          ctx.scale(1, 1 - 0.25 * Math.abs(q));
          ctx.translate(-lHingeX, -lHingeY);
          ctx.drawImage(this.flyLeftWingCanvas, -flyW * 0.5, -flyH * 0.5, flyW, flyH);
          ctx.restore();

          // Right wing
          ctx.save();
          ctx.translate(rHingeX, rHingeY);
          ctx.rotate(-0.9 * q * 0.45);
          ctx.scale(1, 1 - 0.25 * Math.abs(q));
          ctx.translate(-rHingeX, -rHingeY);
          ctx.drawImage(this.flyRightWingCanvas, -flyW * 0.5, -flyH * 0.5, flyW, flyH);
          ctx.restore();

          ctx.restore();
        }
      }

      ctx.restore();
    }

    // Silk Cocoon when caught or fading out (Section 10: 7 ellipse strokes of radius 30*flySize + 70 short fibres)
    const cocoonAlpha = this.fly.caught > 0 ? 1 : this.fly.cocoonFade;
    if (cocoonAlpha > 0.01) {
      const prog = this.fly.caught > 0 ? this.fly.cocoonProgress : 1;
      const cx = this.fly.caught > 0 ? this.fly.x : this.fly.cocoonX;
      const cy = this.fly.caught > 0 ? this.fly.y : this.fly.cocoonY;
      const r = 30 * this.flySize;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.fly.cocoonHeading);
      ctx.globalAlpha = cocoonAlpha;

      // Translucent Liquid Honey Glaze Droplets encapsulating the caught target
      const dropCount = 7;
      for (let i = 0; i < dropCount; i++) {
        const dropProg = Math.max(0, Math.min(1, prog * dropCount - i));
        if (dropProg <= 0) continue;
        const ang = i * ((Math.PI * 2) / dropCount);
        const dist = (i === 0 ? 0 : r * 0.48) * dropProg;
        const sz = (i === 0 ? r * 2.2 : r * 1.45) * dropProg;
        ctx.drawImage(
          this.dewSprite,
          Math.cos(ang) * dist - sz * 0.5,
          Math.sin(ang) * dist - sz * 0.5,
          sz,
          sz
        );
      }

      ctx.restore();
    }
  }
}
