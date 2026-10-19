import { useEffect, useRef } from 'react'

/**
 * 滚轮两次翻页之间的最小间隔。
 *
 * 触控板一次滑动会连发几十个 wheel 事件，不加冷却会「一滑就飞过十几张」，
 * 根本停不到想看的那张。这个值略大于一次自然的滑动，手感像一格一格走。
 */
const COOLDOWN_MS = 420

/**
 * 鼠标滚轮上下翻页。
 *
 * 灯箱打开时背景滚动被锁住了，滚轮本来什么都不会做 —— 白费一个最顺手的
 * 手势，而且会让人以为页面卡死了。这里把它接成「上滚看上一张 / 下滚看下一张」。
 *
 * 两个刻意的取舍：
 * 1. **只认纵向滚动**。触控板横扫（deltaX 更大）不拦，也不翻页，
 *    否则想横向微调一下就被弹到下一张。
 * 2. **监听挂在 window 上**，不在图片上。图片只占屏幕中间一块，
 *    挂在它上面会变成「把鼠标移到图外面滚轮就失效」。反正组件只在
 *    灯箱打开时挂载，不存在干扰页面其它部分的问题。
 */
export function useWheelPaging(onPrev: () => void, onNext: () => void): void {
  const lastFiredAt = useRef(0)
  /* 回调放进 ref：避免每次 render 都重新挂一遍监听 */
  const callbacks = useRef({ onPrev, onNext })

  useEffect(() => {
    callbacks.current = { onPrev, onNext }
  }, [onPrev, onNext])

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

      // 背景滚动已被锁住，这里拦掉可以防止任何残余的滚动/橡皮筋效果
      event.preventDefault()

      const now = Date.now()
      if (now - lastFiredAt.current < COOLDOWN_MS) return
      lastFiredAt.current = now

      if (event.deltaY < 0) callbacks.current.onPrev()
      else callbacks.current.onNext()
    }

    /* passive: false 才能调用 preventDefault */
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])
}
