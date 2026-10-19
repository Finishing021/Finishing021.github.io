import { diary } from '../../content/site'
import { archiveCopy } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import section from '../../styles/section.module.css'
import styles from './ArchivePreview.module.css'
import Timeline from './Timeline'

/**
 * 成长档案区块。
 *
 * 这里刻意渲染全部主题，不做「首页只放最近 N 条」的截断 ——
 * 这个区块就是站点的核心内容本身，截断会让部分主题在页面上根本不存在。
 */
export default function ArchivePreview() {
  const { lang } = useLang()
  const t = archiveCopy[lang]

  return (
    <section id="archive" className={section.section} aria-labelledby="archive-title">
      <div className={section.inner}>
        <header className={section.head}>
          <p className={section.eyebrow} data-reveal>
            {t.eyebrow}
          </p>
          {/* 封面退场后，成长档案就是这一页的一级内容，所以用 h1 */}
          <h1 className={section.heading} id="archive-title" data-reveal>
            {t.heading}
          </h1>
          <p className={styles.lead} data-reveal>
            {t.lead}
          </p>
        </header>

        <Timeline entries={diary} />
      </div>
    </section>
  )
}
