import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import styles from './LightboxZoom.module.css'

/*
 * 灯箱图片的缩放 + 放大后拖拽平移 —— 纯手写实现，不依赖任何第三方库。
 *
 * 为什么手写（站主拍的决定）：之前换成 react-zoom-pan-pinch（带「放大后拖拽平移」），
 * 装上它之后全站旧版鼠标跟随特效在站主机器上彻底看不见了。排查过一轮没定位到
 * 库与画布之间确凿的因果关系，站主明确表态优先级。于是那次把库卸掉，退回最小实现，
 * 代价是「放大后拖拽平移」被暂时拿掉。
 *
 * 现在站主希望把平移找回来，且要求「最稳妥、绝不白屏 / 卡死」。这里仍然手写、不重新引入
 * 任何库，理由是：手写可以把边界、坐标换算、异常分支完全攥在自己手里，比再冒一次「装库
 * 又把某处带崩」的风险更可控。实现要点：
 *   - 缩放仍以中心为锚点（transform-origin: center），行为与之前完全一致；
 *   - 放大后（scale>1）额外叠加一层以「屏幕像素」计的 translate；
 *   - 平移边界 = (放大后尺寸 − 视口尺寸) / 2，用 getBoundingClientRect 实时量出来，
 *     始终把图夹在视口内 —— 既不会拖出画面留出空白，也绝不会产生 NaN 坐标或把图甩飞；
 *   - jsdom / 拿不到尺寸时直接回中（offset 归零），保证测试环境也不会出任何异常值；
 *   - 滚轮缩放 / − + 按钮 / 双击复位 / 点空地关闭 全部保留。
 */

/** 缩放范围：1 倍是原尺寸，上限 3 倍（再大就是纯噪点了） */
export const MIN_SCALE = 1
export const MAX_SCALE = 3
/** 每档步长：一格滚轮 / 一次按钮 0.15，约 1.15 倍 */
const STEP = 0.15
/** 浮点误差容忍度，避免 disabled 判断在 3.0000000000000004 上抖动 */
const EPSILON = 0.001
/** 判定「算一次点击而非拖拽」的位移阈值（px），超过就当作拖拽、不关灯箱 */
const CLICK_SLOP = 6

export interface LightboxZoomLabels {
  zoomIn: string
  zoomOut: string
  zoomReset: string
}

const clampScale = (value: number) => Math.min(Math.max(value, MIN_SCALE), MAX_SCALE)

/**
 * 用法：把灯箱里的 <img>（或包着它的容器）作为 children 传进来即可。
 * 缩放 + 平移施加在包着 children 的「视口」层上（data-testid="lightbox-zoom"），
 * 不去动 children 自己的样式。
 */
export default function LightboxZoom({
  children,
  labels,
  onBackgroundClick,
}: {
  children: ReactNode
  labels: LightboxZoomLabels
  onBackgroundClick: () => void
}) {
  const [scale, setScale] = useState(MIN_SCALE)
  /** 放大后平移的屏幕像素位移；只有 scale>1 时才有意义 */
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  /** 按下位置，用来区分「点击」和「拖动」（避免拖完顺手关掉灯箱） */
  const pressRef = useRef<{ x: number; y: number } | null>(null)
  /** 一次拖拽会话的起始信息与平移边界 */
  const dragRef = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
    maxX: number
    maxY: number
  } | null>(null)
  /** 让 zoomBy 读取最新 scale 而不必每次重建（避免重新订阅滚轮监听） */
  const scaleRef = useRef(scale)
  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  /**
   * 把位移夹在「放大后超出视口的部分」之内。
   * 取放大后（viewportRect）与视口（stageRect）的像素差的一半作为允许范围，
   * 于是图永远盖住视口、四边都不露空白；scale===1 或量不到尺寸时直接回中，
   * 杜绝任何 NaN / 漂移（jsdom 测试环境也走这条安全分支）。
   */
  const clampOffset = useCallback((next: { x: number; y: number }, scaleVal: number) => {
    const stage = stageRef.current
    const viewport = viewportRef.current
    if (!stage || !viewport || scaleVal <= MIN_SCALE + EPSILON) return { x: 0, y: 0 }
    const stageRect = stage.getBoundingClientRect()
    const viewportRect = viewport.getBoundingClientRect()
    const maxX = Math.max(0, (viewportRect.width - stageRect.width) / 2)
    const maxY = Math.max(0, (viewportRect.height - stageRect.height) / 2)
    return {
      x: Math.min(Math.max(next.x, -maxX), maxX),
      y: Math.min(Math.max(next.y, -maxY), maxY),
    }
  }, [])

  const zoomBy = useCallback(
    (delta: number) => {
      const next = clampScale(scaleRef.current + delta)
      scaleRef.current = next
      setScale(next)
      setOffset((prev) => clampOffset(prev, next))
    },
    [clampOffset],
  )

  const reset = useCallback(() => {
    scaleRef.current = MIN_SCALE
    setScale(MIN_SCALE)
    setOffset({ x: 0, y: 0 })
  }, [])

  /*
   * 滚轮缩放：挂在 window 上（灯箱打开时才挂载本组件）。
   * passive: false 才能 preventDefault —— 顺带杜绝任何残余的页面滚动 / 翻页。
   */
  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomBy(event.deltaY < 0 ? STEP : -STEP)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      pressRef.current = { x: event.clientX, y: event.clientY }
      // 只有放大后才允许拖拽平移；scale===1 时这层不拦截，仍走「点空地关闭」
      if (scaleRef.current > MIN_SCALE + EPSILON) {
        const stage = stageRef.current
        const viewport = viewportRef.current
        let maxX = 0
        let maxY = 0
        if (stage && viewport) {
          const stageRect = stage.getBoundingClientRect()
          const viewportRect = viewport.getBoundingClientRect()
          maxX = Math.max(0, (viewportRect.width - stageRect.width) / 2)
          maxY = Math.max(0, (viewportRect.height - stageRect.height) / 2)
        }
        dragRef.current = {
          startX: event.clientX,
          startY: event.clientY,
          originX: offset.x,
          originY: offset.y,
          maxX,
          maxY,
        }
        setDragging(true)
        // setPointerCapture 让拖出元素范围外也能继续收到 move/up，拖拽更跟手；
        // jsdom 未实现时 ?. 直接跳过，不影响逻辑
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }
    },
    [offset.x, offset.y],
  )

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const nextX = drag.originX + (event.clientX - drag.startX)
    const nextY = drag.originY + (event.clientY - drag.startY)
    setOffset({
      x: Math.min(Math.max(nextX, -drag.maxX), drag.maxX),
      y: Math.min(Math.max(nextY, -drag.maxY), drag.maxY),
    })
  }, [])

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }, [])

  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      /* 点在图上：不关 */
      if (event.target instanceof HTMLImageElement) return
      /* 放大状态下不关：那时用户是在看图，误点一下不该把灯箱关掉 */
      if (scaleRef.current > MIN_SCALE + EPSILON) return
      const press = pressRef.current
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_SLOP) return
      onBackgroundClick()
    },
    [onBackgroundClick],
  )

  const cursor = scale > MIN_SCALE + EPSILON ? (dragging ? 'grabbing' : 'grab') : 'zoom-out'

  return (
    <>
      {/*
       * 缩放视口：铺满灯箱，负责接滚轮、双击、点空地关闭、以及放大后的拖拽平移。
       * 单独一层（而不是直接缩放 img）是为了不去动 children 自己的样式。
       */}
      <div
        ref={stageRef}
        className={styles.stage}
        style={{ cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handleClick}
        onDoubleClick={reset}
      >
        <div
          ref={viewportRef}
          className={styles.viewport}
          data-testid="lightbox-zoom"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          {children}
        </div>
      </div>

      <div className={styles.zoomControls} aria-label={labels.zoomReset}>
        <button
          type="button"
          className={styles.zoomBtn}
          aria-label={labels.zoomOut}
          disabled={scale <= MIN_SCALE + EPSILON}
          onClick={() => zoomBy(-STEP)}
        >
          −
        </button>
        <button
          type="button"
          className={styles.zoomResetBtn}
          aria-label={labels.zoomReset}
          onClick={reset}
        >
          1:1
        </button>
        <button
          type="button"
          className={styles.zoomBtn}
          aria-label={labels.zoomIn}
          disabled={scale >= MAX_SCALE - EPSILON}
          onClick={() => zoomBy(STEP)}
        >
          +
        </button>
      </div>
    </>
  )
}
