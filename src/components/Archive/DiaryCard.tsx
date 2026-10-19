import { useState, type CSSProperties } from 'react'
import type { DiaryEntry } from '../../content/site'
import { diaryCardCopy } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import styles from './DiaryCard.module.css'

/**
 * 网格里的一张主题卡：缩略图 + 主题名。
 *
 * 刻意做得很轻——不再原地翻转、不再承载正文。点击整张卡交给灯箱展示原图，
 * 卡片本身只负责「像贴在白纸上的一张照片」。
 */
export default function DiaryCard({
  entry,
  index,
  onOpen,
}: {
  entry: DiaryEntry
  index: number
  onOpen: (id: string) => void
}) {
  const { lang } = useLang()
  const t = diaryCardCopy[lang]
  /* 中英切换时图注与标题一起换；缺失英文时回落到中文，避免空标题 */
  const title = lang === 'zh' ? entry.title : (entry.titleEn || entry.title)
  const cover = entry.images[0]
  const [coverFailed, setCoverFailed] = useState(false)
  const hasCover = Boolean(cover) && !coverFailed

  return (
    <li
      className={styles.item}
      style={{ '--stagger': `${index * 60}ms` } as CSSProperties}
      data-reveal
    >
      <button
        type="button"
        className={styles.card}
        data-testid={`diary-open-${entry.id}`}
        onClick={(event) => {
          /* type="button" 本无默认行为；万一以后换成 <a>，这行能挡住跳转导致的滚动 */
          event.preventDefault()
          onOpen(entry.id)
        }}
      >
        <span className={styles.mount}>
          {hasCover ? (
            <>
              <img
                className={styles.thumb}
                src={cover}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => setCoverFailed(true)}
              />
              <span className={styles.photoCaption} aria-hidden="true">
                {title}
              </span>
            </>
          ) : (
            <span className={styles.fallback}>
              <span className={styles.fallbackDate}>
                {entry.date.replace(/-/g, ' / ')}
              </span>
              <span className={styles.fallbackText}>{t.missing}</span>
            </span>
          )}

          {entry.images.length > 1 && (
            <span className={styles.count} aria-hidden="true">
              1 / {entry.images.length}
            </span>
          )}
        </span>

        <h3 className={styles.title}>{title}</h3>
      </button>
    </li>
  )
}
