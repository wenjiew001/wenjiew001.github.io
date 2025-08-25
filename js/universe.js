;(() => {
  if (window.__universe_inited__) return
  window.__universe_inited__ = true

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark'

  const cfg = {
    t: 0.05,
    colorGiant: '180,184,240',
    colorComet: '226,225,224',
    colorStar:  '226,225,142',
    onlyDark: false   // true=仅暗色显示；false=明暗都显示
  }

  const canvasId = 'universe'
  let canvas, ctx, w, h, starCount, stars = [], rafId = null

  // —— 始终作为“全站背景画布”挂在 body 上 —— //
  function placeCanvas() {
    if (!canvas.parentNode || canvas.parentNode !== document.body) {
      document.body.appendChild(canvas)
    }
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '3',          // 关键层级：在封面遮罩上方、在文字下方（见CSS）
      pointerEvents: 'none'
    })
  }

  function ensureCanvas() {
    canvas = document.getElementById(canvasId) || document.createElement('canvas')
    canvas.id = canvasId
    canvas.setAttribute('aria-hidden', 'true')
    placeCanvas()
    ctx = canvas.getContext('2d')
  }

  function fit() {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1))
    const rect = canvas.getBoundingClientRect()
    canvas.width  = Math.max(1, Math.floor(rect.width  * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    w = rect.width; h = rect.height
    starCount = Math.floor(0.216 * w)
  }

  function Star() {
    this.reset = () => {
      const t = cfg.t
      this.giant = Math.random() * 1000 + 1 < 30
      this.comet = !this.giant && Math.random() * 1000 + 1 < 100
      this.x = Math.random() * (w - 10)
      this.y = Math.random() * h
      this.r = Math.random() * (2.6 - 1.1) + 1.1
      this.dx = (Math.random() * (6*t - t) + t) + (this.comet ? t * (Math.random()*(120-50)+50) : 0) + 2*t
      this.dy = -(Math.random() * (6*t - t) + t) - (this.comet ? t * (Math.random()*(120-50)+50) : 0)
      this.fadingOut = null
      this.fadingIn  = true
      this.opacity   = 0
      this.opacityThresh = Math.random() * (1 - 0.4*(this.comet?1:0) - .2) + .2
      this.do = (Math.random()*(0.002 - 0.0005) + 0.0005) + (this.comet ? 0.001 : 0)
    }
    this.fadeIn = () => { if (this.fadingIn) { this.opacity += this.do; this.fadingIn = !(this.opacity > this.opacityThresh) } }
    this.fadeOut = () => {
      if (!this.fadingOut) return
      this.opacity -= this.do / 2
      if (this.opacity < 0 || this.x > w || this.y < 0) { this.fadingOut = false; this.reset() }
    }
    this.draw = () => {
      ctx.beginPath()
      if (this.giant) {
        ctx.fillStyle = `rgba(${cfg.colorGiant},${this.opacity})`
        ctx.arc(this.x, this.y, 2, 0, Math.PI*2, false)
      } else if (this.comet) {
        ctx.fillStyle = `rgba(${cfg.colorComet},${this.opacity})`
        ctx.arc(this.x, this.y, 1.5, 0, Math.PI*2, false)
        for (let t = 0; t < 30; t++) {
          ctx.fillStyle = `rgba(${cfg.colorComet},${this.opacity - (this.opacity/20)*t})`
          ctx.fillRect(this.x - (this.dx/4)*t, this.y - (this.dy/4)*t - 2, 2, 2)
        }
      } else {
        ctx.fillStyle = `rgba(${cfg.colorStar},${this.opacity})`
        ctx.fillRect(this.x, this.y, this.r, this.r)
      }
      ctx.closePath(); ctx.fill()
    }
    this.move = () => {
      this.x += this.dx; this.y += this.dy
      if (this.fadingOut === false) this.reset()
      if (this.x > w - w/4 || this.y < 0) this.fadingOut = true
    }
    setTimeout(() => {}, 50)
    this.reset()
  }

  function buildStars(){ stars = Array.from({length: starCount}, () => new Star()) }

  function frame() {
    if (cfg.onlyDark && document.documentElement.getAttribute('data-theme') !== 'dark') {
      ctx.clearRect(0, 0, w, h)
      return
    }
    ctx.clearRect(0, 0, w, h)
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]
      s.move(); s.fadeIn(); s.fadeOut(); s.draw()
    }
  }

  function loop(){ frame(); rafId = requestAnimationFrame(loop) }

  function init() {
    ensureCanvas()
    fit()
    buildStars()
    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(loop)
  }

  function onResize(){ fit(); buildStars() }

  document.addEventListener('DOMContentLoaded', init)
  document.addEventListener('pjax:complete', init)
  window.addEventListener('resize', onResize)
})()
