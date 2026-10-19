import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { photoLightboxCopy } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import CarouselArrow from '../CarouselArrow/CarouselArrow'
import LightboxImage from '../Lightbox/LightboxImage'
import LightboxZoom from '../Lightbox/LightboxZoom'
import LightboxCloseButton from '../Lightbox/LightboxCloseButton'
import styles from './PhotoLightbox.module.css'

/**
 * 灯箱消费的最小图片形状。
 *
 * 原先直接收 `GalleryItem[]`，现在放宽成结构化最小集：组件里真正用到的只有
 * `src` 和 `alt`。光影的 Photo[]、作品集的课件/证书条目都天然满足这个形状，
 * 借 TypeScript 结构化类型直接兼容 —— 日后任何内容线想复用这条「相框 + 灯箱」
 * 展示线，不必再往自己的数据里补 date/file 等字段。
 */
export interface LightboxPhoto {
  src: string
  alt: string
  /** 宽高比（宽/高），用于灯箱图加载前就占好位，避免布局跳动与白色断层 */
  aspect?: number
}

/** 预加载前后各几张。不预加载的话翻页会先空白再跳出图。 */
const PRELOAD_RANGE = 1

/**
 * 全屏大图。
 *
 * ⚠️ **用 portal 挂到 `document.body`，这不是可选的排版偏好，是 bug 修复。**
 *
 * 曾经的症状：点开照片 → 页面自动跳回顶部、屏幕上只有一片灰遮罩、图片完全看不见、
 * 滚轮也动不了。修了好几轮 CSS（加了一堆 `!important`）都没用。
 *
 * 真正的原因是**祖先带着 `transform`**：`App` 的入场时间轴给 `div.main` 写了
 * 内联 `transform: matrix(1,0,0,1,0,0)` 且没清掉。CSS 规范里，带 transform 的
 * 元素会成为 `position: fixed` 后代的**包含块** —— 于是 `inset: 0` 不再是「视口」，
 * 而是那个 3000 多像素高的 `div.main`：
 *   - 遮罩被撑成整页高度，不再等于视口；
 *   - flex 居中的图被放到这个高盒子的中央 → 落在视口下方，屏幕上看不见；
 *   - 关闭按钮也跟着跑到底部，`focus()` 要把页面滚到它那里 → 表现为「跳回顶部」。
 *
 * 所以光改灯箱自己的 CSS 是治不好的：问题长在它的祖先上。portal 把它挪出
 * `div.main`，直接挂在 `body` 下，`position: fixed` 就永远以视口为基准。
 * 这同时是弹层的通行做法 —— 无论以后谁又给页面某层加了 transform，灯箱都不会再被带偏。
 *
 * 另外两道保险：`focus({ preventScroll: true })`（焦点无论如何都不触发滚动），
 * 以及 `App` 里清掉残留 transform。三者任一个单独都能挡住这个 bug。
 *
 * 没有标题、日期、张数计数器 —— 摄影墙是纯图墙，照片上不出现任何文字。
 */
export default function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: LightboxPhoto[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const { lang } = useLang()
  const t = photoLightboxCopy[lang]
  const closeRef = useRef<HTMLButtonElement>(null)
  /** 打开前焦点在哪 —— 关闭时要还回去，否则键盘用户会被扔回页首 */
  const restoreRef = useRef<HTMLElement | null>(null)

  const total = photos.length
  const safeIndex = Math.min(Math.max(index, 0), Math.max(total - 1, 0))
  const photo = photos[safeIndex]

  useBodyScrollLock()

  const goPrev = useCallback(() => {
    if (safeIndex > 0) onIndexChange(safeIndex - 1)
  }, [safeIndex, onIndexChange])

  const goNext = useCallback(() => {
    if (safeIndex < total - 1) onIndexChange(safeIndex + 1)
  }, [safeIndex, total, onIndexChange])

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    /* preventScroll：焦点绝不能顺带把页面滚一下（这正是「跳回顶部」的来源之一） */
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      restoreRef.current?.focus?.({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    for (let offset = -PRELOAD_RANGE; offset <= PRELOAD_RANGE; offset += 1) {
      const neighbour = photos[safeIndex + offset]
      if (!neighbour || neighbour === photo) continue
      const preload = new Image()
      preload.src = neighbour.src
    }
  }, [photos, safeIndex, photo])

  /* Esc 关闭 + 左右方向键翻页 */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'ArrowLeft') goPrev()
      else if (event.key === 'ArrowRight') goNext()
    },
    [goPrev, goNext, onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={photo.alt}>
      <span className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      {/* 缩放（滚轮 / − + 按钮 / 双击复位）与「点空地关闭」都交给 LightboxZoom */}
      <LightboxZoom
        labels={{ zoomIn: t.zoomIn, zoomOut: t.zoomOut, zoomReset: t.zoomReset }}
        onBackgroundClick={onClose}
      >
        <LightboxImage
          src={photo.src}
          alt={photo.alt}
          aspect={photo.aspect}
          placeholder="transparent"
        />
      </LightboxZoom>

      {total > 1 && (
        <>
          <div className={styles.navPrev}>
            <CarouselArrow
              direction="prev"
              onClick={goPrev}
              disabled={safeIndex === 0}
              label={t.prev}
            />
          </div>
          <div className={styles.navNext}>
            <CarouselArrow
              direction="next"
              onClick={goNext}
              disabled={safeIndex === total - 1}
              label={t.next}
            />
          </div>
        </>
      )}

      <LightboxCloseButton ref={closeRef} onClick={onClose} label={t.close} />
    </div>,
    document.body,
  )
}
