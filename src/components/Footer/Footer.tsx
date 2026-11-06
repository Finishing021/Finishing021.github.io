import { footerCopy } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import styles from './Footer.module.css'

export default function Footer() {
  const year = new Date().getFullYear()
  const { lang } = useLang()
  const t = footerCopy[lang]

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* 页脚不挂 data-reveal：它在文档最底部，永远滚不到 ScrollReveal 的
            「top 88%」触发线，挂上就会永久停在 opacity:0（含「回到顶部」链接）。 */}
        <p className={styles.line}>
          <span className={styles.brand}>Finishing</span>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <span className={styles.note}>{t.note}</span>
        </p>

        <p className={styles.meta}>
          <span>© {year} Finishing</span>
          {/* 原来是 #hero，但封面早就改叫 #cover 了，这个链接点了没反应 */}
          <a className={styles.top} href="#main">
            {t.backToTop}
          </a>
        </p>
      </div>
    </footer>
  )
}
