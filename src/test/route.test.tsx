import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import ArchivePreview from '../components/Archive/ArchivePreview'
import About from '../components/About/About'
import Nav from '../components/Nav/Nav'
import { LangProvider } from '../i18n/useLang'
import { RouteProvider, normalizeRoute, useRoute } from '../router/route'

function Probe() {
  const { route } = useRoute()
  return <p data-testid="route">{route}</p>
}

function renderNav() {
  return render(
    <RouteProvider>
      <LangProvider initial="zh">
        <Nav />
        <Probe />
      </LangProvider>
    </RouteProvider>,
  )
}

beforeEach(() => {
  window.history.replaceState({}, '', '/')
})

describe('路径归一', () => {
  it('已知路径原样返回，未知路径一律当首页', () => {
    expect(normalizeRoute('/')).toBe('/')
    expect(normalizeRoute('/about')).toBe('/about')
    expect(normalizeRoute('/about/')).toBe('/about')
    expect(normalizeRoute('/nope')).toBe('/')
  })

  it('摄影墙 /moments 也是已知路径', () => {
    expect(normalizeRoute('/moments')).toBe('/moments')
    expect(normalizeRoute('/moments/')).toBe('/moments')
  })

  it('作品集 /projects 也是已知路径', () => {
    expect(normalizeRoute('/projects')).toBe('/projects')
    expect(normalizeRoute('/projects/')).toBe('/projects')
  })
})

describe('导航跳转', () => {
  it('默认落在首页', () => {
    renderNav()
    expect(screen.getByTestId('route')).toHaveTextContent('/')
  })

  it('点「关于我」跳到 /about，地址栏同步改变', async () => {
    const user = userEvent.setup()
    renderNav()

    await user.click(screen.getByRole('link', { name: '关于我' }))

    expect(screen.getByTestId('route')).toHaveTextContent('/about')
    expect(window.location.pathname).toBe('/about')
  })

  it('导航顺序是 关于我 → 成长档案 → 光影 → 作品集', () => {
    renderNav()

    const labels = screen
      .getAllByRole('link')
      .map((link) => link.textContent)
      .filter((text): text is string => text !== null)
    expect(labels).toEqual(['Finishing', '关于我', '成长档案', '光影', '作品集', '留言'])
  })

  it('点「作品集」跳到 /projects', async () => {
    const user = userEvent.setup()
    renderNav()

    await user.click(screen.getByRole('link', { name: '作品集' }))

    expect(screen.getByTestId('route')).toHaveTextContent('/projects')
    expect(window.location.pathname).toBe('/projects')
  })

  it('点「光影」跳到 /moments', async () => {
    const user = userEvent.setup()
    renderNav()

    await user.click(screen.getByRole('link', { name: '光影' }))

    expect(screen.getByTestId('route')).toHaveTextContent('/moments')
    expect(window.location.pathname).toBe('/moments')
  })

  it('点「留言」跳到 /guestbook', async () => {
    const user = userEvent.setup()
    renderNav()

    await user.click(screen.getByRole('link', { name: '留言' }))

    expect(screen.getByTestId('route')).toHaveTextContent('/guestbook')
    expect(window.location.pathname).toBe('/guestbook')
  })

  /*
   * 回归守护：goNav 原先在 else 分支写死 navigate('/about')，
   * 只因为当时导航恰好只有两项、而另一项走锚点分支才没出事。
   * 加「光影」时这个写死值会把 /moments 静默跳成关于我 —— 用户看到的是
   * 「点了没反应」，而不是报错，极难排查。这条测试就是为了钉死它。
   */
  it('从光影页点导航项，不会错误落到关于我', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/moments')

    renderNav()
    expect(screen.getByTestId('route')).toHaveTextContent('/moments')

    await user.click(screen.getByRole('link', { name: '光影' }))

    expect(screen.getByTestId('route')).toHaveTextContent('/moments')
    expect(window.location.pathname).not.toBe('/about')
  })

  it('导航项的当前页高亮跟着路由走', async () => {
    const user = userEvent.setup()
    renderNav()

    // 首页：只有「成长档案」算当前页
    expect(screen.getByRole('link', { name: '成长档案' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('link', { name: '光影' }))

    expect(screen.getByRole('link', { name: '光影' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '成长档案' })).not.toHaveAttribute('aria-current')
  })

  it('在 /about 上点「成长档案」会回到首页并带上锚点', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/about')

    renderNav()
    expect(screen.getByTestId('route')).toHaveTextContent('/about')

    await user.click(screen.getByRole('link', { name: '成长档案' }))

    expect(screen.getByTestId('route')).toHaveTextContent('/')
    expect(window.location.hash).toBe('#archive')
  })

  it('浏览器后退能回到上一个页面', async () => {
    const user = userEvent.setup()
    renderNav()

    await user.click(screen.getByRole('link', { name: '关于我' }))
    expect(screen.getByTestId('route')).toHaveTextContent('/about')

    // jsdom 的 history.back() 是否派发 popstate 不可靠，这里直接派发事件来测监听本身
    window.history.replaceState({}, '', '/')
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(screen.getByTestId('route')).toHaveTextContent('/')
  })
})

describe('页面互斥', () => {
  it('首页与关于我不会同时出现在 DOM 里', async () => {
    const user = userEvent.setup()

    function Switcher() {
      const { route } = useRoute()
      return <>{route === '/about' ? <About /> : <ArchivePreview />}</>
    }

    render(
      <RouteProvider>
        <LangProvider initial="zh">
          <Nav />
          <Switcher />
        </LangProvider>
      </RouteProvider>,
    )

    expect(screen.queryByTestId('about-heading')).toBeNull()
    expect(screen.getByText('写下来的那些时候')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '关于我' }))

    expect(screen.getByTestId('about-heading')).toBeInTheDocument()
    expect(screen.queryByText('写下来的那些时候')).toBeNull()
  })
})
