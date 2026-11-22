/**
 * LUMEN & CO. — WebGL2 Ink Bleed Theme Transition
 * Adapted from codemure-official/ink-bleed-theme-changer
 *
 * Features:
 * - Click-originating organic ink-bleed shader transition (WebGL2 + tileable Perlin noise)
 * - Full-document pre-capture with sticky navbar compositing in-shader (zero scroll lag!)
 * - Automatic viewport fallback when fixed modals/cart drawer are open or doc exceeds GPU limits
 * - Interruptible mid-spread freeze & ping-pong offscreen compositing
 * - GSAP MorphSVG sun <-> moon icon animation layered above the ink canvas
 * - Graceful CSS crossfade fallback without WebGL2, with prefers-reduced-motion, or ?gl=0
 * - Hidden tuning controls panel (press D), keyboard toggle (T), replay last spread (R)
 */

(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'lumen_theme_v1';
  const PANEL_STORAGE_KEY = 'ink-bleed:params:v1';

  const BACKGROUND = {
    light: '#f8fafc',
    dark: '#020305',
  };

  const RIM_COLOR = {
    dark: [0.004, 0.006, 0.012],
    light: [0.97, 0.98, 1.0],
  };

  const inkParams = {
    duration: 1.15,
    tendril: 1,
    noiseScale: 1,
    softness: 1.4,
    drift: 1,
    timeScale: 1,
  };

  const DEFAULTS = { ...inkParams };

  const SPREAD = {
    growth: 0.7,
    cleanupFrom: 0.45,
    cleanupReach: 0.4,
    cleanupPow: 2,
  };

  const EASE = 'power3.out';
  const FADE_OUT = 0.14;
  const RESIZE_DEBOUNCE_MS = 280;
  const INVALIDATE_DEBOUNCE_MS = 220;
  const CSS_FADE_S = 0.45;
  const REPLAY_HOLD_MS = 400;

  const NOISE_SIZE = 256;
  const NOISE_CELLS = 32;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;

  // =========================================================================
  // Theme State Helpers
  // =========================================================================

  function getTheme() {
    return root.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  function otherTheme(theme) {
    return theme === 'dark' ? 'light' : 'dark';
  }

  function applyTheme(theme, toggle) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore storage failures */
    }
    if (toggle) {
      const isDark = theme === 'dark';
      toggle.setAttribute('aria-pressed', String(isDark));
      const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', `${label} (T)`);
    }
  }

  // =========================================================================
  // Tileable Gradient-Noise Texture (gl/noiseTexture.ts)
  // =========================================================================

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function noiseChannel(rand) {
    const gx = new Float32Array(NOISE_CELLS * NOISE_CELLS);
    const gy = new Float32Array(NOISE_CELLS * NOISE_CELLS);
    for (let i = 0; i < gx.length; i++) {
      const a = rand() * Math.PI * 2;
      gx[i] = Math.cos(a);
      gy[i] = Math.sin(a);
    }
    const texelsPerCell = NOISE_SIZE / NOISE_CELLS;
    const out = new Float32Array(NOISE_SIZE * NOISE_SIZE);
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const at = (cx, cy) =>
      ((cy + NOISE_CELLS) % NOISE_CELLS) * NOISE_CELLS + ((cx + NOISE_CELLS) % NOISE_CELLS);

    for (let y = 0; y < NOISE_SIZE; y++) {
      const py = (y + 0.5) / texelsPerCell;
      const cy = Math.floor(py);
      const fy = py - cy;
      const v = fade(fy);
      for (let x = 0; x < NOISE_SIZE; x++) {
        const px = (x + 0.5) / texelsPerCell;
        const cx = Math.floor(px);
        const fx = px - cx;
        const u = fade(fx);
        const i00 = at(cx, cy);
        const i10 = at(cx + 1, cy);
        const i01 = at(cx, cy + 1);
        const i11 = at(cx + 1, cy + 1);
        const n00 = gx[i00] * fx + gy[i00] * fy;
        const n10 = gx[i10] * (fx - 1) + gy[i10] * fy;
        const n01 = gx[i01] * fx + gy[i01] * (fy - 1);
        const n11 = gx[i11] * (fx - 1) + gy[i11] * (fy - 1);
        const nx0 = n00 + (n10 - n00) * u;
        const nx1 = n01 + (n11 - n01) * u;
        out[y * NOISE_SIZE + x] = nx0 + (nx1 - nx0) * v;
      }
    }

    for (let i = 0; i < out.length; i++) {
      out[i] = Math.max(-1, Math.min(1, out[i] * 1.45));
    }
    return out;
  }

  function createNoiseTexture(gl) {
    const rand = mulberry32(0x1b1eed);
    const channels = [noiseChannel(rand), noiseChannel(rand), noiseChannel(rand), noiseChannel(rand)];
    const data = new Uint8Array(NOISE_SIZE * NOISE_SIZE * 4);
    for (let i = 0; i < NOISE_SIZE * NOISE_SIZE; i++) {
      for (let c = 0; c < 4; c++) {
        data[i * 4 + c] = Math.round((channels[c][i] * 0.5 + 0.5) * 255);
      }
    }
    const tex = gl.createTexture();
    if (!tex) throw new Error('createTexture failed');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, NOISE_SIZE, NOISE_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return tex;
  }

  // =========================================================================
  // GLSL Shaders & Program (gl/shaders.ts, gl/program.ts)
  // =========================================================================

  const FULLSCREEN_VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

  const INK_FRAG = `#version 300 es
precision highp float;
precision highp int;

uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform vec2 uFromSize;
uniform vec2 uToSize;
uniform vec4 uFromMap;      // (scaleXRatio, offsetX, offsetY, flipY)
uniform vec4 uToMap;
uniform vec4 uNavMeta;      // (navFlowTopCss, navHeightCss, stickyActive, 0.0)
uniform vec2 uTexScales;    // (fromScaleY, toScaleY) for sticky navbar band
uniform float uCanvasScale;
uniform vec2 uRes;

uniform vec2 uCenter;
uniform float uRadius;
uniform float uCleanup;
uniform float uTime;
uniform float uRef;
uniform vec2 uSeed;
uniform mat2 uSeedRot;

uniform float uTendril;
uniform float uNoiseScale;
uniform float uSoftness;
uniform float uDrift;
uniform vec3 uRimColor;

out vec4 outColor;

const float A_LOBE = 0.22;
const float A_BLOB = 0.20;
const float A_SUM = A_LOBE + A_BLOB;
const float TENDRIL_REACH = 0.24;
const float FIBRE_PX = 1.8;
const float THIN_MAX_PX = 26.0;
const float SPECK_PX = 18.0;
const float HAZE_PX = 16.0;

uniform sampler2D uNoise;
const float INV_CELLS = 1.0 / ${NOISE_CELLS.toFixed(1)};

float gnoise(vec2 p) {
  return textureLod(uNoise, p * INV_CELLS, 0.0).r * 2.0 - 1.0;
}

float gnoise2(vec2 p) {
  return textureLod(uNoise, p * INV_CELLS, 0.0).g * 2.0 - 1.0;
}

const mat2 OCT = mat2(0.8, 0.6, -0.6, 0.8) * 2.03;

float fbm3(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * gnoise(p); p = OCT * p + 17.13; a *= 0.5; }
  return s / 0.875;
}

float fbm4(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * gnoise(p); p = OCT * p + 17.13; a *= 0.5; }
  return s / 0.9375;
}

float fbm5(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * gnoise(p); p = OCT * p + 17.13; a *= 0.5; }
  return s / 0.96875;
}

vec3 sampleDoc(sampler2D tex, vec2 size, vec4 map, float texScaleY, vec2 devPx, float cssY) {
  vec2 texPx;
  if (map.w > 0.5) {
    texPx = devPx * map.x + map.yz;
    texPx.y = size.y - texPx.y;
  } else if (uNavMeta.z > 0.5 && cssY < uNavMeta.y) {
    texPx = vec2(devPx.x * map.x + map.y, (uNavMeta.x + cssY) * texScaleY);
  } else {
    texPx = devPx * map.x + map.yz;
  }
  vec2 uv = clamp(texPx, vec2(0.5), size - 0.5) / size;
  return texture(tex, uv).rgb;
}

void main() {
  vec2 devPx = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 css = devPx / uCanvasScale;
  vec2 rel = css - uCenter;
  float d = length(rel);
  float R = uRadius;
  float cleanup = uCleanup;

  float inner = R * (1.0 - A_SUM) + cleanup - FIBRE_PX - THIN_MAX_PX - uSoftness * 2.0;
  float outer = R * (1.0 + A_SUM) * (1.0 + TENDRIL_REACH * uTendril) + cleanup + FIBRE_PX + SPECK_PX + uSoftness * 2.0;
  if (d < inner) {
    outColor = vec4(sampleDoc(uTo, uToSize, uToMap, uTexScales.y, devPx, css.y), 1.0);
    return;
  }
  if (d > outer) {
    outColor = vec4(sampleDoc(uFrom, uFromSize, uFromMap, uTexScales.x, devPx, css.y), 1.0);
    return;
  }

  float t = uTime * uDrift;
  vec2 p = rel / uRef;
  vec2 dir = uSeedRot * (rel / max(d, 1e-3));
  float ns = uNoiseScale;

  vec2 q = p * (2.4 * ns) + uSeed;
  vec2 w = vec2(
    fbm3(q + vec2(0.0, 0.31 * t)),
    fbm3(q + vec2(5.2, 1.3) - vec2(0.27 * t, 0.0))
  );

  float blob = fbm5(q + 2.3 * w + vec2(0.12 * t, -0.08 * t));
  vec2 lq = dir * 0.9 + uSeed.yx * 0.37 + vec2(0.06 * t);
  float lobes = gnoise(lq) * 0.75 + gnoise(lq * 2.1 + 9.1) * 0.25;
  float reach = clamp(1.0 + A_LOBE * 1.6 * lobes + A_BLOB * 1.5 * blob, 1.0 - A_SUM, 1.0 + A_SUM);
  float f = d - R * reach;

  float gate = smoothstep(-0.35, 0.4, fbm3(dir * 1.6 + uSeed * 0.61 + 3.7));
  vec2 tq = dir * (2.2 * ns) + (d / uRef) * vec2(2.6, -1.9) * ns + 1.2 * w + uSeed * 1.7 + vec2(0.0, 0.18 * t);
  float n = fbm4(tq);
  float ridgePx = abs(n) * max(d, 24.0) / (4.0 * ns);
  float lenN = gnoise(dir * 3.1 + uSeed * 0.43 + vec2(0.1 * t)) * 0.5 + 0.5;
  float L = uTendril * TENDRIL_REACH * R * gate * (0.35 + 0.65 * lenN);
  float along = clamp(f / max(L, 1.0), 0.0, 1.0);
  float width = clamp(R * 0.022, 1.5, 9.0) * (1.0 - along * along) * gate;
  float ft = max(f - L, ridgePx - width);
  float k = 6.0;
  float hh = clamp(0.5 + 0.5 * (ft - f) / k, 0.0, 1.0);
  f = mix(ft, f, hh) - k * hh * (1.0 - hh);

  vec2 fq = css * 0.34 + uSeed * 13.0;
  float fibre = gnoise2(fq) * 0.65 + gnoise2(OCT * fq + 5.3) * 0.35;
  f += fibre * FIBRE_PX;

  f -= cleanup;

  float soft = max(uSoftness, 0.6);
  float inked = 1.0 - smoothstep(-soft, soft, f);

  float thinW = mix(3.0, THIN_MAX_PX, clamp(blob * 0.8 + 0.3, 0.0, 1.0));
  float density = mix(0.6, 1.0, smoothstep(0.0, thinW, -f));
  float cov = inked * density;

  float hazeW = mix(4.0, HAZE_PX, clamp(0.5 + 0.5 * blob, 0.0, 1.0));
  float haze = (1.0 - smoothstep(0.0, hazeW, f)) * smoothstep(-0.3, 0.6, 0.35 * fibre + w.x);
  cov = max(cov, haze * 0.24 * step(0.0, f));

  float ahead = clamp(f / SPECK_PX, 0.0, 1.0);
  if (f > 0.0 && ahead < 1.0) {
    float sn = gnoise2(css * 0.55 + uSeed * 7.0 + 41.0) * 0.5 + 0.5;
    float th = mix(0.80, 0.96, ahead);
    cov = max(cov, smoothstep(th, th + 0.04, sn) * 0.75 * (1.0 - ahead));
  }

  vec3 from = sampleDoc(uFrom, uFromSize, uFromMap, uTexScales.x, devPx, css.y);
  vec3 to = sampleDoc(uTo, uToSize, uToMap, uTexScales.y, devPx, css.y);
  vec3 col = mix(from, to, cov);

  float rimX = (f + soft * 1.1) / (soft * 1.4 + 1.2);
  float rim = exp(-rimX * rimX) * inked;
  col = mix(col, uRimColor, rim * 0.45);

  outColor = vec4(col, 1.0);
}
`;

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('createShader failed');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      const log = gl.getShaderInfoLog(shader) || '';
      gl.deleteShader(shader);
      throw new Error(`Shader compile error:\n${log}`);
    }
    return shader;
  }

  function createProgram(gl, vert, frag) {
    const program = gl.createProgram();
    if (!program) throw new Error('createProgram failed');
    const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
      throw new Error(`Program link error:\n${gl.getProgramInfoLog(program) || ''}`);
    }
    const cache = new Map();
    return {
      program,
      uniform(name) {
        if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name));
        return cache.get(name) || null;
      },
    };
  }

  // =========================================================================
  // WebGL2 Renderer (gl/renderer.ts)
  // =========================================================================

  class InkRenderer {
    constructor(canvas, gl) {
      this.canvas = canvas;
      this.gl = gl;
      this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      this.textures = new Map();
      this.composites = [];
      this.activeComposite = -1;
      this.canvasScale = 1;
      this.lost = false;
      this._init();
    }

    static create(canvas) {
      const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      });
      if (!gl) return null;
      try {
        return new InkRenderer(canvas, gl);
      } catch (err) {
        console.error('[ink] WebGL2 init failed', err);
        return null;
      }
    }

    _init() {
      const gl = this.gl;
      this.program = createProgram(gl, FULLSCREEN_VERT, INK_FRAG);
      const vao = gl.createVertexArray();
      if (!vao) throw new Error('createVertexArray failed');
      this.vao = vao;
      this.noise = createNoiseTexture(gl);
      this.composites = [];
      this.activeComposite = -1;
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    }

    watchContext(onLost, onRestored) {
      this.canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        this.lost = true;
        this.textures.clear();
        this.composites = [];
        this.activeComposite = -1;
        onLost();
      });
      this.canvas.addEventListener('webglcontextrestored', () => {
        this.lost = false;
        this._init();
        onRestored();
      });
    }

    get isLost() {
      return this.lost;
    }

    resize(scale) {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * scale));
      const h = Math.max(1, Math.round(rect.height * scale));
      if (this.canvas.width !== w) this.canvas.width = w;
      if (this.canvas.height !== h) this.canvas.height = h;
      this.canvasScale = rect.width > 0 ? w / rect.width : scale;
    }

    upload(snapshot) {
      if (this.lost) return false;
      const gl = this.gl;
      let entry = this.textures.get(snapshot.theme);
      if (!entry) {
        entry = {
          texture: this._createTexture(),
          width: 0,
          height: 0,
          scaleX: 1,
          scaleY: 1,
          scrollX: 0,
          scrollY: 0,
          isFullDoc: false,
          navFlowTop: 0,
          navHeight: 0,
          key: '',
        };
        this.textures.set(snapshot.theme, entry);
      }
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, snapshot.canvas);
      entry.width = snapshot.canvas.width;
      entry.height = snapshot.canvas.height;
      entry.scaleX = snapshot.scaleX;
      entry.scaleY = snapshot.scaleY;
      entry.scrollX = snapshot.scrollX;
      entry.scrollY = snapshot.scrollY;
      entry.isFullDoc = snapshot.isFullDoc;
      entry.navFlowTop = snapshot.navFlowTop;
      entry.navHeight = snapshot.navHeight;
      entry.key = snapshot.key;
      return true;
    }

    hasValid(theme, key) {
      return !this.lost && this.textures.get(theme)?.key === key;
    }

    freeze(frame) {
      if (this.lost) return false;
      const gl = this.gl;
      const index = this.activeComposite === 0 ? 1 : 0;
      const target = this._ensureComposite(index);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      const ok = this._render(frame);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!ok) return false;
      target.scrollX = window.scrollX;
      target.scrollY = window.scrollY;
      this.activeComposite = index;
      return true;
    }

    draw(frame) {
      if (this.lost) return;
      this._render(frame);
    }

    _createTexture() {
      const gl = this.gl;
      const texture = gl.createTexture();
      if (!texture) throw new Error('createTexture failed');
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    }

    _ensureComposite(index) {
      const gl = this.gl;
      const { width, height } = this.canvas;
      let c = this.composites[index];
      if (!c) {
        const framebuffer = gl.createFramebuffer();
        if (!framebuffer) throw new Error('createFramebuffer failed');
        c = { texture: this._createTexture(), framebuffer, width: 0, height: 0, scrollX: 0, scrollY: 0 };
        this.composites[index] = c;
      }
      if (c.width !== width || c.height !== height) {
        gl.bindTexture(gl.TEXTURE_2D, c.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, c.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, c.texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        c.width = width;
        c.height = height;
      }
      return c;
    }

    _sampler(source) {
      if (source === 'composite') {
        const c = this.composites[this.activeComposite];
        if (!c) return null;
        return {
          texture: c.texture,
          width: c.width,
          height: c.height,
          ratio: 1,
          scaleY: this.canvasScale,
          offsetX: Math.round((window.scrollX - c.scrollX) * this.canvasScale),
          offsetY: Math.round((window.scrollY - c.scrollY) * this.canvasScale),
          flipY: true,
          isFullDoc: false,
          navFlowTop: 0,
          navHeight: 0,
        };
      }
      const t = this.textures.get(source);
      if (!t) return null;
      return {
        texture: t.texture,
        width: t.width,
        height: t.height,
        ratio: t.scaleX / this.canvasScale,
        scaleY: t.scaleY,
        offsetX: Math.floor((window.scrollX - t.scrollX) * t.scaleX + 0.5),
        offsetY: Math.floor((window.scrollY - t.scrollY) * t.scaleY + 0.5),
        flipY: false,
        isFullDoc: t.isFullDoc,
        navFlowTop: t.navFlowTop,
        navHeight: t.navHeight,
      };
    }

    _render(frame) {
      const from = this._sampler(frame.from);
      const to = this._sampler(frame.to);
      if (!from || !to) return false;

      const gl = this.gl;
      const { program, uniform } = this.program;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.useProgram(program);
      gl.bindVertexArray(this.vao);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, from.texture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, to.texture);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.noise);

      gl.uniform1i(uniform('uFrom'), 0);
      gl.uniform1i(uniform('uTo'), 1);
      gl.uniform1i(uniform('uNoise'), 2);
      gl.uniform2f(uniform('uFromSize'), from.width, from.height);
      gl.uniform2f(uniform('uToSize'), to.width, to.height);
      gl.uniform4f(uniform('uFromMap'), from.ratio, from.offsetX, from.offsetY, from.flipY ? 1 : 0);
      gl.uniform4f(uniform('uToMap'), to.ratio, to.offsetX, to.offsetY, to.flipY ? 1 : 0);

      // Sticky navbar overlay metadata when sampling full-document textures while scrolled down
      const navMetaSource = to.isFullDoc ? to : from.isFullDoc ? from : null;
      const stickyActive =
        navMetaSource && navMetaSource.navHeight > 0 && window.scrollY > navMetaSource.navFlowTop ? 1.0 : 0.0;
      gl.uniform4f(
        uniform('uNavMeta'),
        navMetaSource ? navMetaSource.navFlowTop : 0,
        navMetaSource ? navMetaSource.navHeight : 0,
        stickyActive,
        0
      );
      gl.uniform2f(uniform('uTexScales'), from.scaleY, to.scaleY);

      gl.uniform1f(uniform('uCanvasScale'), this.canvasScale);
      gl.uniform2f(uniform('uRes'), this.canvas.width, this.canvas.height);
      gl.uniform2f(uniform('uCenter'), frame.center.x, frame.center.y);
      gl.uniform1f(uniform('uRadius'), frame.radius);
      gl.uniform1f(uniform('uCleanup'), frame.cleanup);
      gl.uniform1f(uniform('uTime'), frame.time);
      gl.uniform1f(uniform('uRef'), Math.max(this.canvas.width, this.canvas.height) / this.canvasScale);
      gl.uniform2f(uniform('uSeed'), frame.seed.x, frame.seed.y);
      const cos = Math.cos(frame.seed.angle);
      const sin = Math.sin(frame.seed.angle);
      gl.uniformMatrix2fv(uniform('uSeedRot'), false, [cos, sin, -sin, cos]);

      gl.uniform1f(uniform('uTendril'), inkParams.tendril);
      gl.uniform1f(uniform('uNoiseScale'), inkParams.noiseScale);
      gl.uniform1f(uniform('uSoftness'), inkParams.softness);
      gl.uniform1f(uniform('uDrift'), inkParams.drift);
      gl.uniform3fv(uniform('uRimColor'), RIM_COLOR[frame.to]);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    }
  }

  // =========================================================================
  // Snapshot Capture (Full-Doc + Sticky Navbar / Viewport Overlay)
  // =========================================================================

  let domRevision = 1;

  function bumpDomRevision() {
    domRevision += 1;
  }

  function renderScale() {
    // Cap at 1.5x for crisp visuals with much faster GPU & snapshot throughput
    return Math.min(window.devicePixelRatio || 1, 1.5);
  }

  function viewportSize() {
    return {
      width: root.clientWidth,
      height: Math.max(root.clientHeight, 1),
    };
  }

  function documentSize() {
    return {
      width: root.clientWidth,
      height: Math.max(root.scrollHeight, root.clientHeight, 1),
    };
  }

  function isToggleObstructed() {
    return Boolean(document.querySelector('.modal-backdrop:not(.hidden), #cartDrawer.open'));
  }

  function canUseFullDoc(scale, maxTextureSize) {
    if (isToggleObstructed()) return false;
    const { width, height } = documentSize();
    return width * 0.9 <= maxTextureSize && height * 0.9 <= maxTextureSize && maxTextureSize >= height;
  }

  function layoutKey(scale, maxTextureSize) {
    if (canUseFullDoc(scale, maxTextureSize)) {
      const { width, height } = documentSize();
      return `full:${width}x${height}@${domRevision}@${scale}`;
    }
    const { width, height } = viewportSize();
    const sx = Math.round(window.scrollX);
    const sy = Math.round(window.scrollY);
    return `vp:${width}x${height}@${sx},${sy}@${domRevision}@${scale}`;
  }

  function collectLiveStateForClone(isFullDoc) {
    const sx = isFullDoc ? 0 : window.scrollX;
    const sy = isFullDoc ? 0 : window.scrollY;
    const hideLiveToggle = !isToggleObstructed();

    const navbar = document.getElementById('navbar');
    const announcement = document.querySelector('.announcement-bar');
    const navFlowTop = announcement ? announcement.getBoundingClientRect().height : 0;
    const navHeight = navbar ? navbar.getBoundingClientRect().height : 0;

    const fixedSnapshots = [];
    if (!isFullDoc) {
      const fixedSelectors = [
        '#cartDrawerBackdrop:not(.hidden)',
        '#cartDrawer.open',
        '.modal-backdrop:not(.hidden)',
        '#toastNotification.show',
      ];
      fixedSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          if (!el.id) return;
          const rect = el.getBoundingClientRect();
          fixedSnapshots.push({
            id: el.id,
            left: sx + rect.left,
            top: sy + rect.top,
            width: rect.width,
            height: rect.height,
          });
        });
      });
    }

    const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map((el) => ({
      value: el.value,
      checked: el.checked,
      selectedIndex: el.tagName === 'SELECT' ? el.selectedIndex : -1,
    }));

    return { sx, sy, hideLiveToggle, navFlowTop, navHeight, fixedSnapshots, inputs };
  }

  async function capturePage(theme, scale, maxTextureSize) {
    if (typeof window.html2canvas !== 'function') {
      throw new Error('html2canvas not available');
    }

    const t0 = performance.now();
    const isFullDoc = canUseFullDoc(scale, maxTextureSize);
    const key = layoutKey(scale, maxTextureSize);
    const { width: vw, height: vh } = viewportSize();
    const { width: docW, height: docH } = documentSize();

    const capW = isFullDoc ? docW : vw;
    const capH = isFullDoc ? docH : vh;
    const safeScale = Math.min(scale, maxTextureSize / capW, maxTextureSize / capH);
    const live = collectLiveStateForClone(isFullDoc);

    const canvas = await window.html2canvas(document.body, {
      scale: safeScale,
      backgroundColor: BACKGROUND[theme],
      x: live.sx,
      y: live.sy,
      width: capW,
      height: capH,
      scrollX: 0,
      scrollY: 0,
      windowWidth: vw,
      windowHeight: isFullDoc ? docH : vh,
      logging: false,
      useCORS: true,
      onclone: (doc) => {
        // Suppress transitions/scrollbars BEFORE flipping theme so computed styles & widths match 100%
        const instantStyle = doc.createElement('style');
        instantStyle.textContent =
          'html, body { overflow: hidden !important; width: ' +
          vw +
          'px !important; } ' +
          '*, *::before, *::after { transition: none !important; animation: none !important; }';
        doc.head.appendChild(instantStyle);

        doc.documentElement.dataset.theme = theme;
        doc.body.style.position = 'relative';
        void doc.documentElement.offsetHeight;

        if (live.hideLiveToggle) {
          doc.querySelectorAll('[data-ink-live]').forEach((el) => {
            el.style.visibility = 'hidden';
          });
        }

        // Ensure all cards & headings render at full visibility without translateY offsets
        doc.querySelectorAll('.product-card').forEach((card) => {
          card.classList.add('revealed');
        });
        doc.querySelectorAll('.hero-title, .section-title, .newsletter-title').forEach((heading) => {
          heading.classList.add('reveal-triggered');
        });

        // In full-document mode, render navbar in its natural flow slot (sticky strip is sampled by shader)
        if (isFullDoc) {
          const clonedNavbar = doc.getElementById('navbar');
          if (clonedNavbar) {
            clonedNavbar.style.position = 'relative';
            clonedNavbar.style.top = '0px';
          }
        } else {
          // Viewport capture (used when fixed modals or cart drawer are open)
          live.fixedSnapshots.forEach((f) => {
            const cloned = doc.getElementById(f.id);
            if (!cloned) return;
            cloned.style.position = 'absolute';
            cloned.style.left = `${f.left}px`;
            cloned.style.top = `${f.top}px`;
            cloned.style.width = `${f.width}px`;
            cloned.style.height = `${f.height}px`;
            cloned.style.right = 'auto';
            cloned.style.bottom = 'auto';
            cloned.style.transform = 'none';
            cloned.style.margin = '0';
          });
        }

        const clonedInputs = doc.querySelectorAll('input, textarea, select');
        clonedInputs.forEach((el, idx) => {
          const saved = live.inputs[idx];
          if (!saved) return;
          if (el.tagName === 'SELECT') {
            el.selectedIndex = saved.selectedIndex;
          } else if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = saved.checked;
          } else {
            el.value = saved.value;
          }
        });
      },
    });

    // Use exact canvas-to-CSS pixel ratio to prevent any subpixel image shrink/stretch
    const scaleX = canvas.width / capW;
    const scaleY = canvas.height / capH;

    return {
      theme,
      canvas,
      scaleX,
      scaleY,
      scrollX: live.sx,
      scrollY: live.sy,
      isFullDoc,
      navFlowTop: live.navFlowTop,
      navHeight: live.navHeight,
      key,
      ms: performance.now() - t0,
    };
  }

  // =========================================================================
  // Sun <-> Moon Icon Morph & Sticky Overlay (ui/themeIcon.ts)
  // =========================================================================

  const SUN = 'M12 7a5 5 0 1 1 0 10a5 5 0 1 1 0-10z';
  const MOON = 'M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a7.2 7.2 0 0 0 9.7 9.7z';

  const POSE = {
    light: { body: SUN, rays: { scale: 1, opacity: 1, rotation: 0 }, icon: 0 },
    dark: { body: MOON, rays: { scale: 0.2, opacity: 0, rotation: -60 }, icon: -25 },
  };

  class ThemeIcon {
    constructor(button) {
      this.button = button;
      this.icon = button.querySelector('svg');
      this.body = button.querySelector('.theme-toggle__body');
      this.rays = Array.from(button.querySelectorAll('.theme-toggle__rays line'));
      this.timeline = null;
      this.hasMorphSVG = false;

      if (window.gsap && window.MorphSVGPlugin) {
        try {
          window.gsap.registerPlugin(window.MorphSVGPlugin);
          this.hasMorphSVG = true;
        } catch {
          this.hasMorphSVG = false;
        }
      }

      this.overlay = this._createOverlay();
      this.overlayIcon = this.overlay ? this.overlay.querySelector('svg') : null;
      this.overlayBody = this.overlay ? this.overlay.querySelector('.theme-toggle__body') : null;
      this.overlayRays = this.overlay ? Array.from(this.overlay.querySelectorAll('.theme-toggle__rays line')) : [];
      this.overlayActive = false;

      this._syncPositionBound = () => this.syncOverlayPosition();
      window.addEventListener('scroll', this._syncPositionBound, { passive: true });
      window.addEventListener('resize', this._syncPositionBound, { passive: true });
    }

    _createOverlay() {
      if (!this.button) return null;
      const clone = this.button.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('data-magnetic');
      clone.removeAttribute('data-ink-live');
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      clone.setAttribute('data-html2canvas-ignore', '');
      clone.classList.add('theme-toggle-overlay');
      clone.hidden = true;
      document.body.appendChild(clone);
      return clone;
    }

    syncOverlayPosition() {
      if (!this.overlayActive || !this.overlay || !this.button) return;
      const r = this.button.getBoundingClientRect();
      this.overlay.style.left = `${r.left}px`;
      this.overlay.style.top = `${r.top}px`;
      this.overlay.style.width = `${r.width}px`;
      this.overlay.style.height = `${r.height}px`;
    }

    showOverlay() {
      if (!this.overlay) return;
      this.overlayActive = true;
      this.syncOverlayPosition();
      this.overlay.hidden = false;
    }

    hideOverlay() {
      if (!this.overlay) return;
      this.overlayActive = false;
      this.overlay.hidden = true;
      if (window.gsap) {
        window.gsap.set(this.overlay, { clearProps: 'backgroundColor,borderColor,color' });
      }
    }

    kill() {
      if (this.timeline) {
        this.timeline.kill();
        this.timeline = null;
      }
      this.hideOverlay();
    }

    setTimeScale(scale) {
      if (this.timeline) this.timeline.timeScale(scale);
    }

    readChrome() {
      const cs = getComputedStyle(this.button);
      return {
        backgroundColor: cs.backgroundColor,
        borderColor: cs.borderTopColor,
        color: cs.color,
      };
    }

    _applyPoseToTarget(pose, icon, body, rays, button) {
      if (window.gsap) {
        if (body) {
          if (this.hasMorphSVG) {
            window.gsap.set(body, { morphSVG: pose.body });
          } else {
            body.setAttribute('d', pose.body);
          }
        }
        window.gsap.set(rays, { ...pose.rays, svgOrigin: '12 12' });
        if (icon) window.gsap.set(icon, { rotation: pose.icon, transformOrigin: '50% 50%' });
        if (button) window.gsap.set(button, { clearProps: 'backgroundColor,borderColor,color' });
      } else {
        if (body) body.setAttribute('d', pose.body);
        rays.forEach((line) => {
          line.style.opacity = String(pose.rays.opacity);
        });
      }
    }

    set(theme) {
      this.kill();
      const pose = POSE[theme];
      this._applyPoseToTarget(pose, this.icon, this.body, this.rays, this.button);
      if (this.overlay) {
        this._applyPoseToTarget(pose, this.overlayIcon, this.overlayBody, this.overlayRays, this.overlay);
      }
    }

    morphTo(theme, opts) {
      if (this.timeline) {
        this.timeline.kill();
        this.timeline = null;
      }

      const pose = POSE[theme];
      const useOverlay = Boolean(opts.useOverlay && this.overlay);

      if (useOverlay) {
        this._applyPoseToTarget(pose, this.icon, this.body, this.rays, this.button);
        if (!this.overlayActive) {
          this._applyPoseToTarget(
            POSE[otherTheme(theme)],
            this.overlayIcon,
            this.overlayBody,
            this.overlayRays,
            this.overlay
          );
        }
        this.showOverlay();
      }

      const targetBtn = useOverlay ? this.overlay : this.button;
      const targetIcon = useOverlay ? this.overlayIcon : this.icon;
      const targetBody = useOverlay ? this.overlayBody : this.body;
      const targetRays = useOverlay ? this.overlayRays : this.rays;

      if (!window.gsap) {
        this._applyPoseToTarget(pose, targetIcon, targetBody, targetRays, targetBtn);
        return;
      }

      const tl = window.gsap.timeline({ defaults: { duration: opts.duration, ease: opts.ease } });

      if (targetBody) {
        if (this.hasMorphSVG) {
          tl.to(targetBody, { morphSVG: { shape: pose.body, shapeIndex: 'auto' } }, 0);
        } else {
          tl.call(() => targetBody.setAttribute('d', pose.body), [], opts.duration * 0.25);
        }
      }

      tl.to(targetRays, { ...pose.rays, svgOrigin: '12 12', stagger: opts.duration * 0.035 }, 0);
      if (targetIcon) tl.to(targetIcon, { rotation: pose.icon, transformOrigin: '50% 50%' }, 0);

      if (opts.chromeFrom) {
        Object.assign(targetBtn.style, opts.chromeFrom);
        const delay = opts.chromeDelay || 0;
        const swap = Math.min(0.18, opts.duration * 0.15);
        tl.to(
          targetBtn,
          {
            backgroundColor: () => this._targetChrome().backgroundColor,
            borderColor: () => this._targetChrome().borderColor,
            color: () => this._targetChrome().color,
            duration: swap,
            ease: 'power1.out',
            onComplete: () => {
              window.gsap.set(targetBtn, { clearProps: 'backgroundColor,borderColor,color' });
            },
          },
          delay
        );
      } else {
        window.gsap.set(targetBtn, { clearProps: 'backgroundColor,borderColor,color' });
      }

      tl.timeScale(opts.timeScale);
      this.timeline = tl;
    }

    _targetChrome() {
      const saved = this.button.getAttribute('style') || '';
      this.button.style.removeProperty('background-color');
      this.button.style.removeProperty('border-color');
      this.button.style.removeProperty('color');
      const target = this.readChrome();
      if (saved) {
        this.button.setAttribute('style', saved);
      } else {
        this.button.removeAttribute('style');
      }
      return target;
    }
  }

  // =========================================================================
  // InkTransition Orchestrator (ui/inkTransition.ts)
  // =========================================================================

  function farthestCorner(p) {
    const w = root.clientWidth;
    const h = root.clientHeight;
    return (
      Math.max(
        Math.hypot(p.x, p.y),
        Math.hypot(w - p.x, p.y),
        Math.hypot(p.x, h - p.y),
        Math.hypot(w - p.x, h - p.y)
      ) + 4
    );
  }

  function randomSeed() {
    return {
      x: Math.random() * 64 - 32,
      y: Math.random() * 64 - 32,
      angle: Math.random() * Math.PI * 2,
    };
  }

  function waitForImages() {
    const imgs = Array.from(document.querySelectorAll('img')).filter((img) => img.src && !img.complete);
    if (imgs.length === 0) return Promise.resolve();
    return Promise.race([
      Promise.all(
        imgs.map(
          (img) =>
            new Promise((res) => {
              img.addEventListener('load', res, { once: true });
              img.addEventListener('error', res, { once: true });
            })
        )
      ),
      new Promise((res) => setTimeout(res, 1500)),
    ]);
  }

  class InkTransition {
    constructor(canvas, toggleButton, opts = {}) {
      this.toggleButton = toggleButton;
      this.icon = toggleButton ? new ThemeIcon(toggleButton) : null;
      if (this.icon) this.icon.set(getTheme());

      this.state = { progress: 0, time: 0 };
      this.tween = null;
      this.fade = null;
      this.rafFallbackId = 0;
      this.frame = null;
      this.cssFadeTimer = 0;
      this.replayTimer = 0;
      this.last = null;

      this.captureGen = 0;
      this.capturing = false;
      this.captureQueued = false;
      this.capturePromise = null;
      this.resizeTimer = 0;
      this.pendingToggleToken = 0;
      this.lastObservedDocSize = `${documentSize().width}x${documentSize().height}`;

      this.renderer = opts.webgl === false ? null : InkRenderer.create(canvas);
      if (!this.renderer) {
        root.dataset.ink = 'css';
        return;
      }
      root.dataset.ink = 'webgl';

      this.renderer.resize(renderScale());
      this.renderer.watchContext(
        () => this.cancel(),
        () => this.scheduleCapture(0)
      );

      window.addEventListener('resize', () => {
        if (this.renderer) this.renderer.resize(renderScale());
        if (this.frame) this._draw();
        this.scheduleCapture(RESIZE_DEBOUNCE_MS);
      });

      // Only update active animation when scrolling; DO NOT run html2canvas on scroll!
      window.addEventListener(
        'scroll',
        () => {
          if (this.frame) this._draw();
        },
        { passive: true }
      );

      if ('ResizeObserver' in window) {
        new ResizeObserver(() => {
          const nextSize = `${documentSize().width}x${documentSize().height}`;
          if (nextSize !== this.lastObservedDocSize) {
            this.lastObservedDocSize = nextSize;
            this.scheduleCapture(RESIZE_DEBOUNCE_MS);
          }
        }).observe(document.body);
      }

      reducedMotion.addEventListener('change', () => this.scheduleCapture(0));

      const bootCapture = () => {
        waitForImages().then(() => {
          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => this.scheduleCapture(0), { timeout: 600 });
          } else {
            this.scheduleCapture(120);
          }
        });
      };

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(bootCapture);
      } else {
        bootCapture();
      }
    }

    get isWebGL() {
      return this.renderer !== null;
    }

    get isAnimating() {
      return this.frame !== null;
    }

    get lastClick() {
      return this.last;
    }

    invalidate(delay = INVALIDATE_DEBOUNCE_MS) {
      bumpDomRevision();
      if (this.renderer && !this.renderer.isLost && !reducedMotion.matches) {
        this.scheduleCapture(delay);
      }
    }

    async toggle(point, seed) {
      window.clearTimeout(this.replayTimer);
      const token = ++this.pendingToggleToken;
      const to = otherTheme(getTheme());
      const renderer = this.renderer;

      if (!renderer || renderer.isLost || reducedMotion.matches || typeof window.html2canvas !== 'function') {
        this.cancel();
        this._crossFade(to);
        return;
      }

      const scale = renderScale();
      let key = layoutKey(scale, renderer.maxTextureSize);
      const interrupting = this.frame !== null;
      let ready = renderer.hasValid(to, key) && (interrupting || renderer.hasValid(getTheme(), key));

      if (!ready && !interrupting) {
        await this._captureAll();
        if (token !== this.pendingToggleToken) return;
        key = layoutKey(renderScale(), renderer.maxTextureSize);
        ready = renderer.hasValid(to, key) && renderer.hasValid(getTheme(), key);
      }

      if (!ready) {
        this.cancel();
        this._crossFade(to);
        return;
      }

      this._startWebGLTransition(to, point, seed, interrupting);
    }

    _startWebGLTransition(to, point, seed, interrupting) {
      const renderer = this.renderer;
      const scale = renderScale();
      let from = getTheme();

      if (interrupting) {
        this._killTweens();
        renderer.resize(scale);
        const frozen = this._currentFrame();
        from = frozen && renderer.freeze(frozen) ? 'composite' : getTheme();
      }

      const obstructed = isToggleObstructed();
      const center = point || (obstructed ? { x: root.clientWidth / 2, y: root.clientHeight / 2 } : this._toggleCenter());
      const maxDist = farthestCorner(center);
      const frameSeed = seed || randomSeed();
      this.last = { point: center, seed: frameSeed, from: otherTheme(to) };
      this.frame = { from, to, center, maxDist, seed: frameSeed };
      this.state.progress = 0;
      this.state.time = 0;

      const chromeFrom = this.icon ? this.icon.readChrome() : undefined;
      renderer.resize(scale);
      this._draw();

      if (window.gsap) {
        window.gsap.set(renderer.canvas, { opacity: 1 });
      } else {
        renderer.canvas.style.opacity = '1';
      }
      renderer.canvas.classList.add('is-active');
      applyTheme(to, this.toggleButton);

      const duration = inkParams.duration;
      if (this.icon) {
        this.icon.morphTo(to, {
          duration,
          ease: EASE,
          timeScale: inkParams.timeScale,
          chromeFrom,
          chromeDelay: this._inkArrival(center, maxDist, this._toggleCenter()) * duration,
          useOverlay: !obstructed,
        });
      }

      if (window.gsap) {
        this.tween = window.gsap.to(this.state, {
          progress: 1,
          duration,
          ease: EASE,
          onUpdate: () => {
            this.state.time = this.tween ? this.tween.time() : 0;
            this._draw();
          },
          onComplete: () => this._finish(),
        });
        this.tween.timeScale(inkParams.timeScale);
      } else {
        this._runFallbackRafSpread(duration);
      }
    }

    _runFallbackRafSpread(durationS) {
      const start = performance.now();
      const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);
      const step = (now) => {
        const elapsed = ((now - start) / 1000) * inkParams.timeScale;
        const u = Math.min(1, elapsed / durationS);
        this.state.time = Math.min(durationS, elapsed);
        this.state.progress = easeOutCubic(u);
        this._draw();
        if (u < 1) {
          this.rafFallbackId = requestAnimationFrame(step);
        } else {
          this.rafFallbackId = 0;
          this._finish();
        }
      };
      this.rafFallbackId = requestAnimationFrame(step);
    }

    replay() {
      const last = this.last;
      if (!last) return false;
      window.clearTimeout(this.replayTimer);
      this.cancel();
      if (this.icon) this.icon.kill();
      if (getTheme() !== last.from) {
        applyTheme(last.from, this.toggleButton);
        if (this.icon) this.icon.set(last.from);
      }
      this.replayTimer = window.setTimeout(() => {
        void this.toggle(last.point, last.seed);
      }, REPLAY_HOLD_MS);
      return true;
    }

    setTimeScale(scale) {
      inkParams.timeScale = scale;
      if (this.tween) this.tween.timeScale(scale);
      if (this.fade) this.fade.timeScale(scale);
      if (this.icon) this.icon.setTimeScale(scale);
    }

    _currentFrame() {
      if (!this.frame) return null;
      const { progress, time } = this.state;
      const { maxDist } = this.frame;
      const linear = Math.min(1, time / inkParams.duration);
      const ramp = Math.max(0, (linear - SPREAD.cleanupFrom) / (1 - SPREAD.cleanupFrom));
      const cleanup =
        Math.pow(ramp, SPREAD.cleanupPow) * maxDist * SPREAD.cleanupReach +
        Math.max(0, (linear - 0.97) / 0.03) * maxDist;
      return {
        ...this.frame,
        progress,
        time,
        radius: progress * maxDist * SPREAD.growth,
        cleanup,
      };
    }

    _draw() {
      if (this.icon) this.icon.syncOverlayPosition();
      const frame = this._currentFrame();
      if (this.renderer && frame) this.renderer.draw(frame);
    }

    _finish() {
      const canvas = this.renderer ? this.renderer.canvas : null;
      this.tween = null;
      if (!canvas) return;
      if (window.gsap) {
        this.fade = window.gsap
          .to(canvas, { opacity: 0, duration: FADE_OUT, ease: 'none', onComplete: () => this._hide() })
          .timeScale(inkParams.timeScale);
      } else {
        canvas.style.opacity = '0';
        this._hide();
      }
    }

    _hide() {
      this.fade = null;
      this.frame = null;
      if (this.renderer) this.renderer.canvas.classList.remove('is-active');
      if (this.icon) this.icon.hideOverlay();
      if (this.captureQueued) this.scheduleCapture(0);
    }

    _killTweens() {
      if (this.tween) {
        this.tween.kill();
        this.tween = null;
      }
      if (this.fade) {
        this.fade.kill();
        this.fade = null;
      }
      if (this.rafFallbackId) {
        cancelAnimationFrame(this.rafFallbackId);
        this.rafFallbackId = 0;
      }
    }

    cancel() {
      if (!this.frame) return;
      this._killTweens();
      this._hide();
    }

    _crossFade(to) {
      const motion = !reducedMotion.matches;
      root.classList.add('theme-fade');
      root.style.setProperty('--theme-fade', `${CSS_FADE_S}s`);
      applyTheme(to, this.toggleButton);
      if (this.icon) {
        if (motion) {
          this.icon.morphTo(to, {
            duration: CSS_FADE_S * 1.6,
            ease: 'power2.inOut',
            timeScale: 1,
            useOverlay: false,
          });
        } else {
          this.icon.set(to);
        }
      }
      window.clearTimeout(this.cssFadeTimer);
      this.cssFadeTimer = window.setTimeout(() => {
        root.classList.remove('theme-fade');
        if (this.captureQueued) this.scheduleCapture(0);
      }, CSS_FADE_S * 1000 + 50);
    }

    _inkArrival(center, maxDist, target) {
      const dist = Math.hypot(target.x - center.x, target.y - center.y);
      if (dist < 28) return 0;
      const p = Math.min(1, dist / (maxDist * SPREAD.growth * 1.15));
      return Math.min(0.85, 1 - Math.cbrt(1 - p));
    }

    _toggleCenter() {
      const r = this.toggleButton ? this.toggleButton.getBoundingClientRect() : null;
      if (!r) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    scheduleCapture(delay) {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => void this._captureAll(), delay);
    }

    _captureAll() {
      if (this.capturing && this.capturePromise) {
        this.captureQueued = true;
        return this.capturePromise;
      }

      const renderer = this.renderer;
      if (!renderer || renderer.isLost || reducedMotion.matches || typeof window.html2canvas !== 'function') {
        return Promise.resolve();
      }

      if (this.frame || root.classList.contains('theme-fade')) {
        this.captureQueued = true;
        return Promise.resolve();
      }

      const scale = renderScale();
      const key = layoutKey(scale, renderer.maxTextureSize);
      const current = getTheme();
      const themes = [current, otherTheme(current)].filter((t) => !renderer.hasValid(t, key));
      this.captureQueued = false;
      if (themes.length === 0) return Promise.resolve();

      const gen = ++this.captureGen;
      this.capturing = true;

      this.capturePromise = (async () => {
        try {
          for (let i = 0; i < themes.length; i++) {
            // Yield a macrotask between capturing light and dark so UI stays responsive
            if (i > 0) await new Promise((r) => setTimeout(r, 16));
            const theme = themes[i];
            const snap = await capturePage(theme, scale, renderer.maxTextureSize);
            if (gen !== this.captureGen) return;
            if (snap.key !== layoutKey(renderScale(), renderer.maxTextureSize)) {
              this.captureQueued = true;
              break;
            }
            renderer.upload(snap);
          }
        } catch (err) {
          console.error('[ink] capture failed', err);
        } finally {
          this.capturing = false;
          this.capturePromise = null;
          if (this.captureQueued) this.scheduleCapture(RESIZE_DEBOUNCE_MS);
        }
      })();

      return this.capturePromise;
    }
  }

  // =========================================================================
  // Hidden Tuning Controls Panel & Auto Mode (ui/demoPanel.ts, ui/autoMode.ts)
  // =========================================================================

  const SLIDERS = [
    { key: 'duration', label: 'Duration', min: 0.4, max: 4, step: 0.05, format: (v) => `${v.toFixed(2)}s` },
    { key: 'tendril', label: 'Tendrils', min: 0, max: 2.5, step: 0.05, format: (v) => v.toFixed(2) },
    { key: 'noiseScale', label: 'Noise scale', min: 0.4, max: 2.5, step: 0.05, format: (v) => v.toFixed(2) },
    { key: 'softness', label: 'Edge softness', min: 0.5, max: 8, step: 0.1, format: (v) => `${v.toFixed(1)}px` },
    { key: 'drift', label: 'Drift speed', min: 0, max: 4, step: 0.05, format: (v) => v.toFixed(2) },
  ];

  const SLOW_MO = 0.25;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(PANEL_STORAGE_KEY);
      if (!raw) return { showMarker: true };
      const saved = JSON.parse(raw);
      SLIDERS.forEach((s) => {
        const v = saved[s.key];
        if (typeof v === 'number' && Number.isFinite(v)) {
          inkParams[s.key] = clamp(v, s.min, s.max);
        }
      });
      if (saved.timeScale === SLOW_MO) inkParams.timeScale = SLOW_MO;
      return { showMarker: saved.showMarker !== false };
    } catch {
      return { showMarker: true };
    }
  }

  class DemoPanel {
    constructor(ink, opts) {
      this.ink = ink;
      this.opts = opts;
      this.showMarker = opts.showMarker;

      const el = document.createElement('aside');
      el.className = 'demo-panel';
      el.hidden = true;
      el.setAttribute('aria-label', 'Ink demo controls');
      el.setAttribute('data-html2canvas-ignore', '');
      el.innerHTML = `
        <header class="demo-panel__head">
          <span>Ink controls</span>
          <span class="demo-panel__mode">${ink.isWebGL ? 'WebGL2' : 'CSS fallback'}</span>
        </header>
        <div class="demo-panel__sliders"></div>
        <label class="demo-panel__check">
          <input type="checkbox" data-slowmo /> Slow motion 0.25×
        </label>
        <label class="demo-panel__check">
          <input type="checkbox" data-marker /> Tap marker (auto mode)
        </label>
        <div class="demo-panel__actions">
          <button type="button" data-replay disabled>Replay last click</button>
          <button type="button" data-reset class="is-quiet">Reset</button>
        </div>
        <p class="demo-panel__keys"><kbd>D</kbd> panel · <kbd>T</kbd> toggle · <kbd>R</kbd> replay</p>
      `;

      const sliders = el.querySelector('.demo-panel__sliders');
      SLIDERS.forEach((s) => sliders && sliders.appendChild(this._slider(s)));

      const slowmo = el.querySelector('[data-slowmo]');
      if (slowmo) {
        slowmo.checked = inkParams.timeScale === SLOW_MO;
        slowmo.addEventListener('change', () => {
          this.ink.setTimeScale(slowmo.checked ? SLOW_MO : 1);
          this._save();
        });
      }

      const marker = el.querySelector('[data-marker]');
      if (marker) {
        marker.checked = this.showMarker;
        marker.addEventListener('change', () => {
          this.showMarker = marker.checked;
          this.opts.onMarkerChange(marker.checked);
          this._save();
        });
      }

      this.replayButton = el.querySelector('[data-replay]');
      if (this.replayButton) {
        this.replayButton.addEventListener('click', () => this.ink.replay());
      }

      const resetBtn = el.querySelector('[data-reset]');
      if (resetBtn) resetBtn.addEventListener('click', () => this._reset());

      document.body.appendChild(el);
      this.el = el;
    }

    get isOpen() {
      return !this.el.hidden;
    }

    toggle() {
      this.el.hidden = !this.el.hidden;
      if (this.isOpen) this.refresh();
    }

    refresh() {
      if (this.replayButton) {
        this.replayButton.disabled = this.ink.lastClick === null;
      }
    }

    _slider(def) {
      const row = document.createElement('label');
      row.className = 'demo-panel__row';
      row.innerHTML = `
        <span class="demo-panel__label">${def.label}</span>
        <output class="demo-panel__value"></output>
        <input type="range" min="${def.min}" max="${def.max}" step="${def.step}" />
      `;
      const input = row.querySelector('input');
      const output = row.querySelector('output');
      input.dataset.key = def.key;
      input.value = String(inkParams[def.key]);
      output.textContent = def.format(inkParams[def.key]);
      input.addEventListener('input', () => {
        const v = Number(input.value);
        inkParams[def.key] = v;
        output.textContent = def.format(v);
        this._save();
      });
      return row;
    }

    _reset() {
      SLIDERS.forEach((s) => {
        inkParams[s.key] = DEFAULTS[s.key];
        const input = this.el.querySelector(`input[data-key="${s.key}"]`);
        const output = input && input.parentElement ? input.parentElement.querySelector('output') : null;
        if (input) input.value = String(DEFAULTS[s.key]);
        if (output) output.textContent = s.format(DEFAULTS[s.key]);
      });
      const slowmo = this.el.querySelector('[data-slowmo]');
      if (slowmo) slowmo.checked = false;
      this.ink.setTimeScale(1);
      this._save();
    }

    _save() {
      try {
        const data = { timeScale: inkParams.timeScale, showMarker: this.showMarker };
        SLIDERS.forEach((s) => {
          data[s.key] = inkParams[s.key];
        });
        localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* ignore private mode errors */
      }
    }
  }

  function showTapMarker(p) {
    const el = document.createElement('div');
    el.className = 'tap-marker';
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-html2canvas-ignore', '');
    el.style.left = `${p.x}px`;
    el.style.top = `${p.y}px`;
    document.body.appendChild(el);

    if (window.gsap) {
      window.gsap
        .fromTo(
          el,
          { scale: 0.55, opacity: 0.95 },
          {
            scale: 1.7,
            opacity: 0,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => el.remove(),
          }
        )
        .timeScale(inkParams.timeScale);
    } else {
      window.setTimeout(() => el.remove(), 600);
    }
  }

  function startAutoMode(ink, marker, onToggle) {
    let timer = 0;
    const BASE_INTERVAL_MS = 3000;
    const FIRST_DELAY_MS = 1200;

    const interval = () => {
      const spreadMs = ((inkParams.duration + 0.15) / inkParams.timeScale) * 1000;
      return Math.max(BASE_INTERVAL_MS, spreadMs + 900);
    };

    const randomPoint = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      return { x: w * (0.12 + Math.random() * 0.76), y: h * (0.15 + Math.random() * 0.7) };
    };

    const tick = () => {
      if (!document.hidden) {
        const p = randomPoint();
        if (marker()) showTapMarker(p);
        void ink.toggle(p).then(() => onToggle && onToggle());
      }
      timer = window.setTimeout(tick, interval());
    };

    timer = window.setTimeout(tick, FIRST_DELAY_MS);
    return () => window.clearTimeout(timer);
  }

  // =========================================================================
  // Initialization
  // =========================================================================

  function init() {
    const toggle = document.getElementById('themeToggleBtn');
    applyTheme(getTheme(), toggle);

    const canvas = document.createElement('canvas');
    canvas.className = 'ink-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.setAttribute('data-html2canvas-ignore', '');
    document.body.appendChild(canvas);

    const params = new URLSearchParams(location.search);
    const settings = loadSettings();

    const ink = new InkTransition(canvas, toggle, { webgl: params.get('gl') !== '0' });

    let showMarker = settings.showMarker;
    const panel = new DemoPanel(ink, {
      showMarker,
      onMarkerChange: (show) => {
        showMarker = show;
      },
    });

    if (toggle) {
      toggle.addEventListener('click', (e) => {
        const point = e.detail === 0 ? undefined : { x: e.clientX, y: e.clientY };
        void ink.toggle(point).then(() => panel.refresh());
      });
    }

    const TEXT_ENTRY =
      'input:not([type="range"]):not([type="checkbox"]):not([type="button"]), textarea, select, [contenteditable="true"]';

    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target;
      if (target instanceof Element && target.closest(TEXT_ENTRY)) return;

      switch (e.key.toLowerCase()) {
        case 't':
          void ink.toggle().then(() => panel.refresh());
          break;
        case 'd':
          panel.toggle();
          break;
        case 'r':
          ink.replay();
          break;
        default:
          return;
      }
      e.preventDefault();
    });

    if (params.get('auto') === '1') {
      startAutoMode(ink, () => showMarker, () => panel.refresh());
    }

    if (params.get('panel') === '1') {
      panel.toggle();
    }

    window.LumenInk = {
      toggle: (point) => ink.toggle(point).then(() => panel.refresh()),
      invalidate: (delay) => ink.invalidate(delay),
      getTheme,
      ink,
      panel,
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
