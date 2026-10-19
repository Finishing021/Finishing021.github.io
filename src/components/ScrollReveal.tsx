import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/** 上浮距离 */
const DISTANCE = 44
/** 元素顶部到达视口 88% 处时触发 */
const START = 'top 88%'

/**
 * 给页面上所有带 `data-reveal` 的元素挂上「滚动到视口时淡入 + 向上浮现」。
 *
 * 几个刻意的设计：
 * 1. **用 ScrollTrigger.batch 而不是给每个元素单独建 trigger** ——
 *    batch 会把同一时间进入视口的元素归为一批做 stagger，滚动时更像一整块内容
 *    依次浮现，而不是各弹各的。
 * 2. **必须等封面退场后再挂载**（由 App 控制）。封面期间 body 是 overflow:hidden，
 *    文档不可滚动，此刻测量的触发位置全是错的。
 * 3. **动画结束时 clearProps** —— 把 transform/opacity 交还给 CSS。
 *    否则内联的 transform 会盖住卡片悬停的放大效果。
 * 4. **减少动态效果时整个跳过**，连初始的 opacity:0 都不设置 ——
 *    否则一旦 trigger 没触发，内容就永久不可见了。
 * 5. **换页要重新抓一遍**（靠 route 进依赖数组）。/about 是独立整页，
 *    页面内容整体换掉，不重新注册的话新页面的元素根本不会播。
 */
export default function ScrollReveal({ route, ready = true }: { route?: string; ready?: boolean }) {
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    // 懒加载整页还没挂载完（ready 为假）时先不扫描，否则新页面元素会一直卡在 opacity:0
    if (reduced || !ready) return

    const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]')
    if (targets.length === 0) return

    const ctx = gsap.context(() => {
      gsap.set(targets, { opacity: 0, y: DISTANCE })

      ScrollTrigger.batch(targets, {
        start: START,
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'expo.out',
            stagger: 0.08,
            overwrite: true,
            clearProps: 'transform,opacity',
          }),
      })

      // 图片是懒加载的，布局会变；挂载后先刷一次，避免位置算旧了
      ScrollTrigger.refresh()
      // 再延一帧刷：等本帧 DOM/图片占位落定后再重算一次，
      // 防止切页后上方内容卡在 opacity:0 刷不出来（移动端高发）。
      const raf = requestAnimationFrame(() => ScrollTrigger.refresh())
      // 注意：ctx.revert() 会在卸载时清掉这一帧里注册的 trigger，
      // 但 refresh 是全局安全的，即便在 revert 之后补一帧也无副作用。
      void raf
    })

    return () => ctx.revert()
  }, [reduced, route, ready])

  return null
}
