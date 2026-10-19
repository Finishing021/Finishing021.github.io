import { useEffect, useMemo, useRef } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/** 指针模式下单层最大位移（像素），实际位移 = 该值 × 该层系数 */
const POINTER_SHIFT = 14
/** 触屏模式下由滚动驱动的单层最大位移，需要比指针模式更大的量才看得见 */
const SCROLL_SHIFT = 48
/** 指针模式下单层最大倾角（度） */
const MAX_TILT = 3
/** 缓动插值系数，越小越「有重量」 */
const LERP = 0.08

type LayerRef = (node: HTMLElement | null) => void

export interface ParallaxApi {
  /** 挂在捕获指针 / 滚动进度的容器上 */
  containerRef: React.RefObject<HTMLElement | null>
  /** 与传入的 layers 等长，逐个挂到对应层元素上 */
  layerRefs: LayerRef[]
}

/**
 * 把指针位置（或触屏下的滚动进度）归一化到 [-1, 1]，按各层系数经 lerp 缓动后
 * 直接写各层元素的 transform —— 全程不触发 React 重渲染。
 * 用户要求减少动态效果时不注册任何监听。
 */
export function useParallax(layers: number[]): ParallaxApi {
  const containerRef = useRef<HTMLElement>(null)
  const nodes = useRef<(HTMLElement | null)[]>([])
  const layersRef = useRef(layers)
  layersRef.current = layers

  const reduced = usePrefersReducedMotion()
  const layerKey = layers.join(',')

  const layerRefs = useMemo<LayerRef[]>(
    () =>
      layers.map(
        (_, index) => (node: HTMLElement | null) => {
          nodes.current[index] = node
        },
      ),
    // 层数或系数变化时重建回调，避免引用过期的层
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layerKey],
  )

  useEffect(() => {
    const list = nodes.current

    if (reduced) {
      for (const node of list) {
        if (node) node.style.transform = ''
      }
      return
    }

    const container = containerRef.current
    if (!container) return

    const canHover =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches

    let mode: 'pointer' | 'scroll' = canHover ? 'pointer' : 'scroll'
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0
    let frame = 0

    const onMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      mode = 'pointer'
      targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1
      targetY = ((event.clientY - rect.top) / rect.height) * 2 - 1
    }

    const onLeave = () => {
      targetX = 0
      targetY = 0
    }

    const onScroll = () => {
      if (mode === 'pointer') return
      const rect = container.getBoundingClientRect()
      const height = rect.height || 1
      const progress = Math.min(Math.max(-rect.top / height, 0), 1)
      targetX = 0
      targetY = progress
    }

    const tick = () => {
      currentX += (targetX - currentX) * LERP
      currentY += (targetY - currentY) * LERP

      const coefficients = layersRef.current
      const shift = mode === 'pointer' ? POINTER_SHIFT : SCROLL_SHIFT
      const tilt = mode === 'pointer' ? MAX_TILT : MAX_TILT * 0.4

      list.forEach((node, index) => {
        if (!node) return
        const k = coefficients[index] ?? 0
        const x = -currentX * shift * k
        const y = -currentY * shift * k
        const rotateY = currentX * tilt * k
        const rotateX = -currentY * tilt * k
        node.style.transform =
          `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) ` +
          `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`
      })

      frame = requestAnimationFrame(tick)
    }

    container.addEventListener('mousemove', onMove)
    container.addEventListener('mouseleave', onLeave)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      container.removeEventListener('mousemove', onMove)
      container.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('scroll', onScroll)
    }
  }, [layerKey, reduced])

  return { containerRef, layerRefs }
}
