import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import LangToggle from '../components/Nav/LangToggle'
import { LangProvider, useLang } from '../i18n/useLang'
import { RouteProvider } from '../router/route'

function Probe() {
  const { lang, t } = useLang()
  return <p data-testid="probe">{`${lang}|${t.heading}`}</p>
}

function renderToggle(initial?: 'zh' | 'en') {
  return render(
    <RouteProvider>
      <LangProvider initial={initial}>
        <LangToggle />
        <Probe />
      </LangProvider>
    </RouteProvider>,
  )
}

/** 整条控件是一个 switch；aria-checked 的 true 表示停在「英文」那一档 */
const switchEl = () => screen.getByRole('switch')

describe('语言开关', () => {
  it('未指定起始语言时默认中文', () => {
    const { container } = renderToggle()
    expect(screen.getByTestId('probe')).toHaveTextContent('zh|关于我')
    expect(switchEl()).toHaveAttribute('aria-checked', 'false')
    /* 圆点停在左档 */
    expect(container.querySelector('[data-lang]')).toHaveAttribute('data-lang', 'zh')
  })

  it('可访问名说清了当前是哪国语言，而不是只有一句「切换语言」', () => {
    renderToggle('zh')
    expect(screen.getByRole('switch', { name: '切换语言，当前中文' })).toBeInTheDocument()
  })

  it('中文状态下心形下方显示「中」字样（柔和红），心形本体仍对读屏隐藏', () => {
    renderToggle('zh')
    expect(screen.getByText('中')).toBeInTheDocument()
    expect(screen.queryByText('英')).toBeNull()
    // 心形本体作为装饰存在，并被标记为对读屏隐藏
    const heart = screen.getByTestId('lang-heart')
    expect(heart).toBeInTheDocument()
    expect(heart).toHaveAttribute('aria-hidden', 'true')
  })

  it('英文状态下心形下方显示「EN」字样（深蓝）', () => {
    renderToggle('en')
    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.queryByText('中')).toBeNull()
  })

  it('心形标签关联开关，点哪都切换；data-lang 挂在开关本体', () => {
    renderToggle('zh')
    const el = switchEl()
    const heart = screen.getByTestId('lang-heart')
    // htmlFor 把心形和隐藏的复选框绑在一起，点心形即点开关，没有死角
    expect(heart).toHaveAttribute('for', 'lang-switch')
    // data-lang 挂在开关自己身上，CSS 靠它决定心形停哪档
    expect(el).toHaveAttribute('data-lang', 'zh')
  })

  it('点心形也能切到英文，心形变蓝，并给读屏播报结果', async () => {
    const user = userEvent.setup()
    const { container } = renderToggle('zh')

    await user.click(screen.getByTestId('lang-heart'))

    expect(screen.getByTestId('probe')).toHaveTextContent('en|About')
    expect(switchEl()).toHaveAttribute('aria-checked', 'true')
    expect(container.querySelector('[data-lang]')).toHaveAttribute('data-lang', 'en')
    expect(screen.getByRole('status')).toHaveTextContent('Switched to English')
  })

  it('再点一下切回中文', async () => {
    const user = userEvent.setup()
    const { container } = renderToggle('zh')

    await user.click(switchEl())
    await user.click(switchEl())

    expect(screen.getByTestId('probe')).toHaveTextContent('zh|关于我')
    expect(switchEl()).toHaveAttribute('aria-checked', 'false')
    expect(container.querySelector('[data-lang]')).toHaveAttribute('data-lang', 'zh')
  })

  it('起始语言为英文时，圆点和 aria 状态一开始就在右档', () => {
    const { container } = renderToggle('en')
    expect(switchEl()).toHaveAttribute('aria-checked', 'true')
    expect(container.querySelector('[data-lang]')).toHaveAttribute('data-lang', 'en')
    expect(screen.getByRole('switch', { name: 'Switch language, currently English' })).toBeInTheDocument()
  })

  it('导航里不再出现多余的「Language」字样', () => {
    renderToggle('zh')
    expect(screen.queryByText(/language/i)).toBeNull()
  })

  it('键盘只需一次 Tab 就能到达', async () => {
    const user = userEvent.setup()
    renderToggle('zh')

    await user.tab()

    expect(switchEl()).toHaveFocus()
  })

  it('用空格键也能切换（switch 的标准键位）', async () => {
    const user = userEvent.setup()
    renderToggle('zh')

    await user.tab()
    await user.keyboard(' ')

    expect(screen.getByTestId('probe')).toHaveTextContent('en|About')
  })
})
