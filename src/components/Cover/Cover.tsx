import gsap from 'gsap'
import { useLayoutEffect, type CSSProperties } from 'react'
import { coverBackdrop } from '../../content/site'
import { coverCopy } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import { useParallax } from '../../hooks/useParallax'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import styles from './Cover.module.css'

/** 视差系数：头像最慢、取景框次之、网格再次、文字最快。顺序与下面 ref 挂载顺序一致 */
const LAYERS = [0.1, 0.18, 0.34, 0.64]

export default function Cover({ onEnter }: { onEnter: () => void }) {
  const { containerRef, layerRefs } = useParallax(LAYERS)
  const reduced = usePrefersReducedMotion()
  const { lang } = useLang()
  const t = coverCopy[lang]

  useLayoutEffect(() => {
    const root = containerRef.current
    if (!root || reduced) return

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'expo.out' } })

      timeline
        .from('[data-enter="grid"]', { opacity: 0, duration: 1.4 }, 0)
        .from('[data-enter="eyebrow"]', { y: 14, opacity: 0, duration: 0.9 }, 0.1)
        .from('[data-enter="title"]', { y: 44, opacity: 0, duration: 1.15 }, 0.2)
        .from('[data-enter="footnote"]', { y: 12, opacity: 0, duration: 0.9 }, 0.5)
        .from('[data-enter="cta"]', { y: 12, opacity: 0, duration: 0.9 }, 0.72)
    }, root)

    return () => ctx.revert()
  }, [reduced, containerRef])

  return (
    <section
      id="cover"
      ref={containerRef}
      className={styles.cover}
      style={{ '--cover-blur': `${coverBackdrop.blur}px` } as CSSProperties}
      aria-labelledby="cover-title"
    >
      <div className={styles.backdrop} ref={layerRefs[0]} aria-hidden="true">
        <img
          className={styles.avatar}
          src={coverBackdrop.src}
          alt=""
          width={864}
          height={864}
          decoding="async"
        />
      </div>

      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.frame} ref={layerRefs[1]} aria-hidden="true" data-enter="grid">
        <span className={styles.tickTop} />
        <span className={styles.tickRight} />
        <span className={styles.tickBottom} />
        <span className={styles.tickLeft} />
      </div>

      <div className={styles.grid} ref={layerRefs[2]} aria-hidden="true" data-enter="grid" />

      <div className={styles.content} ref={layerRefs[3]}>
        <p className={styles.eyebrow} data-enter="eyebrow">
          {t.eyebrow}
        </p>
        <h1 className={styles.title} id="cover-title" data-enter="title">
          {t.title}
        </h1>
        <p className={styles.footnote} data-enter="footnote">
          {t.footnote}
        </p>
        <button type="button" className={styles.cta} onClick={onEnter} data-enter="cta">
          <span className={styles.ctaLabel}>{t.cta}</span>
          <span className={styles.ctaArrow} aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </section>
  )
}
