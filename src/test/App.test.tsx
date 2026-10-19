import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { cover } from '../content/site'

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

/** 承载主内容的外层容器 */
function mainWrapper() {
  return document.querySelector<HTMLElement>('[tabindex="-1"]')
}

function cta() {
  return screen.queryByRole('button', { name: cover.cta })
}

/** 懒加载整页到位后才能断言其内容——动态 import 是异步的，必须等 */
const LAZY_TIMEOUT = 3000

/** 每个用例都从首页起步：路由状态会跨用例残留 */
beforeEach(() => {
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  document.body.style.overflow = ''
  window.history.replaceState({}, '', '/')
})

describe('封面页与主内容区的切换', () => {
  it('未进入时主内容对读屏隐藏、不可聚焦，页面滚动也被锁住', () => {
    mockMatchMedia(false)
    render(<App initialLang="zh" />)

    expect(cta()).toBeInTheDocument()
    expect(mainWrapper()).toHaveAttribute('aria-hidden', 'true')
    expect(mainWrapper()?.hasAttribute('inert')).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('减少动态效果时点击后立即切换到主内容并恢复滚动', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    render(<App initialLang="zh" />)

    await user.click(cta() as HTMLElement)

    await waitFor(() => expect(cta()).toBeNull())
    expect(mainWrapper()).not.toHaveAttribute('aria-hidden')
    expect(mainWrapper()?.hasAttribute('inert')).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })

  it('正常动效下，过渡期间保持封锁，播完才解锁并卸载封面', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    render(<App initialLang="zh" />)

    await user.click(cta() as HTMLElement)

    // 过渡进行中：封面还在屏幕上渐隐，主内容必须继续对读屏隐藏，
    // 否则会读到被遮住的内容
    expect(cta()).toBeInTheDocument()
    expect(mainWrapper()).toHaveAttribute('aria-hidden', 'true')
    expect(mainWrapper()?.hasAttribute('inert')).toBe(true)

    // 过渡播完：封面卸载，封锁解除，焦点移入主内容
    await waitFor(() => expect(cta()).toBeNull(), { timeout: 3000 })
    expect(mainWrapper()).not.toHaveAttribute('aria-hidden')
    expect(mainWrapper()?.hasAttribute('inert')).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })

  it('进入主内容后，关于我成为页面唯一的一级标题', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    render(<App initialLang="zh" />)

    await user.click(cta() as HTMLElement)

    await waitFor(() => expect(cta()).toBeNull())
    // /about 是懒加载整页，内容要等 chunk 到位后才在 DOM 里
    await waitFor(
      () => {
        const headings = screen.getAllByRole('heading', { level: 1 })
        expect(headings).toHaveLength(1)
        expect(headings[0]).toHaveTextContent('关于我')
      },
      { timeout: LAZY_TIMEOUT },
    )
  })

  it('进入后焦点被移入主内容，键盘用户不必重新 Tab 一遍导航', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    render(<App initialLang="zh" />)

    await user.click(cta() as HTMLElement)

    await waitFor(() => expect(mainWrapper()).toHaveFocus())
  })
})

describe('光影是独立整页', () => {
  it('点导航里的「光影」后换成整页，且地址变成 /moments', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    render(<App initialLang="zh" />)

    await user.click(cta() as HTMLElement)
    await waitFor(() => expect(cta()).toBeNull())

    await user.click(screen.getByRole('link', { name: '光影' }))

    expect(window.location.pathname).toBe('/moments')
    // 成长档案整块退场，不再是「光影在首页下方」（首页是同步渲染，退场是同步的）
    expect(screen.queryByText('写下来的那些时候')).toBeNull()
  })

  it('光影整页的一级标题唯一', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    render(<App initialLang="zh" />)

    await user.click(cta() as HTMLElement)
    await waitFor(() => expect(cta()).toBeNull())
    await user.click(screen.getByRole('link', { name: '光影' }))

    // /moments 是懒加载整页
    await waitFor(
      () => {
        const headings = screen.getAllByRole('heading', { level: 1 })
        expect(headings).toHaveLength(1)
        expect(headings[0]).toHaveTextContent('拍下来的那些时候')
      },
      { timeout: LAZY_TIMEOUT },
    )
  })

  it('直接深链访问 /moments 也能渲染（静态托管需要 SPA fallback）', async () => {
    mockMatchMedia(true)
    window.history.replaceState({}, '', '/moments')
    render(<App initialLang="zh" />)

    // 深链直达内容，不再先显示封面（否则访客从外链进来会撞上白屏封面）
    expect(cta()).toBeNull()
    // /moments 是懒加载整页
    await waitFor(() => expect(screen.getByText('拍下来的那些时候')).toBeInTheDocument(), {
      timeout: LAZY_TIMEOUT,
    })
  })
})

/*
 * 这一组刻意**不传 initialLang** —— 测的就是「线上什么都不给时是哪国语言」。
 * 站主要求打开网站默认中文，所以默认值一旦被改回英文，这里会立刻失败。
 */
describe('全站默认中文', () => {
  it('不传任何参数时，封面、导航、首页标题都是中文', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('button', { name: '点击进入' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '点击进入' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: '点击进入' })).toBeNull())

    // 导航是常驻组件，语言切换同步可见
    expect(screen.getByRole('link', { name: '关于我' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '光影' })).toBeInTheDocument()
    // 但一级标题在懒加载的 /about 整页里
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('关于我'), {
      timeout: LAZY_TIMEOUT,
    })
  })

  it('把开关拨到 EN 全站换英文，再拨回中文', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '点击进入' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: '点击进入' })).toBeNull())

    await user.click(screen.getByRole('switch'))

    await waitFor(
      () => {
        expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About')
      },
      { timeout: LAZY_TIMEOUT },
    )

    await user.click(screen.getByRole('switch'))

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('关于我'), {
      timeout: LAZY_TIMEOUT,
    })
  })
})

describe('作品集是独立整页', () => {
  it('点导航里的「作品集」后换成整页，且地址变成 /projects', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    render(<App initialLang="zh" />)

    await user.click(screen.getByRole('button', { name: '点击进入' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: '点击进入' })).toBeNull())

    await user.click(screen.getByRole('link', { name: '作品集' }))

    expect(window.location.pathname).toBe('/projects')
    // /projects 是懒加载整页：下载按钮要等 chunk 到位
    await waitFor(() => expect(screen.getByTestId('portfolio-download')).toBeInTheDocument(), {
      timeout: LAZY_TIMEOUT,
    })
  })

  it('直接深链访问 /projects 也能渲染（静态托管需要 SPA fallback）', async () => {
    mockMatchMedia(true)
    window.history.replaceState({}, '', '/projects')
    render(<App initialLang="zh" />)

    // 深链直达内容，不再先显示封面
    expect(cta()).toBeNull()
    // /projects 是懒加载整页
    await waitFor(
      () => {
        const headings = screen.getAllByRole('heading', { level: 1 })
        expect(headings).toHaveLength(1)
        expect(headings[0]).toHaveTextContent('所见，所思，所行。')
      },
      { timeout: LAZY_TIMEOUT },
    )
  })
})

describe('关于我是独立整页', () => {
  it('点导航里的「关于我」后换成整页，且地址变成 /about', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    render(<App initialLang="zh" />)

    await user.click(cta() as HTMLElement)
    await waitFor(() => expect(cta()).toBeNull())

    await user.click(screen.getByRole('link', { name: '关于我' }))

    expect(window.location.pathname).toBe('/about')
    // 成长档案整块退场，不再是「关于我在首页下方」
    expect(screen.queryByText('写下来的那些时候')).toBeNull()
    // /about 是懒加载整页
    await waitFor(() => expect(screen.getByTestId('about-heading')).toBeInTheDocument(), {
      timeout: LAZY_TIMEOUT,
    })
  })

  it('关于我整页里的一级标题唯一，就是「关于我」', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    render(<App initialLang="zh" />)

    await user.click(cta() as HTMLElement)
    await waitFor(() => expect(cta()).toBeNull())
    await user.click(screen.getByRole('link', { name: '关于我' }))

    // /about 是懒加载整页
    await waitFor(
      () => {
        const headings = screen.getAllByRole('heading', { level: 1 })
        expect(headings).toHaveLength(1)
        expect(headings[0]).toHaveTextContent('关于我')
      },
      { timeout: LAZY_TIMEOUT },
    )
  })
})
