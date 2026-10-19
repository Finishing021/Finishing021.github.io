import { useEffect } from 'react'

/**
 * 浮层打开期间锁住背景滚动，并补上滚动条槽位的底色。
 *
 * 两件事：
 *
 * 1. **锁滚动**：把 body 的 overflow 设成 hidden，关掉时还原。
 *    这里**不要**加「补 padding-right 抵消滚动条」那套常见做法 ——
 *    global.css 给 html 设了 `scrollbar-gutter: stable`，槽位永远预留，
 *    隐藏滚动条根本不会引起横向跳动，没有东西需要补偿。反过来给 body 补
 *    padding-right 会把内容可用宽度挤掉 8px（实测 1432 → 1424），
 *    平白制造出它本来想消除的那种抖动。
 *
 * 2. **在 <html> 上打 `data-lightbox-open`**：`scrollbar-gutter: stable` 预留的
 *    那约 8px 槽位**不属于页面的可绘制区域**，页面里任何元素都盖不上去
 *    （哪怕是 position: fixed; width: 100vw 的全屏遮罩）。只有根元素背景能影响它。
 *    不处理的话，全屏深色遮罩的右边会露出一条浅色竖缝。
 *    封面早就用同样的办法处理过（见 global.css 的 data-cover-open），这里保持一致。
 *
 * 记录进入时的值、还原时原样写回，连续开关两个浮层也不会互相拆台。
 */
export function useBodyScrollLock(): void {
  useEffect(() => {
    const body = document.body
    const root = document.documentElement
    const previousOverflow = body.style.overflow

    body.style.overflow = 'hidden'
    root.setAttribute('data-lightbox-open', '')

    return () => {
      body.style.overflow = previousOverflow
      root.removeAttribute('data-lightbox-open')
    }
  }, [])
}
