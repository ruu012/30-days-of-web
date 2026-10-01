/*!
 * RibbonDots — 點陣緞帶蝴蝶結（可嵌入網頁排版的動態素材）
 * 需要先載入 p5.js（1.x）。使用 p5 instance mode，不會污染全域、同頁可放多個。
 *
 *   const ribbon = RibbonDots.mount('#hero-ribbon', { background: 'transparent' });
 *   ribbon.replay();  ribbon.set({ dotSize: 0.8 });  ribbon.destroy();
 *
 * 詳細說明見 README.md
 */
(function (global) {
  'use strict';

  // ───────────────────────── 圖形資料（原圖座標） ─────────────────────────
  // 控制點：[x, y, 寬度倍率, 圖層深度, 飄動量]
  // 深度越大越上層；交叉處 A、B 輪流上下 → 編織。兩層蝴蝶結重疊在同一個結上。
  const RIBBON_A = [
    [166, 84, .5, 0, 0], [184, 93, .35, 2, 0], [255, 113, 1, 2, 0], [326, 134, .3, 0, 0],
    [257, 157, 1, 0, 0], [188, 180, .3, 2, 0], [262, 204, 1, 2, 0], [352, 228, .3, 1, 0],
    [315, 250, .9, 1, 0], [270, 266, .35, 1, .05],
    [320, 252, 1, 1, .12], [368, 256, 1, 1, .18], [392, 282, 1, 1, .22], [382, 314, 1, 1, .22],
    [342, 326, 1, 1, .18], [298, 300, .8, 1, .1],
    [268, 276, .3, 3, .05],
    [236, 286, .9, 2, .1], [190, 300, 1, 2, .2], [140, 318, 1, 2, .25], [122, 350, 1, 2, .28],
    [146, 378, 1, 2, .28], [196, 370, 1, 2, .24], [240, 320, .8, 2, .12],
    [270, 282, .3, 3, .08],
    [286, 330, .9, 3, .25], [304, 392, 1, 3, .4], [292, 452, .85, 3, .55], [316, 512, 1, 3, .7],
    [336, 572, .9, 3, .82], [322, 628, 1, 3, .92], [346, 690, .8, 3, 1],
  ];
  const RIBBON_B = [
    [352, 84, .5, 0, 0], [334, 93, .35, 1, 0], [263, 113, 1, 1, 0], [193, 134, .3, 2, 0],
    [262, 157, 1, 2, 0], [330, 180, .3, 0, 0], [259, 204, 1, 0, 0], [168, 228, .3, 1, 0],
    [220, 250, .9, 1, 0], [266, 266, .35, 1, .05],
    [216, 252, 1, 1, .12], [168, 256, 1, 1, .18], [144, 282, 1, 1, .22], [154, 314, 1, 1, .22],
    [194, 326, 1, 1, .18], [238, 300, .8, 1, .1],
    [268, 276, .3, 0, .05],
    [300, 286, .9, 0, .1], [346, 300, 1, 0, .2], [396, 318, 1, 0, .25], [414, 350, 1, 0, .28],
    [390, 378, 1, 0, .28], [340, 370, 1, 0, .24], [296, 320, .8, 0, .12],
    [266, 282, .3, 4, .08],
    [250, 330, .9, 4, .25], [234, 390, 1, 4, .4], [246, 440, .85, 4, .6], [224, 490, 1, 4, .8],
    [214, 532, .8, 4, 1],
  ];
  const KNOT = { idx: 24, pts: [[261, 261, .6, 6, .05], [268, 277, 1.15, 6, .06], [265, 293, .6, 6, .08]] };
  const EXTRA_TAILS = [
    [[262, 286, .35, 5, .08], [238, 324, .9, 5, .2], [210, 364, 1, 5, .35], [194, 410, .9, 5, .55], [206, 458, .8, 5, .75]],
    [[276, 286, .35, 2, .08], [300, 326, .9, 2, .2], [322, 366, 1, 2, .35], [332, 410, .9, 2, .55], [352, 450, .8, 2, .75]],
  ];
  const EYELETS = [[184, 93], [334, 93], [193, 134], [326, 134], [188, 180], [330, 180], [168, 228], [352, 228]];

  // 圖形實際外框（原圖座標），用來把緞帶貼合容器
  const BBOX = { cx: 269, cy: 392, w: 318, h: 640 };
  const HW = 9.5; // 緞帶半寬

  // 暫存畫布的代表色：黑=背景、白=緞帶、綠=孔眼
  const KEY_BG = [0, 0, 0], KEY_RIBBON = [255, 255, 255], KEY_EYELET = [0, 255, 0];

  const DEFAULTS = {
    background: '#FA68B8',   // 背景色；'transparent' = 透明，透出網頁底色
    ribbonColor: '#FFFFFF',  // 緞帶點的顏色
    eyeletColor: '#F3C8D8',  // 孔眼點的顏色
    dotSize: 0.6,            // 點的大小（相對於間距）0.1–1
    spacing: 4.4,            // 點的分布（間距，原圖單位）2.5–10
    dotShape: 'x',           // 'x'（目前成品的樣式）或 'circle'
    xWeight: 0.13,           // dotShape 為 'x' 時的線條粗細（相對於一格）
    fit: 0.92,               // 緞帶佔容器的比例（1 = 剛好貼齊）
    offsetX: 0,              // 位置微調（px）
    offsetY: 0,
    growMs: 8000,            // 編織動畫時間
    delayMs: 400,
    skipMs: 0,               // 切掉動畫開頭的毫秒數（0 = 從頭開始）
    boostMs: 0,              // 開場加速的時間長度（毫秒），0 = 不加速
    boostFactor: 2.5,        // 開場加速倍率
    sway: true,              // 完成後尾巴輕輕飄動
    playWhenVisible: true,   // 捲動到畫面內才開始播放；離開畫面暫停，節省效能
    clickToReplay: true,     // 點擊重播
    controls: false,         // 顯示 Dot Size / Dot Spacing 拉桿
    hands: false,            // 手勢控制：true 或 { pinchMin, pinchMax, smooth, swap, preview }
    pixelDensity: null,      // null = 跟隨螢幕
    onComplete: null,        // 編織動畫完成時呼叫
  };
  const HAND_DEFAULTS = { pinchMin: 0.15, pinchMax: 1.0, smooth: 0.2, swap: false, preview: true };

  // ───────────────────────── 小工具 ─────────────────────────
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const cr = (a, b, c, d, t) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);

  function toRGB(c) {
    if (c == null || c === 'transparent') return null;
    if (Array.isArray(c)) return c.slice(0, 3);
    let h = String(c).trim().replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const css = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

  function buildSamples(pts, t, sway) {
    const P = pts.map((p) => ({
      x: p[0] + p[4] * sway * 11 * Math.sin(t * 1.3 - p[1] * 0.012),
      y: p[1] + p[4] * sway * 3 * Math.cos(t * 1.1 - p[1] * 0.01),
      w: p[2], d: p[3],
    }));
    const S = [];
    S.spanStart = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
      const n = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2));
      S.spanStart[i] = S.length;
      for (let k = 0; k < n; k++) {
        const u = k / n;
        S.push({
          x: cr(p0.x, p1.x, p2.x, p3.x, u),
          y: cr(p0.y, p1.y, p2.y, p3.y, u),
          w: lerp(p1.w, p2.w, u * u * (3 - 2 * u)),
          d: p1.d,
        });
      }
    }
    const lp = P[P.length - 1];
    S.spanStart[P.length - 1] = S.length;
    S.push({ x: lp.x, y: lp.y, w: lp.w, d: P[P.length - 2].d });
    let acc = 0;
    for (let i = 0; i < S.length; i++) {
      if (i > 0) acc += Math.hypot(S[i].x - S[i - 1].x, S[i].y - S[i - 1].y);
      S[i].L = acc;
      const pa = S[Math.max(i - 1, 0)], pb = S[Math.min(i + 1, S.length - 1)];
      let tx = pb.x - pa.x, ty = pb.y - pa.y;
      const m = Math.hypot(tx, ty) || 1;
      tx /= m; ty /= m;
      S[i].tx = tx; S[i].ty = ty; S[i].nx = -ty; S[i].ny = tx;
    }
    return S;
  }

  function revealIndex(S, frac) {
    const target = frac * S[S.length - 1].L;
    let rev = 0;
    while (rev < S.length - 1 && S[rev + 1].L <= target) rev++;
    return rev;
  }

  // ───────────────────────── 手勢（MediaPipe，選用） ─────────────────────────
  async function startHands(state, cfg, container) {
    const url = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
    state.status = 'Loading hand tracking…';
    let video = null, stream = null, stopped = false;
    const stop = () => {
      stopped = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (video) video.remove();
    };
    state.stop = stop;
    try {
      const { FilesetResolver, HandLandmarker } = await import(url + '/vision_bundle.mjs');
      const fileset = await FilesetResolver.forVisionTasks(url + '/wasm');
      const opts = (delegate) => ({
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate,
        },
        runningMode: 'VIDEO', numHands: 2,
      });
      let lm;
      try { lm = await HandLandmarker.createFromOptions(fileset, opts('GPU')); }
      catch (e) { lm = await HandLandmarker.createFromOptions(fileset, opts('CPU')); }

      video = document.createElement('video');
      video.playsInline = true; video.muted = true;
      Object.assign(video.style, {
        position: 'absolute', top: '12px', right: '12px', width: '140px', borderRadius: '10px',
        transform: 'scaleX(-1)', opacity: '0.85', zIndex: '2', display: cfg.preview ? 'block' : 'none',
      });
      container.appendChild(video);

      while (!stream && !stopped) {
        try {
          state.status = 'Allow camera access…';
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        } catch (e) {
          if (e && (e.name === 'NotReadableError' || /in use/i.test(e.message || ''))) {
            state.status = 'Camera in use by another app (retrying…)';
            await new Promise((r) => setTimeout(r, 2000));
          } else throw e;
        }
      }
      if (stopped) { stop(); return; }
      video.srcObject = stream;
      await video.play();

      let lastT = -1;
      const loop = () => {
        if (stopped) return;
        if (video.readyState >= 2 && video.currentTime !== lastT) {
          lastT = video.currentTime;
          const r = lm.detectForVideo(video, performance.now());
          const labels = r.handedness || r.handednesses || [];
          const hands = (r.landmarks || []).map((p, i) => ({
            d: Math.hypot(p[4].x - p[8].x, p[4].y - p[8].y) / (Math.hypot(p[0].x - p[9].x, p[0].y - p[9].y) || 1e-6),
            label: labels[i] && labels[i][0] ? labels[i][0].categoryName : '',
            x: p[0].x,
          }));
          let L = null, R = null;
          if (hands.length === 2 && hands[0].label === hands[1].label) {
            hands.sort((a, b) => b.x - a.x); L = hands[0].d; R = hands[1].d;
          } else {
            // 鏡頭原始畫面沒有鏡像：MediaPipe 的 "Right" 是使用者的左手
            for (const h of hands) { if (h.label === 'Right') L = h.d; else R = h.d; }
          }
          if (cfg.swap) [L, R] = [R, L];
          state.left = L; state.right = R;
          state.status = hands.length ? 'Tracking' : 'No hands';
        }
        requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      state.status = 'Error: ' + (e && e.message ? e.message : e);
      console.error('[RibbonDots] hands:', e);
    }
  }

  // ───────────────────────── 掛載 ─────────────────────────
  function mount(target, userOpts) {
    if (typeof global.p5 === 'undefined') throw new Error('[RibbonDots] 請先載入 p5.js');
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) throw new Error('[RibbonDots] 找不到容器：' + target);

    const o = Object.assign({}, DEFAULTS, userOpts || {});
    const handCfg = o.hands ? Object.assign({}, HAND_DEFAULTS, o.hands === true ? {} : o.hands) : null;
    const reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

    const state = {
      startTime: null, visible: !o.playWhenVisible, completed: false,
      hand: { left: null, right: null, status: '' },
    };
    let inst = null, ui = null, ro = null, io = null;

    const sketch = (p) => {
      let gfx = null;

      p.setup = () => {
        const c = p.createCanvas(Math.max(1, el.clientWidth), Math.max(1, el.clientHeight));
        c.elt.style.display = 'block';
        c.elt.setAttribute('aria-hidden', 'true');
        if (o.pixelDensity) p.pixelDensity(o.pixelDensity);
        if (o.clickToReplay) c.mousePressed(() => api.replay());
        if (o.controls) ui = buildControls();
        if (state.visible) state.startTime = p.millis();
      };

      p.draw = () => {
        if (!state.visible && o.playWhenVisible) return;
        if (state.startTime === null) state.startTime = p.millis();
        applyHands();

        const t = p.millis() / 1000;
        let el2 = p.millis() - state.startTime - o.delayMs;
        if (o.skipMs > 0) el2 += o.skipMs;   // 直接從動畫的第 skipMs 毫秒開始（切掉開頭）
        // 開場加速：前 boostMs 毫秒以 boostFactor 倍速進行，之後接回原本速度（0 = 不加速）
        if (o.boostMs > 0 && el2 > 0) el2 = el2 < o.boostMs ? el2 * o.boostFactor : el2 + o.boostMs * (o.boostFactor - 1);
        const prog = reduceMotion ? 1 : ease(clamp(el2 / o.growMs, 0, 1));
        const sway = (!o.sway || reduceMotion) ? 0 : ease(clamp((el2 - o.growMs * 0.8) / 2000, 0, 1));
        if (prog >= 1 && !state.completed) { state.completed = true; if (o.onComplete) o.onComplete(); }

        const uiH = ui && ui.panel.style.display !== 'none' ? ui.panel.offsetHeight + 40 : 0;
        const areaH = p.height - uiH;
        const s = Math.min(p.width / BBOX.w, areaH / BBOX.h) * o.fit;
        const spacing = o.spacing;
        const CELL = spacing * s;
        const cols = Math.ceil(p.width / CELL), rows = Math.ceil(p.height / CELL);
        if (!gfx || gfx.width !== cols || gfx.height !== rows) {
          if (gfx) gfx.remove();
          gfx = p.createGraphics(cols, rows);
          gfx.pixelDensity(1);
        }

        gfx.background(0);
        gfx.push();
        gfx.scale(1 / CELL);
        gfx.translate(p.width / 2 + o.offsetX, areaH / 2 + o.offsetY);
        gfx.scale(s);
        gfx.translate(-BBOX.cx, -BBOX.cy);

        const ribbons = [RIBBON_A, RIBBON_B].map((pts) => {
          const S = buildSamples(pts, t, sway);
          return { S, rev: revealIndex(S, prog), notchStart: true };
        });

        let thr = 0;
        for (const r of ribbons) thr = Math.max(thr, r.S[r.S.spanStart[KNOT.idx]].L / r.S[r.S.length - 1].L);
        const knotP = clamp((prog - thr) / 0.035, 0, 1);
        const eStart = thr + 0.035;
        const eP = ease(clamp((prog - eStart) / Math.max(0.05, 1 - eStart), 0, 1));

        const all = ribbons.slice();
        if (eP > 0) for (const pts of EXTRA_TAILS) {
          const S = buildSamples(pts, t, sway);
          all.push({ S, rev: revealIndex(S, eP), notchStart: false });
        }
        for (let depth = 0; depth <= 5; depth++) for (const r of all) drawDepth(r.S, r.rev, depth, r.notchStart);

        // 孔眼：壓在緞帶上，緞帶從圈中穿過
        gfx.noFill();
        gfx.stroke(...KEY_EYELET);
        gfx.strokeWeight(spacing * 1.18);
        for (const [x, y] of EYELETS) gfx.circle(x, y, 13);

        if (knotP > 0) {
          const S = buildSamples(KNOT.pts, t, sway);
          drawRun(S, 0, revealIndex(S, knotP), 'flat', 'flat');
        }
        gfx.pop();
        renderDots(CELL);

        function drawDepth(S, rev, depth, notchStart) {
          if (rev < 1) return;
          let i = 0;
          while (i <= rev) {
            if (S[i].d !== depth) { i++; continue; }
            const a = i;
            while (i <= rev && S[i].d === depth) i++;
            const b = i - 1;
            const startCap = a === 0 && notchStart ? 'notch' : null;
            let endCap = null;
            if (b === rev) endCap = rev === S.length - 1 ? 'notch' : 'flat';
            drawRun(S, Math.max(a - 1, 0), Math.min(b + 1, rev), startCap, endCap);
          }
        }

        function drawRun(S, a, b, startCap, endCap) {
          if (b - a < 1) return;
          const L = [], R = [];
          for (let j = a; j <= b; j++) {
            const q = S[j], hw = HW * q.w;
            L.push({ x: q.x + q.nx * hw, y: q.y + q.ny * hw });
            R.push({ x: q.x - q.nx * hw, y: q.y - q.ny * hw });
          }
          const f = S[a], l = S[b];
          const endN = endCap === 'notch' ? { x: l.x - l.tx * HW * l.w * 1.1, y: l.y - l.ty * HW * l.w * 1.1 } : null;
          const startN = startCap === 'notch' ? { x: f.x + f.tx * HW * f.w * 1.1, y: f.y + f.ty * HW * f.w * 1.1 } : null;

          gfx.noStroke();
          gfx.fill(...KEY_RIBBON);
          gfx.beginShape();
          for (const q of L) gfx.vertex(q.x, q.y);
          if (endN) gfx.vertex(endN.x, endN.y);
          for (let j = R.length - 1; j >= 0; j--) gfx.vertex(R[j].x, R[j].y);
          if (startN) gfx.vertex(startN.x, startN.y);
          gfx.endShape(p.CLOSE);

          // 背景色細邊：點陣化後重疊處空出一排縫
          gfx.stroke(...KEY_BG);
          gfx.strokeWeight(spacing * 0.77);
          line(L); line(R);
          const lastL = L[L.length - 1], lastR = R[R.length - 1];
          if (endN) { line([lastL, endN]); line([endN, lastR]); }
          if (startN) { line([L[0], startN]); line([startN, R[0]]); }
        }

        function line(arr) {
          gfx.noFill();
          gfx.beginShape();
          for (const q of arr) gfx.vertex(q.x, q.y);
          gfx.endShape();
        }
      };

      function renderDots(CELL) {
        gfx.loadPixels();
        const bg = toRGB(o.background);
        if (bg) p.background(...bg); else p.clear();
        const px = gfx.pixels, W = gfx.width, H = gfx.height;
        const pr = new Path2D(), pe = new Path2D();
        const circle = o.dotShape === 'circle';
        const r = CELL * o.dotSize / 2 * (circle ? 1 : 0.72);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = 4 * (y * W + x);
            const R = px[i], G = px[i + 1], B = px[i + 2];
            // 最接近哪個代表色
            const dBg = R * R + G * G + B * B;
            const dRib = (R - 255) ** 2 + (G - 255) ** 2 + (B - 255) ** 2;
            const dEye = R * R + (G - 255) ** 2 + B * B;
            if (dBg <= dRib && dBg <= dEye) continue;
            const path = dEye < dRib ? pe : pr;
            const cx = (x + 0.5) * CELL, cy = (y + 0.5) * CELL;
            if (circle) {
              path.moveTo(cx + r, cy);
              path.arc(cx, cy, r, 0, Math.PI * 2);
            } else {
              path.moveTo(cx - r, cy - r); path.lineTo(cx + r, cy + r);
              path.moveTo(cx + r, cy - r); path.lineTo(cx - r, cy + r);
            }
          }
        }
        const ctx = p.drawingContext;
        const draw = (path, col) => {
          if (circle) { ctx.fillStyle = css(col); ctx.fill(path); }
          else {
            ctx.strokeStyle = css(col);
            ctx.lineWidth = CELL * o.xWeight;
            ctx.lineCap = 'round';
            ctx.stroke(path);
          }
        };
        draw(pr, toRGB(o.ribbonColor));
        draw(pe, toRGB(o.eyeletColor));
      }

      function buildControls() {
        const panel = document.createElement('div');
        Object.assign(panel.style, {
          position: 'absolute', left: '50%', bottom: '24px', transform: 'translateX(-50%)',
          padding: '12px 14px', background: 'rgba(255,255,255,0.88)', borderRadius: '12px',
          font: '14px/1.4 system-ui, -apple-system, "PingFang TC", "Noto Sans TC", sans-serif',
          color: '#7a2150', display: 'grid', gridTemplateColumns: 'auto 160px 3.5em',
          gap: '8px 10px', alignItems: 'center', zIndex: '3',
        });
        const row = (label, min, max, step, key, digits) => {
          const name = document.createElement('span'); name.textContent = label;
          const input = document.createElement('input');
          Object.assign(input, { type: 'range', min, max, step, value: o[key] });
          Object.assign(input.style, { width: '160px', accentColor: '#fa68b8' });
          const val = document.createElement('span');
          Object.assign(val.style, { fontVariantNumeric: 'tabular-nums', textAlign: 'right' });
          val.textContent = Number(o[key]).toFixed(digits);
          input.addEventListener('input', () => { o[key] = parseFloat(input.value); val.textContent = o[key].toFixed(digits); });
          panel.append(name, input, val);
          return { input, val, digits };
        };
        const size = row('Dot Size', 0.1, 1, 0.01, 'dotSize', 2);
        const spacing = row('Dot Spacing', 2.5, 10, 0.1, 'spacing', 1);
        const status = document.createElement('div');
        Object.assign(status.style, { gridColumn: '1 / -1', fontSize: '12px', opacity: '0.8', display: handCfg ? 'block' : 'none' });
        panel.append(status);
        el.appendChild(panel);
        return { panel, size, spacing, status };
      }

      // 手勢 → 數值（平滑），同步更新拉桿顯示
      function applyHands() {
        if (!handCfg) return;
        const h = state.hand;
        const map = (d, lo, hi) => lo + clamp((d - handCfg.pinchMin) / (handCfg.pinchMax - handCfg.pinchMin), 0, 1) * (hi - lo);
        if (h.left != null) o.dotSize = lerp(o.dotSize, map(h.left, 0.1, 1), handCfg.smooth);
        if (h.right != null) o.spacing = lerp(o.spacing, map(h.right, 2.5, 10), handCfg.smooth);
        if (ui) {
          for (const [k, r] of [['dotSize', ui.size], ['spacing', ui.spacing]]) {
            r.input.value = o[k]; r.val.textContent = o[k].toFixed(r.digits);
          }
          const f = (v) => (v != null ? v.toFixed(2) : '—');
          ui.status.textContent = `${h.status} · pinch L ${f(h.left)} · R ${f(h.right)}`;
        }
      }
    };

    inst = new global.p5(sketch, el);

    // 容器大小改變時跟著調整
    ro = new ResizeObserver(() => {
      if (inst && inst.resizeCanvas) inst.resizeCanvas(Math.max(1, el.clientWidth), Math.max(1, el.clientHeight));
    });
    ro.observe(el);

    // 進入畫面才播放；離開畫面暫停
    if (o.playWhenVisible && 'IntersectionObserver' in global) {
      io = new IntersectionObserver((entries) => {
        const vis = entries.some((e) => e.isIntersecting);
        state.visible = vis;
        if (vis) inst.loop(); else inst.noLoop();
      }, { threshold: 0.15 });
      io.observe(el);
    } else state.visible = true;

    if (handCfg) startHands(state.hand, handCfg, el);

    const api = {
      /** 重新播放編織動畫 */
      replay() { state.startTime = inst ? inst.millis() : null; state.completed = false; },
      /** 更新設定，例如 set({ dotSize: 0.8, background: 'transparent' }) */
      set(next) {
        Object.assign(o, next || {});
        if (ui) {
          ui.size.input.value = o.dotSize; ui.size.val.textContent = o.dotSize.toFixed(2);
          ui.spacing.input.value = o.spacing; ui.spacing.val.textContent = o.spacing.toFixed(1);
        }
      },
      /** 目前的設定值 */
      get() { return Object.assign({}, o); },
      /** 移除畫布、拉桿、鏡頭，釋放資源 */
      destroy() {
        if (ro) ro.disconnect();
        if (io) io.disconnect();
        if (state.hand.stop) state.hand.stop();
        if (ui) ui.panel.remove();
        if (inst) inst.remove();
        inst = null;
      },
      get p5() { return inst; },
    };
    return api;
  }

  global.RibbonDots = { mount, defaults: DEFAULTS };
})(typeof window !== 'undefined' ? window : this);
