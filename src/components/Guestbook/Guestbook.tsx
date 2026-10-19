import { useState, type FormEvent } from 'react'
import { guestbookDict } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import section from '../../styles/section.module.css'
import Epigraph from '../Epigraph/Epigraph'
import styles from './Guestbook.module.css'
import SendButton from './SendButton'

/** Web3Forms 接入密钥（站主在 web3forms.com 申请的 Access Key）。 */
const ACCESS_KEY = 'a9a04678-363c-4446-a6fb-36a7db596454'

type SendStatus = 'idle' | 'sending' | 'sent' | 'fail'

/**
 * 「留言」—— 极简写信板（/guestbook）。
 *
 * 不接数据库、不存任何数据：点发送经由 Web3Forms 表单服务把留言寄到站主邮箱，
 * 全程在浏览器里用 fetch 完成，网站本身零存储、零隐私负担。
 */
export default function Guestbook() {
  const { lang } = useLang()
  const t = guestbookDict[lang]

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<SendStatus>('idle')
  const [error, setError] = useState(false)

  // 发送成功 / 失败后，访客一旦重新动笔，就把按钮复位回可发送的常态
  const resetStatusIfNeeded = () => {
    if (status === 'sent' || status === 'fail') setStatus('idle')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    // 没写内容就别发请求，给一句温和的提醒
    if (message.trim() === '') {
      setError(true)
      return
    }
    setError(false)
    setStatus('sending')

    const byline = name.trim() === '' ? t.anonymous : name.trim()

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          name: byline,
          message: message.trim(),
          subject: `${t.mailSubjectPrefix}${byline}`,
        }),
      })

      const data = (await response.json()) as { success?: boolean }

      if (data.success) {
        // 成功：弹提示 + 清空输入框
        setStatus('sent')
        setName('')
        setMessage('')
      } else {
        setStatus('fail')
      }
    } catch {
      // 网络异常等任何失败都走这里
      setStatus('fail')
    }
  }

  return (
    <section id="guestbook" className={section.section} aria-labelledby="guestbook-title">
      <div className={section.inner}>
        <header className={section.head}>
          <p className={section.eyebrow} data-reveal>
            {t.eyebrow}
          </p>
          <h1 className={section.heading} id="guestbook-title" data-reveal>
            {t.heading}
          </h1>
          <p className={section.lead} data-reveal>
            {t.lead}
          </p>
        </header>

        <div className={styles.layout}>
          <div className={styles.formCol}>
            <form className={styles.form} onSubmit={handleSubmit} noValidate data-reveal>
              <div className={styles.field}>
                <label className={styles.tag} htmlFor="gb-name">
                  {t.nameLabel}
                </label>
                <input
                  id="gb-name"
                  className={styles.box}
                  type="text"
                  autoComplete="name"
                  placeholder={t.namePlaceholder}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    resetStatusIfNeeded()
                  }}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.tag} htmlFor="gb-message">
                  {t.messageLabel}
                </label>
                <textarea
                  id="gb-message"
                  className={styles.box}
                  placeholder={t.messagePlaceholder}
                  rows={6}
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value)
                    if (error) setError(false)
                    resetStatusIfNeeded()
                  }}
                  aria-invalid={error || undefined}
                  aria-describedby={error ? 'gb-error' : undefined}
                />
                {error && (
                  <p id="gb-error" className={styles.error} role="alert">
                    {t.emptyError}
                  </p>
                )}
              </div>

              <SendButton
                label={t.send}
                sentLabel={t.sentShort}
                sendingLabel={t.sending}
                status={status === 'fail' ? 'idle' : status}
              />

              <p className={styles.hint}>{t.hint}</p>

              {status === 'sent' && (
                <p className={styles.sent} role="status">
                  {t.successNote}
                </p>
              )}

              {status === 'fail' && (
                <p className={styles.error} role="alert">
                  {t.failNote}
                </p>
              )}
            </form>
          </div>

          <aside className={styles.decorCol} aria-label={t.decorTitle}>
            <div className={styles.decorInner}>
              <svg className={styles.envelope} viewBox="0 0 120 80" fill="none" aria-hidden="true">
                <rect x="6" y="8" width="108" height="64" rx="12" stroke="currentColor" strokeWidth="2.5" />
                <path
                  d="M6 22 L60 46 L114 22"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className={styles.decorTitle}>{t.decorTitle}</p>
              <p className={styles.decorLead}>{t.decorLead}</p>
            </div>
          </aside>
        </div>

        {/* 寄语统一放在页面最下方：表单填完之后，作为给每一位写信人的祝福 */}
        <Epigraph text={t.epigraph} size="lg" />
      </div>
    </section>
  )
}
