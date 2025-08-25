// fish-renderer.js  ——  Vanilla JS + PJAX 兼容
window.FISH_RENDERER = (function () {
  const R = {
    POINT_INTERVAL: 5,
    FISH_COUNT: 3,
    MAX_INTERVAL_COUNT: 50,
    INIT_HEIGHT_RATE: 0.5,
    THRESHOLD: 50,
    WATCH_INTERVAL: 150,

    init() {
      // 避免重复初始化
      const host = document.getElementById('jsi-flying-fish-container');
      if (!host) return;
      if (host.__inited) {
        // 重新计算尺寸，避免 PJAX 后尺寸错乱
        this.setParameters(host, true);
        return;
      }
      host.__inited = true;
      this.setParameters(host, false);
      this.reconstructMethods();
      this.setup();
      this.bindEvent();
      this.render();
    },

    setParameters(container, keepCanvas) {
      this.$win = window;
      this.$doc = document.scrollingElement || document.documentElement;
      this.$container = container;
      if (!keepCanvas) {
        this.$canvas = document.createElement('canvas');
        this.$container.appendChild(this.$canvas);
      } else {
        this.$canvas = this.$container.querySelector('canvas');
        if (!this.$canvas) {
          this.$canvas = document.createElement('canvas');
          this.$container.appendChild(this.$canvas);
        }
      }
      this.ctx = this.$canvas.getContext('2d');
      this.points = [];
      this.fishes = [];
      this.watchIds = [];
    },

    reconstructMethods() {
      this.onResizeTick = this.onResizeTick.bind(this);
      this.onResizeEnd  = this.onResizeEnd.bind(this);
      this.startEpicenter = this.startEpicenter.bind(this);
      this.moveEpicenter  = this.moveEpicenter.bind(this);
      this.reverseVertical = this.reverseVertical.bind(this);
      this.render = this.render.bind(this);
    },

    setup() {
      this.points.length = 0;
      this.fishes.length = 0;
      this.watchIds.length = 0;
      this.intervalCount = this.MAX_INTERVAL_COUNT;

      // 容器尺寸
      this.width  = this.$container.clientWidth;
      this.height = this.$container.clientHeight;
      this.fishCount = Math.max(1, Math.round(this.FISH_COUNT * this.width / 500 * this.height / 500));

      this.$canvas.width  = this.width;
      this.$canvas.height = this.height;

      this.reverse = false;
      this.fishes.push(new FISH(this));      // 初始至少一条
      this.createSurfacePoints();
    },

    createSurfacePoints() {
      const count = Math.max(2, Math.round(this.width / this.POINT_INTERVAL));
      this.pointInterval = this.width / (count - 1);
      this.points.push(new SURFACE_POINT(this, 0));
      for (let i = 1; i < count; i++) {
        const point = new SURFACE_POINT(this, i * this.pointInterval);
        const prev  = this.points[i - 1];
        point.setPreviousPoint(prev);
        prev.setNextPoint(point);
        this.points.push(point);
      }
    },

    bindEvent() {
      // 响应尺寸变化（防抖）
      this.$win.addEventListener('resize', this.onResizeTick, { passive: true });
      // 交互
      this.$container.addEventListener('click', this.reverseVertical, { passive: true });
      this.$container.addEventListener('mouseenter', this.startEpicenter, { passive: true });
      this.$container.addEventListener('mousemove', this.moveEpicenter);
    },

    onResizeTick() {
      this.clearTimers();
      this.tmpW = this.$win.innerWidth;
      this.tmpH = this.$win.innerHeight;
      this.watchIds.push(setTimeout(this.onResizeEnd, this.WATCH_INTERVAL));
    },

    clearTimers() {
      while (this.watchIds.length) clearTimeout(this.watchIds.pop());
    },

    onResizeEnd() {
      const w = this.$win.innerWidth, h = this.$win.innerHeight;
      const stopped = (w === this.tmpW && h === this.tmpH);
      this.tmpW = w; this.tmpH = h;
      if (stopped) this.setup();
    },

    getOffset(el) {
      let top = 0, left = 0;
      while (el && el !== document.body) { top += el.offsetTop; left += el.offsetLeft; el = el.offsetParent; }
      return { top, left };
    },

    getAxis(evt) {
      const off = this.getOffset(this.$container);
      return {
        x: evt.clientX - off.left + (this.$doc.scrollLeft || 0),
        y: evt.clientY - off.top  + (this.$doc.scrollTop  || 0)
      };
    },

    startEpicenter(evt) { this.axis = this.getAxis(evt); },

    moveEpicenter(evt) {
      const axis = this.getAxis(evt);
      if (!this.axis) this.axis = axis;
      this.generateEpicenter(axis.x, axis.y, axis.y - this.axis.y);
      this.axis = axis;
    },

    generateEpicenter(x, y, velocity) {
      if (y < this.height / 2 - this.THRESHOLD || y > this.height / 2 + this.THRESHOLD) return;
      const idx = Math.round(x / this.pointInterval);
      if (idx < 0 || idx >= this.points.length) return;
      this.points[idx].interfere(y, velocity);
    },

    reverseVertical() {
      this.reverse = !this.reverse;
      for (let i = 0; i < this.fishes.length; i++) this.fishes[i].reverseVertical();
    },

    controlStatus() {
      for (let i = 0; i < this.points.length; i++) this.points[i].updateSelf();
      for (let i = 0; i < this.points.length; i++) this.points[i].updateNeighbors();

      if (this.fishes.length < this.fishCount) {
        if (--this.intervalCount === 0) {
          this.intervalCount = this.MAX_INTERVAL_COUNT;
          this.fishes.push(new FISH(this));
        }
      }
    },

    render() {
      requestAnimationFrame(this.render);
      this.controlStatus();
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = 'hsl(0, 0%, 95%)';

      for (let i = 0; i < this.fishes.length; i++) this.fishes[i].render(this.ctx);

      this.ctx.save();
      this.ctx.globalCompositeOperation = 'xor';
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.reverse ? 0 : this.height);
      for (let i = 0; i < this.points.length; i++) this.points[i].render(this.ctx);
      this.ctx.lineTo(this.width, this.reverse ? 0 : this.height);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  };

  function SURFACE_POINT(renderer, x) {
    this.renderer = renderer;
    this.x = x;
    this.init();
  }
  SURFACE_POINT.prototype = {
    SPRING_CONSTANT: 0.03,
    SPRING_FRICTION: 0.9,
    WAVE_SPREAD: 0.3,
    ACCELERATION_RATE: 0.01,

    init() {
      this.initHeight = this.renderer.height * this.renderer.INIT_HEIGHT_RATE;
      this.height = this.initHeight;
      this.fy = 0;
      this.force = { previous: 0, next: 0 };
    },
    setPreviousPoint(p) { this.previous = p; },
    setNextPoint(n) { this.next = n; },
    interfere(y, velocity) {
      const sgn = (this.renderer.height - this.height - y) >= 0 ? -1 : 1;
      this.fy = this.renderer.height * this.ACCELERATION_RATE * sgn * Math.abs(velocity);
    },
    updateSelf() {
      this.fy += this.SPRING_CONSTANT * (this.initHeight - this.height);
      this.fy *= this.SPRING_FRICTION;
      this.height += this.fy;
    },
    updateNeighbors() {
      if (this.previous) this.force.previous = this.WAVE_SPREAD * (this.height - this.previous.height);
      if (this.next)     this.force.next     = this.WAVE_SPREAD * (this.height - this.next.height);
    },
    render(ctx) {
      if (this.previous) { this.previous.height += this.force.previous; this.previous.fy += this.force.previous; }
      if (this.next)     { this.next.height     += this.force.next;     this.next.fy     += this.force.next;     }
      ctx.lineTo(this.x, this.renderer.height - this.height);
    }
  };

  function FISH(renderer) { this.renderer = renderer; this.init(); }
  FISH.prototype = {
    GRAVITY: 0.4,
    getRandom(min, max) { return min + (max - min) * Math.random(); },

    init() {
      const r = this.renderer;
      this.direction = Math.random() < 0.5;
      this.x = this.direction ? (r.width + r.THRESHOLD) : -r.THRESHOLD;
      this.previousY = this.y;
      this.vx = this.getRandom(4, 10) * (this.direction ? -1 : 1);

      if (r.reverse) {
        this.y  = this.getRandom(r.height * 0.1,  r.height * 0.4);
        this.vy = this.getRandom(2, 5);
        this.ay = this.getRandom(0.05, 0.2);
      } else {
        this.y  = this.getRandom(r.height * 0.6,  r.height * 0.9);
        this.vy = this.getRandom(-5, -2);
        this.ay = this.getRandom(-0.2, -0.05);
      }

      this.isOut = false;
      this.theta = 0;
      this.phi   = 0;
    },

    reverseVertical() { this.isOut = !this.isOut; this.ay *= -1; },

    controlStatus(ctx) {
      const r = this.renderer;
      this.previousY = this.y;
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.ay;

      if (r.reverse) {
        if (this.y > r.height * r.INIT_HEIGHT_RATE) { this.vy -= this.GRAVITY; this.isOut = true; }
        else { if (this.isOut) this.ay = this.getRandom(0.05, 0.2); this.isOut = false; }
      } else {
        if (this.y < r.height * r.INIT_HEIGHT_RATE) { this.vy += this.GRAVITY; this.isOut = true; }
        else { if (this.isOut) this.ay = this.getRandom(-0.2, -0.05); this.isOut = false; }
      }

      if (!this.isOut) {
        this.theta = (this.theta + Math.PI / 20) % (Math.PI * 2);
        this.phi   = (this.phi   + Math.PI / 30) % (Math.PI * 2);
      }

      r.generateEpicenter(this.x + (this.direction ? -1 : 1) * r.THRESHOLD, this.y, this.y - this.previousY);

      if ((this.vx > 0 && this.x > r.width + r.THRESHOLD) || (this.vx < 0 && this.x < -r.THRESHOLD)) this.init();
    },

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.PI + Math.atan2(this.vy, this.vx));
      ctx.scale(1, this.direction ? 1 : -1);

      // 身体
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.bezierCurveTo(-20, 15, 15, 10, 40, 0);
      ctx.bezierCurveTo(15, -10, -20, -15, -30, 0);
      ctx.fill();

      // 尾鳍
      ctx.save();
      ctx.translate(40, 0);
      ctx.scale(0.9 + 0.2 * Math.sin(this.theta), 1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(5, 10, 20, 8);
      ctx.quadraticCurveTo(12, 5, 10, 0);
      ctx.quadraticCurveTo(12, -5, 20, -8);
      ctx.quadraticCurveTo(5, -10, 0, 0);
      ctx.fill();
      ctx.restore();

      // 背鳍
      ctx.save();
      ctx.translate(-3, 0);
      ctx.rotate((Math.PI / 3 + Math.PI / 10 * Math.sin(this.phi)) * (this.renderer.reverse ? -1 : 1));
      ctx.beginPath();
      if (this.renderer.reverse) {
        ctx.moveTo(5, 0);
        ctx.bezierCurveTo(10, 10, 10, 30, 0, 40);
        ctx.bezierCurveTo(-12, 25, -8, 10, 0, 0);
      } else {
        ctx.moveTo(-5, 0);
        ctx.bezierCurveTo(-10, -10, -10, -30, 0, -40);
        ctx.bezierCurveTo(12, -25, 8, -10, 0, 0);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore();
      this.controlStatus(ctx);
    }
  };

  return R;
})();
