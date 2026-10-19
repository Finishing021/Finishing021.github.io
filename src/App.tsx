import gsap from 'gsap'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import styles from './App.module.css'
import ArchivePreview from './components/Archive/ArchivePreview'
import Cover from './components/Cover/Cover'
import Footer from './components/Footer/Footer'
import Nav from './components/Nav/Nav'
import ScrollReveal from './components/ScrollReveal'
import MouseParticles from './components/MouseParticles/MouseParticles'
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'
import type { Lang } from './i18n/dict'
import { LangProvider } from './i18n/useLang'
import { RouteProvider, normalizeRoute, useRoute } from './router/route'

/*
 * 代码分包（缺陷三）：除首页（成长档案）外，其余四个整页都用 React.lazy 动态导入，
 * 首屏只加载首页代码；点进哪个页才下载对应 chunk，互不拖累，首屏 JS 体积大幅下降。
 * 首页（ArchivePreview）保持同步导入 —— 它本身就是首屏内容，本就该最先到。
 */
const About = lazy(() => import('./components/About/About'))
const Moments = lazy(() => import('./components/Moments/Moments'))
const Projects = lazy(() => import('./components/Projects/Projects'))
const Guestbook = lazy(() => import('./components/Guestbook/Guestbook'))

/** 懒加载整页挂载后显示的淡蓝渐变骨架屏（缺陷三：拒绝纯白屏） */
import PageSkeleton from './components/PageSkeleton'

/** initialLang 便于测试指定起始语言；线上默认中文 */
export default function App({ initialLang = 'zh' }: { initialLang?: Lang } = {}) {
  return (
    <>
      {/* 路由要包在最外层：封面、导航、页面内容都得读当前路由 */}
      <RouteProvider>
        <LangProvider initial={initialLang}>
          <Shell />
        </LangProvider>
      </RouteProvider>

      {/*
        全站鼠标粒子：挂在 App 最外层，与路由 / 语言无关 ——
        首页、封面、关于我、成长档案、光影、作品集、留言板都能看到。
        画布 portal 到 document.body，pointer-events:none，z-index 9990
        （低于灯箱 10000），既不挡点击，也不会在灯箱里穿帮。
      */}
      <MouseParticles />
    </>
  )
}

function Shell() {
  /**
   * 封面是整站入口引导，只在「直接打开首页」时显示。
   * 深链到其它路由（/about、/moments、/guestbook…）时跳过封面，直达页面内容 ——
   * 否则访客从外链点进来会先撞上一块暖白封面、内容被 inert 挡住，看着像白屏。
   */
  const [coverMounted, setCoverMounted] = useState(
    () => normalizeRoute(window.location.pathname) === '/',
  )
  const [entered, setEntered] = useState(false)
  /** 懒加载整页挂载完成后才置真；ScrollReveal 据此在 chunk 到位后再扫描，避免首屏/切页内容卡在 opacity:0 */
  const [pageReady, setPageReady] = useState(false)
  const coverRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const enterTimeline = useRef<gsap.core.Timeline | null>(null)
  const reduced = usePrefersReducedMotion()
  const { route, navigate } = useRoute()

  /**
   * 封面还挂在页面上时：锁住滚动，主内容对读屏与 Tab 不可达。
   * 封面是 position: fixed 的全屏层，主内容一直在它下方，不这么做
   * 屏幕阅读器会先读完整套主内容才轮到封面按钮。
   */
  const gated = coverMounted

  useEffect(() => {
    document.body.style.overflow = gated ? 'hidden' : ''
    // 根元素背景要跟着封面走：滚动条槽位只有根背景能上色（详见 global.css）
    if (gated) document.documentElement.setAttribute('data-cover-open', '')
    else document.documentElement.removeAttribute('data-cover-open')

    return () => {
      document.body.style.overflow = ''
      document.documentElement.removeAttribute('data-cover-open')
    }
  }, [gated])

  // 路由切换时先把 pageReady 置假，等懒加载整页真正挂载后再置真，
  // 让 ScrollReveal 在 chunk 到位后重新扫描 [data-reveal]，避免切页后内容刷不出来。
  useEffect(() => {
    setPageReady(false)
  }, [route])

  // 必须等 inert 真正从 DOM 上摘掉之后再聚焦，否则浏览器会拒绝聚焦
  useEffect(() => {
    if (coverMounted) return
    mainRef.current?.focus()
  }, [coverMounted])

  // 组件卸载（含测试环境）时收掉未播完的时间轴，避免它回调到已卸载的组件
  useEffect(
    () => () => {
      enterTimeline.current?.kill()
    },
    [],
  )

  const handleEnter = useCallback(() => {
    if (entered) return
    setEntered(true)
    // Request Z：进入封面后默认落在「关于我」整页，而不是成长档案
    navigate('/about')

    const cover = coverRef.current
    const main = mainRef.current

    if (reduced || !cover) {
      setCoverMounted(false)
      return
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        /*
         * 必须清掉入场动画留下的内联 transform / opacity。
         *
         * 带 transform 的元素会成为 position: fixed 后代的**包含块**。main 上残留的
         * `matrix(1,0,0,1,0,0)` 会让挂在它里面的全屏灯箱不再以视口为基准，而是以 main
         * 这个三千多像素高的盒子为基准 —— 表现为遮罩撑满全页、图落到屏幕外、focus()
         * 把页面滚回顶部。灯箱本身已用 portal 规避，这里再清一次是治本：
         * main 不该留着一个恒等的 transform 白占一个层叠上下文。
         *
         * ScrollReveal 对 [data-reveal] 用的是同一招（clearProps），此处补齐。
         */
        if (main) gsap.set(main, { clearProps: 'transform,opacity' })
        setCoverMounted(false)
      },
    })
    enterTimeline.current = timeline

    timeline
      .to(
        cover,
        { opacity: 0, yPercent: -5, scale: 1.04, duration: 0.95, ease: 'expo.inOut' },
        0,
      )
      .fromTo(
        main,
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 1.05, ease: 'expo.out' },
        0.18,
      )
  }, [entered, reduced, navigate])

  /* 路由决定 main 里渲染哪一页。默认回落首页（成长档案）。 */
  const page =
    route === '/about' ? (
      <About />
    ) : route === '/moments' ? (
      <Moments />
    ) : route === '/projects' ? (
      <Projects />
    ) : route === '/guestbook' ? (
      <Guestbook />
    ) : (
      <ArchivePreview />
    )

  return (
    <>
      {coverMounted && (
        <div className={styles.gate} ref={coverRef}>
          <Cover onEnter={handleEnter} />
        </div>
      )}

      {!gated && (
        /*
         * 滚动进场动画。刻意等封面退场后再挂载 —— 封面期间 body 锁滚动，
         * 那时测量 ScrollTrigger 的触发位置全是错的。
         * route 进依赖数组：换页后要重新抓一遍新页面上的 [data-reveal]，
         * 否则新页面的元素永远不会被注册，也就永远不播。
         */
        <ScrollReveal route={route} ready={pageReady} />
      )}

      <div
        className={styles.main}
        ref={mainRef}
        tabIndex={-1}
        aria-hidden={gated || undefined}
        inert={gated || undefined}
      >
        <Nav />
        <main id="main">
          <Suspense fallback={<PageSkeleton />}>
            {page}
            <PageMountSignal onReady={() => setPageReady(true)} />
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  )
}

/**
 * 挂载信号：随懒加载整页一起渲染。整页 chunk 到位、页面真正挂上 DOM 后，
 * 它的 effect 才会触发（Suspense 挂起期间整棵子树都不渲染，信号也就不挂载），
 * 借此把 pageReady 置真，通知 ScrollReveal 可以扫描新页面的 [data-reveal] 了。
 */
function PageMountSignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady()
  }, [onReady])
  return null
}
