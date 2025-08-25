// header-ribbon.js —— 顶部“飘带/丝带”特效（只在 #page-header 内绘制）
// 无 jQuery，支持 PJAX、DPR 适配、窗口缩放，默认不拦截点击
window.HEADER_RIBBON = (() => {
  const api = {};
  let host, canvas, ctx, w, h, dpr = 1, rafId = 0;
  let ribbons = [];

  const CFG = {
    ribbons: 3,            // 同时存在的飘带条数
    baseHue: 220,          // 基准色相（0-360），可改 200~260 偏蓝紫；或 330 偏玫红
    hueRange: 40,          // 色相波动范围
    sat: 70,               // 饱和度%
    light: 55,             // 亮度%
    alpha: 0.28,           // 透明度
    speed: 55,             // 前进速度（越大越快）
    amp: 40,               // 起伏幅度（越大越浪）
    segLen: 18,            // 线段长度（越短越细腻）
    thickness: 20,         // 飘带宽度（像素）
    gradient: true,        // 是否用渐变边/内
    onlyDark: false        // 设 true 则仅暗色主题时显示
  };

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

  function ensureCanvas() {
    host = document.querySelector('#page-header');
    if (!host) return false;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'header-ribbon-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      host.style.position = host.style.position || 'relative';
      host.appendChild(canvas);
      Object.assign(canvas.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '2' // 文字一般在 4/5；遮罩可以放 1
      });
      ctx = canvas.getContext('2d');
    } else if (canvas.parentNode !== host) {
      host.appendChild(canvas);
    }
    return true;
  }

  function fit() {
    const rect = host.getBoundingClientRect();
    dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = rect.width; h = rect.height;
  }

  function rand(a,b){ return Math.random()*(b-a)+a; }
  function randi(a,b){ return (Math.random()*(b-a)+a)|0; }
  const TAU = Math.PI * 2;

  // 生成一条新的飘带
  function makeRibbon() {
    const dir = Math.random() < 0.5 ? 1 : -1; // 从左往右 or 右往左
    const y0  = rand(h*0.2, h*0.8);           // 初始高度
    const hue = (CFG.baseHue + randi(-CFG.hueRange, CFG.hueRange) + 360) % 360;

    const ribbon = {
      dir, hue, t: rand(0, TAU),
      speed: CFG.speed / 1000,     // px/ms 基准
      x: dir === 1 ? -50 : w + 50,
      y: y0,
      pts: [],                     // 历史节点
    };
    return ribbon;
  }

  function color(h, a) {
    return `hsla(${h}, ${CFG.sat}%, ${CFG.light}%, ${a})`;
  }

  function stepRibbon(rb, dt) {
    // 前进
    const vx = rb.dir * CFG.segLen;
    // 上下起伏（随时间与 x 变化）
    rb.t += dt * 0.003;
    const vy = Math.sin(rb.t + rb.x * 0.01) * (CFG.amp * (0.6 + 0.4*Math.sin(rb.t*0.7)));

    rb.x += vx * rb.speed * (dt * 60); // dt 相对 60FPS 归一
    rb.y += vy * rb.speed * (dt * 60);

    // 边界回收
    if ((rb.dir === 1 && rb.x > w + 100) || (rb.dir === -1 && rb.x < -100)) {
      // 重置成另一条
      Object.assign(rb, makeRibbon());
    }

    // 追加新点
    const last = rb.pts[rb.pts.length-1];
    if (!last || Math.hypot(rb.x - last.x, rb.y - last.y) > CFG.segLen) {
      rb.pts.push({x: rb.x, y: rb.y});
      if (rb.pts.length > 80) rb.pts.shift(); // 控制历史点数
    }
  }

  function drawRibbon(rb) {
    if (rb.pts.length < 2) return;
    ctx.save();

    // 计算两侧边界（按厚度扩展）
    const L = rb.pts.length;
    const left = [], right = [];
    for (let i=0;i<L;i++){
      const p = rb.pts[i];
      const q = i<L-1 ? rb.pts[i+1] : rb.pts[i];
      const dx = q.x - p.x, dy = q.y - p.y;
      const len = Math.hypot(dx,dy) || 1;
      const nx = -dy/len, ny = dx/len; // 法线
      const half = CFG.thickness/2;
      left.push ({x: p.x + nx*half, y: p.y + ny*half});
      right.push({x: p.x - nx*half, y: p.y - ny*half});
    }

    // 填充主体
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i=1;i<left.length;i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i=right.length-1;i>=0;i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();

    if (CFG.gradient) {
      const p0 = rb.pts[0], p1 = rb.pts[L-1];
      const grd = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      grd.addColorStop(0, color((rb.hue+10)%360, CFG.alpha*0.9));
      grd.addColorStop(1, color((rb.hue-10+360)%360, CFG.alpha*0.6));
      ctx.fillStyle = grd;
    } else {
      ctx.fillStyle = color(rb.hue, CFG.alpha);
    }
    ctx.fill();

    // 边缘淡淡描线（可选）
    ctx.lineWidth = 1;
    ctx.strokeStyle = color(rb.hue, 0.35*CFG.alpha);
    ctx.stroke();

    ctx.restore();
  }

  function loop(ts){
    if (CFG.onlyDark && !isDark()) { ctx.clearRect(0,0,w,h); rafId = requestAnimationFrame(loop); return; }

    // 计算 dt
    loop._last = loop._last || ts;
    const dt = Math.min(50, ts - loop._last); // ms，最大 50 防止卡顿爆动
    loop._last = ts;

    ctx.clearRect(0,0,w,h);
    for (const rb of ribbons){
      stepRibbon(rb, dt);
      drawRibbon(rb);
    }
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    stop();
    if (!ensureCanvas()) return;
    fit();
    ribbons = Array.from({length: CFG.ribbons}, () => makeRibbon());
    rafId = requestAnimationFrame(loop);
  }

  function stop(){ if (rafId) cancelAnimationFrame(rafId); rafId = 0; loop._last = 0; }

  function onResize(){
    if (!host) return;
    fit();
  }

  api.init = () => {
    // 只在有 #page-header 的页面启用
    if (!document.querySelector('#page-header')) return;
    start();
  };

  window.addEventListener('resize', onResize);
  return api;
})();
