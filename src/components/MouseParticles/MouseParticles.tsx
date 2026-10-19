import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import styles from './MouseParticles.module.css'

/**
 * 全站鼠标粒子动效 —— 「夏日午后的蒲公英光斑」。
 *
 * 原生 Canvas 2D 实现，零第三方依赖：
 *  - 鼠标划过：沿轨迹诞生奶白 / 冰蓝 / 淡鹅黄的光点，边轻微左右摇摆边向上飘，
 *    同时慢慢变小、变淡，约 1.5 秒后自然消失。
 *  - 鼠标点击：落点泛起一圈淡淡的冰蓝光晕涟漪，向外扩散后淡去。
 *  - 待机时：极少量光点在画面里随机飘起，让静止时也有呼吸感。
 *
 * 为什么这一版能稳定看见（上一版「消失」的两个原因都修掉了）：
 *  1. 不再用 `innerWidth < 768` 关特效 —— 预览面板 / 窄窗口一窄就整块不渲染，
 *     这是上一版最隐蔽的「丢失」来源。现在只按「是否触屏」判断，窄桌面窗口照常显示。
 *  2. 光斑改用预渲染的柔光贴图（径向渐变精灵），中心亮、外围散，比逐帧
 *     createRadialGradient 更便宜，也能在浅蓝天空背景上保持足够的存在感。
 *
 * 技术底线：
 *  - 画布 portal 到 document.body，position: fixed，pointer-events: none，
 *    绝不挡住任何点击；z-index 9990，低于灯箱（10000）。
 *  - 手机 / 平板（pointer: coarse 或 hover: none）完全不挂载、不监听，省电省性能。
 *  - 尊重「减少动态效果」系统设置：开启时不渲染。
 *  - 任何运行期异常都内部关停并隐藏画布，绝不拖垮整站其它功能。
 */

const TAU = Math.PI * 2

/** 光斑配色：奶白 / 冰蓝 / 淡鹅黄（rgb 分量，便于拼接 rgba） */
const FLAKE_COLORS = ['255, 250, 238', '148, 211, 240', '255, 231, 148'] as const
/** 点击涟漪：冰蓝 */
const RIPPLE_RGB = '126, 199, 232'

const MAX_FLAKES = 180
const MAX_RIPPLES = 24
/** 光斑基础半径（CSS px） */
const BASE_RADIUS = 6
/** 单颗光斑存活时长（秒），约 1.5s */
const TTL_MIN = 1.3
const TTL_MAX = 1.7
/** 鼠标每移动多少 px 撒一颗，兼顾连续与数量 */
const SPAWN_STEP = 7
/** 待机时每隔多少秒飘起一颗 */
const AMBIENT_EVERY = 0.24
/** 精灵贴图边长（像素），绘制时按需缩放 */
const SPRITE_SIZE = 128

interface Flake {
  x: number
  y: number
  vx: number
  vy: number
  phase: number
  swayFreq: number
  swayAmp: number
  born: number
  ttl: number
  maxR: number
  sprite: HTMLCanvasElement
  alpha: number
}

interface Ripple {
  x: number
  y: number
  born: number
  ttl: number
  maxR: number
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/**
 * 手机 / 平板等触屏设备：没有可靠的「光标划过」语义，直接关闭。
 * 注意这里只看指针类型，不看窗口宽度 —— 窄桌面窗口仍应正常显示。
 */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches
  )
}

/**
 * 预渲染一张柔光贴图：中心接近实色，向外几圈快速衰减到透明。
 * 用一次生成、多次 drawImage 的方式绘制，避免每帧为每颗粒子创建径向渐变。
 */
function makeSprite(rgb: string, size = SPRITE_SIZE): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const c = size / 2
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
  gradient.addColorStop(0, `rgba(${rgb}, 1)`)
  gradient.addColorStop(0.16, `rgba(${rgb}, 0.92)`)
  gradient.addColorStop(0.38, `rgba(${rgb}, 0.34)`)
  gradient.addColorStop(0.68, `rgba(${rgb}, 0.1)`)
  gradient.addColorStop(1, `rgba(${rgb}, 0)`)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return canvas
}

export default function MouseParticles() {
  const reduced = usePrefersReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reduced) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (isTouchDevice()) return

    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const ctxEl = canvasEl.getContext('2d')
    // jsdom 等环境 getContext 可能返回 null：安全跳过，不报错
    if (!ctxEl) return
    /* 重新绑定为「声明即非空」的 const，供下方闭包（resize / frame 等）安全使用 */
    const canvas: HTMLCanvasElement = canvasEl
    const ctx: CanvasRenderingContext2D = ctxEl

    /* 三种颜色的柔光贴图只生成一次，后续逐帧 drawImage 复用 */
    const sprites = FLAKE_COLORS.map((rgb) => makeSprite(rgb)).filter(
      (sprite): sprite is HTMLCanvasElement => sprite !== null,
    )
    if (sprites.length === 0) return

    let W = window.innerWidth
    let H = window.innerHeight
    let dpr = 1
    let raf = 0
    let running = true
    let lastTs = 0
    let ambientAcc = 0

    const flakes: Flake[] = []
    const ripples: Ripple[] = []
    /** 上一次鼠标位置；has=false 时说明刚进入窗口，先不连线 */
    const last = { x: 0, y: 0, has: false }

    const now = () =>
      typeof performance !== 'undefined' ? performance.now() : Date.now()

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      // 之后所有绘制都用 CSS px 坐标，DPR 交给 transform 处理
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function spawn(x: number, y: number, alpha = rand(0.62, 0.9)) {
      if (flakes.length >= MAX_FLAKES) flakes.shift()
      flakes.push({
        x: x + rand(-4, 4),
        y: y + rand(-4, 4),
        vx: rand(-14, 14),
        vy: -rand(16, 42), // 负值 = 向上飘
        phase: rand(0, TAU),
        swayFreq: rand(1.4, 3.2),
        swayAmp: rand(12, 30),
        born: now(),
        ttl: rand(TTL_MIN, TTL_MAX),
        maxR: BASE_RADIUS * rand(0.7, 1.3),
        sprite: sprites[Math.floor(Math.random() * sprites.length)],
        alpha,
      })
    }

    function onMove(event: MouseEvent) {
      const x = event.clientX
      const y = event.clientY

      if (!last.has) {
        last.x = x
        last.y = y
        last.has = true
        spawn(x, y)
        return
      }

      const dx = x - last.x
      const dy = y - last.y
      const dist = Math.hypot(dx, dy)
      if (dist < SPAWN_STEP) return

      // 快速滑动时按距离补点，轨迹才连续；最多补 4 颗，避免爆量
      const steps = Math.min(4, Math.floor(dist / SPAWN_STEP))
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        spawn(last.x + dx * t, last.y + dy * t)
      }
      last.x = x
      last.y = y
    }

    function onPointerDown(event: PointerEvent) {
      // 触屏 / 手写笔点击留给移动端原生反馈；这里只处理鼠标
      if (event.pointerType && event.pointerType !== 'mouse') return
      if (ripples.length >= MAX_RIPPLES) ripples.shift()
      ripples.push({
        x: event.clientX,
        y: event.clientY,
        born: now(),
        ttl: rand(1.0, 1.35),
        maxR: rand(58, 112),
      })
    }

    function onLeaveWindow() {
      // 离开窗口后重置起点，回来时不会拉出一条横贯屏幕的直线
      last.has = false
    }

    function removeListeners() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', resize)
      document.removeEventListener('mouseleave', onLeaveWindow)
    }

    function fail(error: unknown) {
      running = false
      cancelAnimationFrame(raf)
      canvas.style.display = 'none'
      removeListeners()
      if (typeof console !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn('[MouseParticles] stopped safely:', error)
      }
    }

    function frame(ts: number) {
      if (!running) return
      raf = requestAnimationFrame(frame)

      try {
        // 后台切回时 ts 可能跳跃很大，钳到 50ms，避免粒子瞬移
        const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 1 / 60
        lastTs = ts

        ctx.clearRect(0, 0, W, H)

        /* 待机呼吸：静止时也偶尔飘起一颗，让画面不显得「特效坏了」 */
        ambientAcc += dt
        if (ambientAcc >= AMBIENT_EVERY) {
          ambientAcc = 0
          spawn(rand(0, W), rand(0, H), rand(0.4, 0.62))
        }

        /* ---- 光斑：摇摆 + 上飘 + 缩小 + 淡出 ---- */
        for (let i = flakes.length - 1; i >= 0; i--) {
          const flake = flakes[i]
          const life = (ts - flake.born) / 1000 / flake.ttl

          if (life >= 1) {
            flakes.splice(i, 1)
            continue
          }
          if (life < 0) continue

          flake.phase += flake.swayFreq * dt
          flake.x += (flake.vx + Math.sin(flake.phase) * flake.swayAmp) * dt
          flake.y += flake.vy * dt

          const fadeIn = Math.min(1, life / 0.12)
          // 最后 30% 快速淡出，像蒲公英绒毛散开
          const fadeOut = life > 0.7 ? Math.max(0, (1 - life) / 0.3) : 1
          const alpha = flake.alpha * fadeIn * fadeOut
          if (alpha <= 0.01) continue

          // 慢慢变小：生命尽头缩到约 18%
          const size = flake.maxR * 6 * (1 - 0.82 * life)
          if (size <= 0.5) continue

          ctx.globalAlpha = alpha
          ctx.drawImage(flake.sprite, flake.x - size / 2, flake.y - size / 2, size, size)
        }
        ctx.globalAlpha = 1

        /* ---- 涟漪：冰蓝光环向外扩散后淡去 ---- */
        for (let i = ripples.length - 1; i >= 0; i--) {
          const ripple = ripples[i]
          const life = (ts - ripple.born) / 1000 / ripple.ttl

          if (life >= 1) {
            ripples.splice(i, 1)
            continue
          }
          if (life < 0) continue

          const ease = 1 - (1 - life) ** 2
          const radius = ripple.maxR * ease
          if (radius <= 0.5) continue

          const alpha = (1 - life) * 0.62 * Math.min(1, life / 0.06)

          ctx.lineWidth = 2.4 * (1 - life * 0.35)
          ctx.strokeStyle = `rgba(${RIPPLE_RGB}, ${alpha})`
          ctx.beginPath()
          ctx.arc(ripple.x, ripple.y, radius, 0, TAU)
          ctx.stroke()

          // 极淡的内圈光晕，让涟漪更像「光」而不是一条硬线
          const glow = ctx.createRadialGradient(
            ripple.x,
            ripple.y,
            radius * 0.2,
            ripple.x,
            ripple.y,
            radius,
          )
          glow.addColorStop(0, `rgba(${RIPPLE_RGB}, 0)`)
          glow.addColorStop(0.75, `rgba(${RIPPLE_RGB}, ${alpha * 0.16})`)
          glow.addColorStop(1, `rgba(${RIPPLE_RGB}, 0)`)
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(ripple.x, ripple.y, radius, 0, TAU)
          ctx.fill()
        }
      } catch (error) {
        // 任何绘制异常都安全关停，绝不让特效拖垮整站
        fail(error)
      }
    }

    canvas.style.display = ''
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.addEventListener('mouseleave', onLeaveWindow)
    raf = requestAnimationFrame(frame)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      removeListeners()
    }
  }, [reduced])

  // 减少动态效果 / 触屏设备：不渲染画布，零干扰
  if (reduced || isTouchDevice()) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />,
    document.body,
  )
}
