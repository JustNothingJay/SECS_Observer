/**
 * WebGL renderer — projects engine state. Never invents values.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node: no WebGL — export stub
    module.exports = { createRenderer: () => null, isAvailable: () => false };
  } else {
    root.BurnRenderer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERT = [
    'attribute vec2 a_pos;',
    'varying vec2 v_uv;',
    'void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos,0.0,1.0); }',
  ].join('\n');

  const FRAG = [
    'precision highp float;',
    'varying vec2 v_uv;',
    'uniform sampler2D u_tex;',
    'uniform float u_time;',
    'uniform float u_panic;',
    '',
    'void main(){',
    '  vec4 c = texture2D(u_tex, v_uv);',
    '  // R=activity age-ish, G=hop, B=veto, A=adm',
    '  float adm = c.a;',
    '  float act = c.r;',
    '  float hop = c.g;',
    '  float veto = c.b;',
    '  vec3 col;',
    '  if (adm < 0.5) {',
    '    col = vec3(0.02, 0.02, 0.025);',
    '    if (veto > 0.05) col = mix(col, vec3(0.35, 0.04, 0.05), veto);',
    '  } else if (act >= 1.0) {',
    '    float band = mod(hop, 3.0);',
    '    vec3 b0 = vec3(0.56, 0.83, 0.66);',
    '    vec3 b1 = vec3(0.35, 0.54, 0.42);',
    '    vec3 b2 = vec3(0.18, 0.30, 0.23);',
    '    col = band < 1.0 ? b0 : (band < 2.0 ? b1 : b2);',
    '    float pulse = 0.55 + 0.45 * sin(u_time * 0.08 + hop);',
    '    col *= pulse;',
    '  } else if (act > 0.2) {',
    '    col = vec3(0.12, 0.22, 0.16);',
    '  } else {',
    '    float relief = 0.04 + 0.03 * fract(v_uv.x * 17.0 + v_uv.y * 13.0);',
    '    col = vec3(0.04 + relief, 0.08 + relief, 0.06);',
    '    if (veto > 0.05) col = mix(col, vec3(0.5, 0.12, 0.06), veto * 0.8);',
    '  }',
    '  if (u_panic > 0.5) {',
    '    col = mix(col, vec3(0.15, 0.02, 0.02), 0.35);',
    '    col.r += 0.05 * sin(u_time * 0.2);',
    '  }',
    '  gl_FragColor = vec4(col, 1.0);',
    '}',
  ].join('\n');

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  function createRenderer(canvas) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL required for Burn Studio');

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog));
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let grid = 0;
    let rgba = null;
    let frame = 0;

    function ensureGrid(g) {
      if (g === grid) return;
      grid = g;
      rgba = new Uint8Array(g * g * 4);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, g, g, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    function packState(state) {
      ensureGrid(state.grid);
      const n = state.grid * state.grid;
      for (let i = 0; i < n; i++) {
        const o = i * 4;
        const act = state.activity[i];
        const hop = state.hop[i];
        const veto = state.veto[i];
        const adm = state.adm[i];
        // encode floats to bytes
        rgba[o] = Math.min(255, Math.floor(Math.min(act, 16) / 16 * 255));
        rgba[o + 1] = Math.min(255, Math.floor((hop % 16) / 16 * 255));
        rgba[o + 2] = Math.min(255, Math.floor(Math.min(veto, 1) * 255));
        rgba[o + 3] = adm ? 255 : 0;
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function draw(state) {
      if (!state) return;
      frame++;
      packState(state);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texSubImage2D(
        gl.TEXTURE_2D, 0, 0, 0, state.grid, state.grid,
        gl.RGBA, gl.UNSIGNED_BYTE, rgba,
      );
      gl.useProgram(prog);
      const a = gl.getAttribLocation(prog, 'a_pos');
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(gl.getUniformLocation(prog, 'u_tex'), 0);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), frame);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_panic'), state.panic ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    resize();
    window.addEventListener('resize', resize);

    return { draw, resize, gl };
  }

  return { createRenderer, isAvailable: () => true };
});
