import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * 站内路由。
 *
 * 只有四个页面：首页（成长档案）、/about（关于我）、/moments（光影摄影墙）、
 * /projects（作品集）。为此引入 react-router 太重，所以这里用 History API 自己实现 ——
 * pushState 换地址、popstate 收回退。
 *
 * ⚠️ 部署注意：/about、/moments 与 /projects 都是真实路径，静态托管必须把所有未命中的
 *    路径都回退到 index.html（SPA fallback），否则直接访问会 404。
 *    Vite 的 dev server 与 vite preview 默认都有这个回退。
 */

export type Route = '/' | '/about' | '/moments' | '/projects' | '/guestbook'

/** 把任意路径名归一成已知路由，未知的统统当作首页 */
export function normalizeRoute(pathname: string): Route {
  const trimmed = pathname.replace(/\/+$/, '')
  if (trimmed === '/about') return '/about'
  if (trimmed === '/moments') return '/moments'
  if (trimmed === '/projects') return '/projects'
  if (trimmed === '/guestbook') return '/guestbook'
  return '/'
}

interface RouteContextValue {
  route: Route
  /** 跳转。传 hash 时会在落地后滚到对应锚点。 */
  navigate: (to: Route, hash?: string) => void
}

const RouteContext = createContext<RouteContextValue | null>(null)

export function RouteProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => normalizeRoute(window.location.pathname))
  const [pendingHash, setPendingHash] = useState<string | null>(null)

  useEffect(() => {
    const onPop = () => setRoute(normalizeRoute(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to: Route, hash?: string) => {
    const target = hash ? `${to === '/' ? '/' : to}#${hash}` : to
    if (window.location.pathname + window.location.hash !== target) {
      window.history.pushState({}, '', target)
    }
    setRoute(to)
    setPendingHash(hash ?? null)
  }, [])

  /**
   * 落地后再滚。必须等目标页面的 DOM 真正挂上 —— 刚 pushState 时
   * document.getElementById 拿到的还是上一页的节点（或者根本是 null）。
   */
  useEffect(() => {
    if (pendingHash) {
      const el = document.getElementById(pendingHash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setPendingHash(null)
        return
      }
      // 目标还没渲染出来就先不消费，等下一轮；下一轮还没有就放弃，避免死等
      const raf = requestAnimationFrame(() => {
        document.getElementById(pendingHash)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
        setPendingHash(null)
      })
      return () => cancelAnimationFrame(raf)
    }

    // 换页且没有指定锚点时回到顶部，否则会带着上一页的滚动位置
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      /* jsdom 没有实现 scrollTo，忽略即可 */
    }
  }, [route, pendingHash])

  /**
   * 路由切换后，强制浏览器重新评估一次「懒加载图片」与 ScrollTrigger 的触发位置。
   *
   * SPA 换页是局部替换 DOM、不重新解析，浏览器对 `loading="lazy"` 图片的
   * 进场判定、以及 ScrollTrigger 的测量，偶尔会在切换后「睡过去」——表现为
   * 新页面图片刷不出来、滚动揭示卡在 opacity:0。派发一个 resize 让两者重新计算，
   * 手机端尤其明显。对桌面端无害（只多一次廉价重算）。
   */
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })
    return () => cancelAnimationFrame(raf)
  }, [route])

  const value = useMemo<RouteContextValue>(() => ({ route, navigate }), [route, navigate])

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>
}

export function useRoute(): RouteContextValue {
  const ctx = useContext(RouteContext)
  if (!ctx) {
    throw new Error('useRoute 必须在 <RouteProvider> 内部使用')
  }
  return ctx
}
