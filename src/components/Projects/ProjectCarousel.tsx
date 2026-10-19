import { useCallback, useEffect, useState } from 'react'
import type { ProjectModuleImage } from '../../content/projectsData'
import { projectsCopy } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import CarouselArrow from '../CarouselArrow/CarouselArrow'
import styles from './ProjectCarousel.module.css'

/**
 * 页码补零：1 -> 01，15 -> 15。
 * 两位等宽数字下「01 / 15」和「10 / 15」宽度一致，翻页时页码不会左右抖。
 */
function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * 作品集轮播：一屏只放一页幻灯片。
 *
 * 为什么不做成网格墙：课件是**有顺序的**，一页接一页读才是它本来的样子；
 * 铺成网格会把这个顺序打散，而且十几页铺开就是一条很长的页面。
 * 轮播把「一次只看一页」这件事变成结构本身，顺序由左右箭头表达。
 *
 * 切换动画用 CSS：给 figure 挂 key={当前图}，React 换页时整体重新挂载，
 * 入场动画自然重播一次。比在 JS 里做过渡状态机简单得多，也不会出现
 * 动画途中再点、两份内容同时停在中途的穿帮。
 *
 * 预加载前后各一张：否则每翻一页都要先空一下再跳出图，
 * 「丝滑」这件事有一半是靠预加载撑住的。
 */
export default function ProjectCarousel({
  projects,
  onSlideClick,
}: {
  projects: ProjectModuleImage[]
  /** 点击当前幻灯片时回调（作品集页用它打开灯箱放大）；不传则不可点 */
  onSlideClick?: (index: number) => void
}) {
  const { lang } = useLang()
  const t = projectsCopy[lang]

  const total = projects.length
  const [index, setIndex] = useState(0)
  /** 只用来决定新图从哪一侧滑进来，不参与任何业务逻辑 */
  const [direction, setDirection] = useState<'next' | 'prev'>('next')

  const safeIndex = clamp(index, 0, Math.max(total - 1, 0))
  const current: ProjectModuleImage | undefined = projects[safeIndex]

  const go = useCallback(
    (target: number) => {
      const next = clamp(target, 0, Math.max(total - 1, 0))
      if (next === safeIndex) return
      setDirection(next > safeIndex ? 'next' : 'prev')
      setIndex(next)
    },
    [safeIndex, total],
  )

  /* 左右方向键翻页。全局监听，鼠标不在箭头上时也能用 */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        go(safeIndex - 1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        go(safeIndex + 1)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [go, safeIndex])

  /* 预加载前后各一张 */
  useEffect(() => {
    for (const offset of [-1, 1]) {
      const neighbour = projects[safeIndex + offset]
      if (!neighbour) continue
      const preload = new Image()
      preload.src = neighbour.src
    }
  }, [projects, safeIndex])

  /* 清单为空时调用方已经渲染空态了，这里只是把类型收窄 */
  if (!current) return null

  /* 图注与读屏描述跟随语言；缺英文时回落中文，绝不出现空标题 */
  const activeCaption =
    lang === 'zh' ? current.caption : (current.captionEn ?? current.caption)
  const activeAlt = lang === 'zh' ? current.alt : (current.altEn ?? current.alt)

  const atStart = safeIndex === 0
  const atEnd = safeIndex === total - 1

  return (
    <div
      className={styles.carousel}
      role="group"
      aria-roledescription="carousel"
      aria-label={t.heading}
      data-testid="project-carousel"
    >
      <CarouselArrow
        direction="prev"
        onClick={() => go(safeIndex - 1)}
        disabled={atStart}
        label={t.prev}
        testId="carousel-prev"
        className={styles.prev}
      />

      {/* key 换成当前图 => 换页时整体重挂载，入场动画重播 */}
      <figure
        className={styles.frame}
        key={current.src}
        data-dir={direction}
        role="group"
        aria-roledescription="slide"
        aria-label={`${safeIndex + 1} / ${total}`}
        data-testid="carousel-slide"
      >
        {onSlideClick ? (
          <button
            type="button"
            className={styles.slideBtn}
            onClick={() => onSlideClick(safeIndex)}
            aria-label={t.viewLarge}
          >
            <img
              className={styles.slide}
              src={current.src}
              alt={activeAlt}
              style={{ aspectRatio: current.aspect }}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </button>
        ) : (
          <img
            className={styles.slide}
            src={current.src}
            alt={activeAlt}
            style={{ aspectRatio: current.aspect }}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        )}
      </figure>

      <CarouselArrow
        direction="next"
        onClick={() => go(safeIndex + 1)}
        disabled={atEnd}
        label={t.next}
        testId="carousel-next"
        className={styles.next}
      />

      <div className={styles.meta}>
        {activeCaption && (
          <p className={styles.caption} key={current.src}>
            {activeCaption}
          </p>
        )}
        <p className={styles.counter} aria-live="polite" data-testid="carousel-counter">
          <span className={styles.counterNow}>{pad(safeIndex + 1)}</span>
          <span className={styles.counterSep} aria-hidden="true">
            /
          </span>
          <span className={styles.counterTotal}>{pad(total)}</span>
        </p>
      </div>
    </div>
  )
}
