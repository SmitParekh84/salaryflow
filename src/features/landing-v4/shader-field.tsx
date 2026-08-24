"use client";

import { useEffect, useRef } from "react";
import styles from "./landing-v4.module.css";

/* ---------------------------------------------------------------------------
   A GPU-drawn field of brand colour behind the page.

   Written against raw WebGL rather than three.js on purpose. The only thing
   this needs is one full-screen quad and one fragment shader; three.js would
   add roughly 600KB to a landing page in order to not use a scene graph, a
   camera, a loader or a material system. There are no new dependencies in this
   draft at all.

   The shader is inlined as a string, which the site's CSP allows — it is not
   `eval`, and nothing is fetched.

   Three things it must survive, because a landing page's background is never
   worth a blank screen:
     · no WebGL context (old machine, blocklisted driver, software rendering
       disabled) — the element reports failure and CSS paints a gradient instead
     · `prefers-reduced-motion` — one frame is drawn and the loop never starts
     · a hidden tab — `requestAnimationFrame` stops on its own, so nothing here
       burns battery in a background tab
   --------------------------------------------------------------------------- */

const VERTEX = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/*
 * Value-noise fbm, three octaves. Deliberately not simplex: this is a slow,
 * soft, out-of-focus field, so the extra cost buys nothing the blur does not
 * already hide.
 *
 * `uScroll` shifts the field's vertical origin, so the colour drifts as the
 * reader travels down the page and the top of the site never looks identical
 * to the bottom. `uPointer` leans it, which is what makes it feel like a
 * surface with depth rather than a looping texture.
 */
const FRAGMENT = `
precision mediump float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uScroll;
uniform vec2 uPointer;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  // Quintic smoothstep — the cubic one leaves visible grid creases at this scale.
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Normalised to 0..1 on return. Three octaves at 0.5/0.25/0.125 sum to at most
// 0.875, and value noise is centred on 0.5, so the raw total sits around 0.44
// with almost nothing above 0.75. Colour thresholds picked against an assumed
// 0..1 range then catch only a sliver of the field and the whole thing renders
// nearly black — which is exactly what happened.
float fbm(vec2 p) {
  float total = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    total += noise(p) * amplitude;
    p *= 2.02;
    amplitude *= 0.5;
  }
  return total / 0.875;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  // Correct for aspect so the field does not stretch into bands on a wide
  // monitor — the thing that makes a shader background look cheap.
  vec2 p = uv;
  p.x *= uResolution.x / uResolution.y;

  float t = uTime * 0.045;
  vec2 lean = uPointer * 0.06;

  float n1 = fbm(p * 1.6 + vec2(t, -t * 0.7 + uScroll * 0.8) + lean);
  float n2 = fbm(p * 2.4 - vec2(t * 0.8, t * 0.4) + n1 * 0.6 + lean * 1.4);

  vec3 deep = vec3(0.020, 0.027, 0.055);
  vec3 cyan = vec3(0.000, 0.812, 0.820);
  vec3 flow = vec3(0.000, 0.722, 0.580);
  vec3 lime = vec3(0.533, 0.910, 0.302);

  // Thresholds sit inside the normalised field's real distribution, so each
  // band actually covers area instead of clipping to nothing.
  vec3 colour = deep;
  colour = mix(colour, cyan, smoothstep(0.30, 0.78, n1) * 0.62);
  colour = mix(colour, flow, smoothstep(0.34, 0.82, n2) * 0.48);
  colour = mix(colour, lime, smoothstep(0.52, 0.95, n1 * n2) * 0.34);

  // Vignette, so the field never competes with text near the edges where the
  // nav and the gutters live.
  float vignette = smoothstep(1.30, 0.20, length(uv - 0.5));
  colour *= 0.48 + vignette * 0.52;

  // Dither. Three mixed gradients on a dark ground band badly on 8-bit
  // displays, and a little noise is cheaper than a higher bit depth.
  colour += (hash(gl_FragCoord.xy) - 0.5) * 0.012;

  gl_FragColor = vec4(colour, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Not thrown: a shader that will not compile is a reason to fall back to the
    // CSS gradient, not a reason to take the page down.
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ShaderField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      // A decorative background has no business waking a discrete GPU.
      powerPreference: "low-power",
    });

    if (!gl) {
      canvas.dataset.failed = "true";
      return;
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();

    if (!vertex || !fragment || !program) {
      canvas.dataset.failed = "true";
      return;
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.dataset.failed = "true";
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uScroll = gl.getUniformLocation(program, "uScroll");
    const uPointer = gl.getUniformLocation(program, "uPointer");

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let scroll = 0;

    const resize = () => {
      // Capped at 1.5: this is an out-of-focus field, so a 3x buffer costs three
      // times the fill rate to render noise nobody can resolve.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uResolution, width, height);
    };

    const onPointer = (event: PointerEvent) => {
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scroll = max > 0 ? window.scrollY / max : 0;
    };

    const draw = (time: number) => {
      resize();
      // Eased towards the pointer rather than snapped to it: a field that tracks
      // the cursor exactly reads as a cheap mouse-follow effect.
      pointer.x += (target.x - pointer.x) * 0.04;
      pointer.y += (target.y - pointer.y) * 0.04;
      gl.uniform1f(uTime, time / 1000);
      gl.uniform1f(uScroll, scroll);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let frame = 0;
    const loop = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(loop);
    };

    resize();
    onScroll();

    // One frame now, synchronously, in every case. The context is opaque
    // (`alpha: false`), so an undrawn canvas is a black rectangle covering the
    // CSS gradient underneath it — and the first `requestAnimationFrame` is not
    // guaranteed to be soon: it never fires at all while the tab is in the
    // background, and is merely late on a busy first paint. Painting once up
    // front means the field is always the field, never a black hole.
    draw(0);

    if (!still) {
      frame = requestAnimationFrame(loop);
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (still) draw(0);
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      /*
       * Deliberately NOT `WEBGL_lose_context.loseContext()` here.
       *
       * Forcing the context to be lost kills it for the canvas *element*, not
       * for this effect run — and React re-runs effects on the same element
       * (StrictMode does it on every mount in development, Fast Refresh does it
       * on every edit). The second run then gets `null` from `getContext` and
       * the page silently falls back to the CSS gradient, which is exactly the
       * bug this comment exists to prevent someone re-introducing.
       *
       * Deleting the buffer, program and shaders above is the cleanup that
       * matters. The drawing buffer goes when the canvas is collected, and the
       * canvas is only ever collected once this component is really gone.
       */
    };
  }, []);

  return <canvas className={styles.field} ref={canvasRef} aria-hidden />;
}
