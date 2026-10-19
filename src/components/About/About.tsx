import { useCallback, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { aboutPortrait, contacts, resumeUrl, type ContactType } from '../../content/site'
import { contactLabel } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import { useRoute } from '../../router/route'
import DownloadButton from '../DownloadButton/DownloadButton'
import styles from './About.module.css'

const COPIED_RESET_MS = 1800

/**
 * 把某个节点里的文本整体选中。
 *
 * 用于复制的降级方案：localhost / 非 HTTPS / 用户拒绝授权时 `navigator.clipboard`
 * 会不可用或被拒，这时与其只丢一句「复制失败」，不如直接帮访客把文本选好，
 * 剩下只需按 Ctrl+C —— 从「找不到复制对象」变成「一步到位」。
 */
function selectNodeText(node: HTMLElement | null): boolean {
  if (!node) return false
  const selection = window.getSelection()
  if (!selection) return false
  const range = document.createRange()
  range.selectNodeContents(node)
  selection.removeAllRanges()
  selection.addRange(range)
  return true
}

/**
 * 「关于我」——独立整页（/about）。
 *
 * 不再是首页向下滚动的一段：整页只讲这一件事，所以排版可以铺开 ——
 * 大头像 + 大标题 + 大字号的联系方式。
 *
 * 语言切换时最外层用 `key={lang}` 整体重新挂载，播一次进场动画，
 * 让「切成功了」这件事看得见，而不只是文字悄悄变了。
 */
export default function About() {
  const { lang, t } = useLang()
  const { navigate } = useRoute()
  const [copiedType, setCopiedType] = useState<ContactType | null>(null)
  const [failedType, setFailedType] = useState<ContactType | null>(null)
  const [selectedType, setSelectedType] = useState<ContactType | null>(null)
  /** 各行联系方式文本节点的引用 —— 自动复制失败时用它把文本选中 */
  const valueRefs = useRef<Partial<Record<ContactType, HTMLSpanElement | null>>>({})

  const handleCopy = useCallback(async (type: ContactType, value: string) => {
    try {
      // localhost / 非 HTTPS / 用户拒绝授权时，clipboard 要么不存在要么直接抛错
      if (!navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setFailedType(null)
      setSelectedType(null)
      setCopiedType(type)
      window.setTimeout(() => {
        setCopiedType((previous) => (previous === type ? null : previous))
      }, COPIED_RESET_MS)
    } catch {
      setCopiedType(null)
      // 降级：与其只说「复制失败」，不如直接帮访客把文本选中，剩下的交给 Ctrl+C
      if (selectNodeText(valueRefs.current[type] ?? null)) {
        setFailedType(null)
        setSelectedType(type)
      } else {
        // 连选中都做不到（极老的浏览器）才退回原来的失败提示
        setSelectedType(null)
        setFailedType(type)
      }
    }
  }, [])

  const goArchive = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      navigate('/', 'archive')
    },
    [navigate],
  )

  return (
    <section id="about" className={styles.page} aria-labelledby="about-heading">
      <div className={styles.inner}>
        <div className={styles.switchable} key={lang}>
          <header className={styles.hero} data-reveal>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 className={styles.title} id="about-heading" data-testid="about-heading">
              {t.heading}
            </h1>
            <p className={styles.lead}>{t.lead}</p>
          </header>

          <div className={styles.layout} data-reveal>
            <figure className={styles.portrait}>
              <img src={aboutPortrait} alt={t.portraitAlt} loading="eager" decoding="async" />
            </figure>

            <div className={styles.text}>
              <p className={styles.bio}>{t.bio}</p>

              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt>{t.labels.school}</dt>
                  <dd>{t.values.school}</dd>
                </div>
                <div className={styles.fact}>
                  <dt>{t.labels.major}</dt>
                  <dd>{t.values.major}</dd>
                </div>
                <div className={styles.fact}>
                  <dt>{t.labels.grade}</dt>
                  <dd>{t.values.grade}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className={styles.contactBlock} data-reveal>
            <h2 className={styles.contactTitle}>{t.contactLabel}</h2>

            <ul className={styles.contactList}>
              {contacts.map((contact) => {
                const isCopied = copiedType === contact.type
                const isFailed = failedType === contact.type
                const isSelected = selectedType === contact.type
                return (
                  <li key={contact.type} className={styles.contactItem}>
                    <button
                      type="button"
                      className={styles.contactButton}
                      data-testid={`contact-${contact.type}`}
                      onClick={() => handleCopy(contact.type, contact.value)}
                    >
                      <span className={styles.contactLabel}>
                        {contactLabel[lang][contact.type]}
                      </span>
                      <span
                        ref={(node) => {
                          valueRefs.current[contact.type] = node
                        }}
                        className={styles.contactValue}
                      >
                        {contact.value}
                      </span>
                      <span
                        className={
                          isSelected
                            ? styles.contactHintSelected
                            : isFailed
                              ? styles.contactHintFailed
                              : styles.contactHint
                        }
                        role="status"
                      >
                        {isSelected
                          ? t.selectedHint
                          : isFailed
                            ? t.copyFailed
                            : isCopied
                              ? t.copied
                              : t.copyHint}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className={styles.resumeRow}>
              {/* 真实下载：把简历 PDF 放在 public/resume.pdf，这个链接直接下载它 */}
              <DownloadButton
                href={resumeUrl}
                download="Finishing-个人简历.pdf"
                label={t.downloadResume}
                meta={t.resumeMeta}
                testId="resume-button"
              />
            </div>
          </div>

          <a className={styles.back} href="/#archive" onClick={goArchive} data-reveal>
            <span>{t.backToArchive}</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </section>
  )
}
