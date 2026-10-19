import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import type { Photo } from '../../content/photos.generated'
import { categoryOf, CATEGORY_ORDER, type PhotoCategory } from '../../content/photoCategories'
import { momentsCategories, momentsFilterLabel } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import { localizePhoto } from '../../lib/localize'
import PhotoCard from '../Gallery/PhotoCard'
import PhotoLightbox from '../Gallery/PhotoLightbox'
import styles from './MomentsWall.module.css'

/**
 * 摄影墙：网格 + 分类筛选 + 灯箱。
 *
 * 「当前打开的是哪一张」这个状态放在这里，而不是卡片里 ——
 * 和成长档案的做法一致：卡片保持受控，容器持有唯一状态，
 * 这样同时只可能有一张大图打开，也不会出现两张卡各记各的 index 而错位。
 *
 * 分类筛选（全部 / 风景 / 人像 / 日常）用顶部一排胶囊按钮：
 * 点某个分类，只渲染该分类的照片。切类时用 Framer Motion 的 `layout` 做平滑重排，
 * 用 `AnimatePresence` 做淡入淡出 —— 留下的图会「果冻」一样滑到新位置，
 * 离开的图淡出缩小，而不是生硬地闪一下。
 *
 * 卡片与灯箱本身已抽到 components/Gallery/ —— 作品集（Projects）页复用同一套。
 * 这里只保留摄影墙自己的网格密度与筛选。
 */
export default function MomentsWall({ photos }: { photos: Photo[] }) {
  const { lang } = useLang()
  const labels = momentsCategories[lang]
  const [active, setActive] = useState<PhotoCategory>('all')
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  /* 筛选：默认全部；否则按文件名推断的分类匹配 */
  const visible = useMemo(
    () => photos.filter((photo) => active === 'all' || categoryOf(photo.file) === active),
    [photos, active],
  )

  /* 展示层用本地化后的图注 / alt；筛选仍按原始 file 进行 */
  const localized = useMemo(() => visible.map((photo) => localizePhoto(photo, lang)), [visible, lang])

  const close = useCallback(() => setOpenIndex(null), [])

  return (
    <>
      {/* 顶部胶囊筛选：全部 + 三个分类。aria 用 tablist/tab，键盘可切 */}
      <div className={styles.filters} role="tablist" aria-label={momentsFilterLabel[lang]}>
        <button
          key="all"
          type="button"
          role="tab"
          aria-selected={active === 'all'}
          className={`${styles.pill} ${active === 'all' ? styles.pillActive : ''}`}
          data-testid="filter-all"
          onClick={() => setActive('all')}
        >
          {labels.all}
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={active === cat}
            className={`${styles.pill} ${active === cat ? styles.pillActive : ''}`}
            data-testid={`filter-${cat}`}
            onClick={() => setActive(cat)}
          >
            {labels[cat]}
          </button>
        ))}
      </div>

      <div className={styles.wall}>
        <AnimatePresence>
          {localized.map((photo, index) => (
            <motion.div
              key={photo.src}
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <PhotoCard photo={photo} onOpen={() => setOpenIndex(index)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {openIndex !== null && (
        <PhotoLightbox photos={localized} index={openIndex} onIndexChange={setOpenIndex} onClose={close} />
      )}
    </>
  )
}
