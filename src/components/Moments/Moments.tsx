import { photos } from '../../content/photos.generated'
import { momentsCopy } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import section from '../../styles/section.module.css'
import Epigraph from '../Epigraph/Epigraph'
import MomentsWall from './MomentsWall'
import styles from './Moments.module.css'

/**
 * 「光影」摄影墙——独立整页（/moments）。
 *
 * 为什么和成长档案分开：档案放的是手稿，语义是「记录」；这里放的是照片，
 * 语义是「作品」。两者混在一页会让彼此都失焦。
 *
 * 标题刻意与成长档案的「写下来的那些时候」押对，让两页共享同一种语气。
 */
export default function Moments() {
  const { lang } = useLang()
  const t = momentsCopy[lang]
  return (
    <section id="moments" className={section.section} aria-labelledby="moments-title">
      <div className={section.inner}>
        <header className={section.head}>
          <p className={section.eyebrow} data-reveal>
            {t.eyebrow}
          </p>
          {/* 封面退场后本页只有这一个 h1 */}
          <h1 className={section.heading} id="moments-title" data-reveal>
            {t.heading}
          </h1>
          <p className={section.lead} data-reveal>
            {t.lead}
          </p>
        </header>

        {photos.length === 0 ? <MomentsEmpty /> : <MomentsWall photos={photos} />}

        {/* 寄语统一放在页面最下方：所有照片看完之后 */}
        <Epigraph text={t.epigraph} />
      </div>
    </section>
  )
}

/**
 * 空态。
 *
 * 这不是给访客看的，而是给站主看的故障提示：页面上没有照片时，
 * 第一件想确认的事就是「我是不是忘了跑那条命令」。直接把命令写在这里，
 * 比去翻文档快。
 *
 * 导出是为了能单独测 —— 否则只能靠「清单恰好为空」来触发它，
 * 一旦站主放了照片，这条分支就再也测不到了。
 */
export function MomentsEmpty() {
  const { lang } = useLang()
  const t = momentsCopy[lang]
  return (
    <div className={styles.empty} data-reveal>
      <p className={styles.emptyTitle}>{t.emptyTitle}</p>
      <p className={styles.emptyHint}>
        {t.emptyHintPre}
        <code>assets-source/photos/</code>
        {t.emptyHintMid}
        <code>npm run photos:build</code>
      </p>
    </div>
  )
}
