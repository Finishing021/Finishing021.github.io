import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import About from '../components/About/About'
import LangToggle from '../components/Nav/LangToggle'
import { contacts } from '../content/site'
import { LangProvider } from '../i18n/useLang'
import { RouteProvider } from '../router/route'

function stubClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    writable: true,
    value,
  })
}

function renderAbout() {
  return render(
    <RouteProvider>
      <LangProvider initial="zh">
        <LangToggle />
        <About />
      </LangProvider>
    </RouteProvider>,
  )
}

afterEach(() => {
  stubClipboard(undefined)
})

describe('关于我 — 联系方式复制', () => {
  it('剪贴板可用时点击后提示已复制', async () => {
    // 注意：userEvent.setup() 会自己往 navigator.clipboard 装一个可用的桩，
    // 所以必须「先 setup，再注入我们自己的桩」，否则会被覆盖。
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard({ writeText })

    renderAbout()
    await user.click(screen.getByTestId('contact-wechat'))

    const wechat = contacts.find((contact) => contact.type === 'wechat')
    expect(writeText).toHaveBeenCalledWith(wechat?.value)
    expect(await screen.findByText('已复制')).toBeInTheDocument()
  })

  it('邮箱同样可以一键复制', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard({ writeText })

    renderAbout()
    await user.click(screen.getByTestId('contact-email'))

    const email = contacts.find((contact) => contact.type === 'email')
    expect(writeText).toHaveBeenCalledWith(email?.value)
    expect(await screen.findByText('已复制')).toBeInTheDocument()
  })

  /*
   * 降级链路：localhost / 非 HTTPS / 用户拒绝授权时 navigator.clipboard 用不了。
   * 这时不再只丢一句「复制失败」，而是自动把文本选中，让访客按一下 Ctrl+C 就行。
   */
  it('剪贴板不可用时自动选中文本并提示按 Ctrl+C，而不是静默失败', async () => {
    const user = userEvent.setup()
    // 模拟非 HTTPS 环境：navigator.clipboard 根本不存在
    stubClipboard(undefined)

    renderAbout()
    await user.click(screen.getByTestId('contact-email'))

    expect(await screen.findByText('已为您选中，请按 Ctrl+C 复制')).toBeInTheDocument()
    // 选中的必须就是邮箱本身，否则 Ctrl+C 复制到的不是想要的内容
    expect(String(window.getSelection())).toContain('2820106405@qq.com')
  })

  it('剪贴板调用被拒绝时同样降级为自动选中', async () => {
    const user = userEvent.setup()
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })

    renderAbout()
    await user.click(screen.getByTestId('contact-email'))

    expect(await screen.findByText('已为您选中，请按 Ctrl+C 复制')).toBeInTheDocument()
  })

  /* 连选中都做不到（极老的浏览器）才退回原来的失败提示，别让页面静悄悄 */
  it('连文本选中都失败时才退回失败提示', async () => {
    const user = userEvent.setup()
    stubClipboard(undefined)
    const spy = vi.spyOn(window, 'getSelection').mockReturnValue(null)

    renderAbout()
    await user.click(screen.getByTestId('contact-email'))

    expect(await screen.findByText('复制失败，请手动选择')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('微信与邮箱展示的是真实号码与地址', () => {
    stubClipboard(undefined)
    renderAbout()

    expect(screen.getByText('13357815021')).toBeInTheDocument()
    expect(screen.getByText('2820106405@qq.com')).toBeInTheDocument()
  })
})

describe('关于我 — 简历下载', () => {
  it('简历是一个指向 /resume.pdf 的真实下载链接', () => {
    stubClipboard(undefined)
    renderAbout()

    const link = screen.getByTestId('resume-button')
    expect(link.tagName).toBe('A')
    expect(link).toHaveTextContent('下载简历')
    expect(link).toHaveAttribute('href', '/resume.pdf')
    // download 属性才会触发「另存为」而不是在浏览器里打开
    expect(link).toHaveAttribute('download')
  })
})

describe('关于我 — 整页随语言切换', () => {
  it('一键切换中英文：标题、简介、简历按钮与学校/专业/年级整段跟着变', async () => {
    stubClipboard(undefined)
    const user = userEvent.setup()
    renderAbout()

    expect(screen.getByTestId('about-heading')).toHaveTextContent('关于我')
    // 中文模式：标签与值都是中文
    expect(screen.getByText('学校')).toBeInTheDocument()
    expect(screen.getByText('扬州大学')).toBeInTheDocument()
    expect(screen.getByText('车辆工程')).toBeInTheDocument()
    expect(screen.getByText('大一')).toBeInTheDocument()

    await user.click(screen.getByRole('switch'))

    expect(screen.getByTestId('about-heading')).toHaveTextContent('About Me')
    expect(screen.getByTestId('resume-button')).toHaveTextContent('Download CV')
    /*
     * 英文模式：标签与值都换成英文（站主最终定的规则是「英文模式显示对应英文」）。
     * 这里刻意断言译文而不是保留中文原文 —— 两个方向都钉住，改坏了会立刻红。
     */
    expect(screen.getByText('School')).toBeInTheDocument()
    expect(screen.getByText('Major')).toBeInTheDocument()
    expect(screen.getByText('Year')).toBeInTheDocument()
    expect(screen.getByText('Yangzhou University')).toBeInTheDocument()
    expect(screen.getByText('Vehicle Engineering')).toBeInTheDocument()
    expect(screen.getByText('Freshman')).toBeInTheDocument()
    // 切到英文后中文原文不该再出现
    expect(screen.queryByText('扬州大学')).not.toBeInTheDocument()

    // 再切回中文，确认是双向可逆的
    await user.click(screen.getByRole('switch'))
    expect(screen.getByTestId('about-heading')).toHaveTextContent('关于我')
    expect(screen.getByText('扬州大学')).toBeInTheDocument()
    expect(screen.queryByText('School')).not.toBeInTheDocument()
  })
})
