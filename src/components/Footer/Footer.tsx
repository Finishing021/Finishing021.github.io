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
        <p className={styles.line} data-reveal>
          <span className={styles.brand}>Finishing</span>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <span className={styles.note}>{t.note}</span>
        </p>

        <p className={styles.meta} data-reveal>
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
