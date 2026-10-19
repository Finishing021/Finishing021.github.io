import { useCallback, useEffect, useRef, useState } from 'react'
import { useLang } from '../../i18n/useLang'
import type { Lang } from '../../i18n/dict'
import styles from './LangHeart.module.css'

const NOTICE_MS = 2000

/**
 * 语言开关：一枚心形滑动开关，切换全站「中文 / 英文」（默认中文）。
 *
 * 视觉来自 Uiverse 的爱心开关，做了两处收敛：
 *   1) 颜色从原来的粉红改成站点浅蓝（--accent）调性，避免过于花哨；
 *   2) 尺寸缩小成导航栏里一枚精致的小图标。
 *
 * 结构是一枚**真实复选框** + 关联的 `<label>`（心形）：
 *   - 复选框透明、铺满 24×24 热区，负责承载点击 / 键盘 / 读屏语义；
 *   - `:checked` 驱动心形填色与那枚小圆点的滑动动画（沿用原 CSS 思路）；
 *   - `role="switch"` + `aria-checked` 把状态告诉读屏，可访问名写清当前语言；
 *   - 切换结果用 `langNotice` 这个视觉隐藏的 live region 播报。
 */
export default function LangToggle() {
  const { lang, setLang } = useLang()
  const [notice, setNotice] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const choose = useCallback(
    (next: Lang) => {
      if (next === lang) return
      setLang(next)
      setNotice(next === 'en' ? 'Switched to English' : '已切换为中文')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setNotice(null), NOTICE_MS)
    },
    [lang, setLang],
  )

  return (
    <div className={styles.langGroup}>
      <input
        id="lang-switch"
        type="checkbox"
        className={styles.switchInput}
        role="switch"
        aria-checked={lang === 'en'}
        aria-label={
          lang === 'zh' ? '切换语言，当前中文' : 'Switch language, currently English'
        }
        data-lang={lang}
        checked={lang === 'en'}
        onChange={() => choose(lang === 'zh' ? 'en' : 'zh')}
      />
      {/* 心形本体：纯装饰，真实语义由上面的复选框提供 */}
      <label className={styles.loveHeart} htmlFor="lang-switch" aria-hidden="true" data-testid="lang-heart">
        <i className={styles.left} />
        <i className={styles.right} />
        <i className={styles.bottom} />
        <div className={styles.round} data-testid="lang-heart-dot" />
      </label>

      {/* 心形正下方的小字：当前语言「中 / 英」，颜色随语言变化；纯装饰，语义由复选框的 aria-label 提供 */}
      <span className={styles.langLabel} aria-hidden="true">
        {lang === 'zh' ? '中' : 'EN'}
      </span>

      {/* 切换成功的播报节点：只给读屏用，视觉上完全隐藏，不打扰界面 */}
      <span className={styles.langNotice} role="status">
        {notice ?? ''}
      </span>
    </div>
  )
}
