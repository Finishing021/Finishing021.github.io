import { useEffect, useState, type MouseEvent } from 'react'
import { nav } from '../../content/site'
import { navDict, navMainLabel } from '../../i18n/dict'
import { useLang } from '../../i18n/useLang'
import { normalizeRoute, useRoute } from '../../router/route'
import MusicPlayer from '../MusicPlayer/MusicPlayer'
import LangToggle from './LangToggle'
import styles from './Nav.module.css'

/**
 * 导航项图标。沿用 Uiverse 那套「方块里塞一个 SVG、悬停时图标从上方滑入」的视觉，
 * 但换成站点五个板块各自的语义图标（不再用 Instagram/Twitter 那些社媒标志——它们
 * 和「关于我 / 成长档案」对不上）。图标纯装饰，`aria-hidden` 交给文字 span 提供可访问名。
 */
function NavIcon({ id }: { id: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    className: styles.icon,
    'aria-hidden': true,
  }
  switch (id) {
    case 'about':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </svg>
      )
    case 'archive':
      return (
        <svg {...common}>
          <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19z" />
          <path d="M12 3v17.5" />
        </svg>
      )
    case 'moments':
      return (
        <svg {...common}>
          <path d="M4 8h3l1.6-2.2h6.8L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
          <circle cx="12" cy="13" r="3.2" />
        </svg>
      )
    case 'projects':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.2" />
          <rect x="13" y="4" width="7" height="7" rx="1.2" />
          <rect x="4" y="13" width="7" height="7" rx="1.2" />
          <rect x="13" y="13" width="7" height="7" rx="1.2" />
        </svg>
      )
    case 'guestbook':
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="M4 7l8 6 8-6" />
        </svg>
      )
    default:
      return null
  }
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const { route, navigate } = useRoute()
  const { lang } = useLang()
  const labels = navDict[lang]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goHome = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    // Request Z：Logo 是站内首页入口，回到「关于我」整页（封面重挂需整体重入场，故跳内页 About）
    navigate('/about')
  }

  /**
   * 导航项分两类：
   *   /about、/moments → 独立整页
   *   /#archive        → 首页上的锚点，先回首页再滚过去
   * 两者都走 pushState，不用浏览器默认的锚点跳转，否则在别的页面上点「成长档案」
   * 只会改 hash 而不换页，看起来像没反应。
   *
   * ⚠️ 这里**不能**写死目标页面。原先是 `navigate('/about')`，只因为当时
   * 导航恰好只有「关于我」和「成长档案」两项、而后者走锚点分支才没出事。
   * 加第三项时它会把 /moments 也跳到关于我。改走 normalizeRoute 之后
   * 导航项怎么加都不会跳错。有测试盯着这一点。
   */
  const goNav = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault()
    if (href.startsWith('/#')) {
      navigate('/', href.slice(2))
      return
    }
    navigate(normalizeRoute(href))
  }

  return (
    <header className={scrolled ? `${styles.nav} ${styles.scrolled}` : styles.nav}>
      <div className={styles.inner}>
        <a className={styles.brand} href="/" onClick={goHome} aria-label={labels.home}>
          Finishing
        </a>
        <nav className={styles.links} aria-label={navMainLabel[lang]}>
          {nav.map((item) => {
            /* 锚点链接落在首页上，其余按路径归一。按数据推导而不是按 id 写死，
               加第四个导航项时不用回来改这里 */
            const target = item.href.startsWith('/#') ? '/' : normalizeRoute(item.href)
            const active = target === route
            return (
              <a
                key={item.id}
                className={active ? `${styles.link} ${styles.linkActive}` : styles.link}
                href={item.href}
                title={labels[item.id]}
                aria-current={active ? 'page' : undefined}
                onClick={(event) => goNav(event, item.href)}
              >
                <NavIcon id={item.id} />
                <span className={styles.label}>{labels[item.id]}</span>
              </a>
            )
          })}
          <LangToggle />
          {/* 背景音乐：最右侧，紧挨语言开关。找不到的右下角大圆钮已成为历史 */}
          <MusicPlayer />
        </nav>
      </div>
    </header>
  )
}
