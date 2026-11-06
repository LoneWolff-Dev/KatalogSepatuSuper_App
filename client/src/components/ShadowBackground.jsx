import * as React from "react";

/*
 * ShadowBackground — WebGL mesh-drift background inspired by 21st.dev
 * @serafimcloud/components/shadow-blending (mesh-drift WebGL, 4-colour).
 * Original implementation, zero dependencies, Sage Mist palette.
 * Falls back to a CSS gradient when WebGL is unavailable.
 */

const VERTEX = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uDark;

// Emerald + Mint + Cream palette.
vec3 cream  = vec3(1.000, 0.984, 0.922);
vec3 mint   = vec3(0.655, 0.953, 0.820);
vec3 emerald = vec3(0.016, 0.471, 0.341);
vec3 ink    = vec3(0.102, 0.180, 0.157);

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float t = uTime * 0.08;
  vec2 p = uv * 3.0;

  // Mesh drift: two warped noise fields blending the palette.
  float n1 = noise(p + vec2(t, -t * 0.7));
  float n2 = noise(p * 1.7 - vec2(t * 0.6, t) + n1 * 1.2);
  float n3 = noise(p * 0.8 + vec2(n2, n1) + vec2(0.0, t * 0.4));

  vec3 col = cream;
  col = mix(col, mint, smoothstep(0.35, 0.85, n1) * 0.75);
  col = mix(col, emerald, smoothstep(0.55, 0.95, n2) * 0.65);
  col = mix(col, ink, smoothstep(0.72, 1.05, n3) * 0.28);

  // Soft vignette so content stays readable.
  float vig = smoothstep(1.25, 0.35, length(uv - vec2(0.5)));
  col = mix(col, cream, (1.0 - vig) * 0.22);

  // Film grain.
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.05;

  gl_FragColor = vec4(col, 1.0);
}
`;

export default function ShadowBackground({ className = "", style }) {
  const ref = React.useRef(null);
  const [ok, setOk] = React.useState(true);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) {
      setOk(false);
      return undefined;
    }

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setOk(false);
      return undefined;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uDark = gl.getUniformLocation(prog, "uDark");

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let rafId = null;
    let last = performance.now();
    let acc = 0;
    const draw = (now) => {
      if (!reduce) {
        acc += (now - last) / 1000;
        last = now;
      } else {
        acc = 12;
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, acc);
      gl.uniform1f(uDark, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduce) rafId = requestAnimationFrame(draw);
    };
    draw(last);

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      ro.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div className={`shadow-bg ${ok ? "" : "shadow-bg-fallback"} ${className}`} aria-hidden="true" style={style}>
      <canvas ref={ref} className="shadow-bg-canvas" />
    </div>
  );
}
