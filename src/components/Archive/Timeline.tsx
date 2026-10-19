import { useCallback, useMemo, useState } from 'react'
import type { DiaryEntry } from '../../content/site'
import { archiveCopy } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import DiaryCard from './DiaryCard'
import DiaryLightbox from './DiaryLightbox'
import styles from './Timeline.module.css'

/**
 * 成长档案：按年份分组的缩略图网格。
 *
 * 之前是「年份刻度 + 竖排大卡 + 原地翻转」，现在改成网格 + 灯箱：
 * 卡片只占屏幕一小块，点击后由灯箱全屏展示原图。
 * 年份仍然保留为分组标题，时间顺序不会丢。
 */
export default function Timeline({ entries }: { entries: DiaryEntry[] }) {
  const { lang } = useLang()
  const t = archiveCopy[lang]
  const [lightboxId, setLightboxId] = useState<string | null>(null)
  /** 当前正在看第几张（同一主题内翻页）；卡片与灯箱共用一份状态 */
  const [photoIndex, setPhotoIndex] = useState(0)

  const handleOpen = useCallback((id: string) => {
    setPhotoIndex(0)
    setLightboxId(id)
  }, [])

  const handleClose = useCallback(() => setLightboxId(null), [])

  const years = useMemo(() => {
    const grouped = new Map<number, DiaryEntry[]>()
    for (const entry of entries) {
      const bucket = grouped.get(entry.year)
      if (bucket) bucket.push(entry)
      else grouped.set(entry.year, [entry])
    }
    return [...grouped.entries()].sort((a, b) => b[0] - a[0])
  }, [entries])

  const openEntry = lightboxId
    ? (entries.find((entry) => entry.id === lightboxId) ?? null)
    : null

  return (
    <div className={styles.timeline}>
      {years.map(([year, list]) => (
        <section key={year} className={styles.year} aria-label={`${year}${t.yearSuffix}`}>
          {/* 年份是「成长档案」这一 h1 下的分组，所以是 h2 */}
          <h2 className={styles.yearLabel} data-reveal>
            {year}
          </h2>
          <ol className={styles.grid}>
            {list.map((entry, index) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                index={index}
                onOpen={handleOpen}
              />
            ))}
          </ol>
        </section>
      ))}

      {openEntry && (
        <DiaryLightbox
          entry={openEntry}
          index={photoIndex}
          onIndexChange={setPhotoIndex}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
