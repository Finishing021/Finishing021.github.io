import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { DiaryEntry } from '../../content/site'
import { diaryLightboxCopy } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { formatDate } from '../../lib/format'
import CarouselArrow from '../CarouselArrow/CarouselArrow'
import LightboxImage from '../Lightbox/LightboxImage'
import LightboxZoom from '../Lightbox/LightboxZoom'
import LightboxCloseButton from '../Lightbox/LightboxCloseButton'
import styles from './DiaryLightbox.module.css'

/**
 * 手稿原图灯箱。
 *
 * ⚠️ 和摄影灯箱一样，**必须 portal 到 document.body**：它同样渲染在 div.main 里，
 * 而 main 上残留的入场 transform 会把 position: fixed 的包含块抢过去，
 * 导致遮罩撑成整页高度、图落到屏幕外、focus() 把页面滚回顶部。
 * 完整成因见 `components/Gallery/PhotoLightbox.tsx` 顶部注释。
 *
 * 入场没有任何推近/翻转动画，直接靠 CSS 把图强制居中在黑底上；
 * 这里只保留档案特有的部分：主题标题、日期、张数计数器。
 */
export default function DiaryLightbox({
  entry,
  index,
  onIndexChange,
  onClose,
}: {
  entry: DiaryEntry
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const { lang } = useLang()
  const t = diaryLightboxCopy[lang]
  /* 灯箱标题跟随语言切换；缺失英文时回落到中文 */
  const title = lang === 'zh' ? entry.title : (entry.titleEn || entry.title)
  const closeRef = useRef<HTMLButtonElement>(null)
  /** 打开前焦点在哪 —— 关闭时还回去，否则键盘用户会被扔回页首 */
  const restoreRef = useRef<HTMLElement | null>(null)
  /** 翻页方向：决定滑动从哪边进来；仅用于动画，不改任何既有翻页逻辑 */
  const [dir, setDir] = useState<'prev' | 'next'>('next')

  const total = entry.images.length
  const safeIndex = Math.min(Math.max(index, 0), Math.max(total - 1, 0))
  const src = entry.images[safeIndex]

  useBodyScrollLock()

  const goPrev = useCallback(() => {
    setDir('prev')
    if (safeIndex > 0) onIndexChange(safeIndex - 1)
  }, [safeIndex, onIndexChange])

  const goNext = useCallback(() => {
    setDir('next')
    if (safeIndex < total - 1) onIndexChange(safeIndex + 1)
  }, [safeIndex, total, onIndexChange])

  /* 打开时锁住背景滚动，并把焦点移到关闭按钮 */
  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    /* preventScroll：焦点绝不能顺带把页面滚一下 */
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      restoreRef.current?.focus?.({ preventScroll: true })
    }
  }, [])

  /*
   * 预加载同主题的其它照片。不预加载的话，翻到下一张会先空白再跳出图片。
   */
  useEffect(() => {
    for (const item of entry.images) {
      if (item === src) continue
      const preload = new Image()
      preload.src = item
    }
  }, [entry.images, src])

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
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'zh' ? `《${title}》手稿原图` : `Manuscript: ${title}`}
    >
      <span className={styles.backdrop} onClick={onClose} aria-hidden="true" />

      <figure className={styles.figure}>
        {/*
          缩放（滚轮 / − + 按钮 / 双击复位）与「点空地关闭」交给 LightboxZoom。
          .stage 是它专属的「视口」：图注要留在视口外面，所以给缩放层单独划了一块
          100vw × 82vh 的地方，翻页滑入动画照旧（key={safeIndex}）挂在 slideTrack 上。
        */}
        <div className={styles.stage}>
          <LightboxZoom
            labels={{ zoomIn: t.zoomIn, zoomOut: t.zoomOut, zoomReset: t.zoomReset }}
            onBackgroundClick={onClose}
          >
            <div
              key={safeIndex}
              className={`${styles.slideTrack} ${dir === 'prev' ? styles.fromLeft : styles.fromRight}`}
            >
              <LightboxImage
                src={src}
                alt={
                  lang === 'zh'
                    ? `《${title}》第 ${safeIndex + 1} 张手稿原图`
                    : `${title} — manuscript ${safeIndex + 1}`
                }
                placeholder="transparent"
              />
            </div>
          </LightboxZoom>
        </div>
        <figcaption className={styles.caption}>
          <span className={styles.captionTitle}>{title}</span>
          <span>{formatDate(entry.date)}</span>
          {total > 1 && (
            <span className={styles.counter}>
              {safeIndex + 1} / {total}
            </span>
          )}
        </figcaption>
      </figure>

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
