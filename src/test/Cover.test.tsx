import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import Cover from '../components/Cover/Cover'
import { cover, coverBackdrop } from '../content/site'
import { renderWithLang } from './testUtils'

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

function renderCover(onEnter = vi.fn()) {
  return { ...renderWithLang(<Cover onEnter={onEnter} />), onEnter }
}

beforeAll(() => {
  mockMatchMedia(false)
})

describe('封面页排版', () => {
  it('四层内容按「上小字 / 大标题 / 下小字 / 进入按钮」顺序渲染', () => {
    renderCover()

    const eyebrow = screen.getByText(cover.eyebrow)
    const title = screen.getByRole('heading', { level: 1 })
    const footnote = screen.getByText(cover.footnote)
    const cta = screen.getByRole('button', { name: cover.cta })

    expect(title).toHaveTextContent('Finishing')

    const follows = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

    expect(follows(eyebrow, title)).toBe(true)
    expect(follows(title, footnote)).toBe(true)
    expect(follows(footnote, cta)).toBe(true)
  })

  it('页面只有这一个一级标题', () => {
    renderCover()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})

describe('封面页进入交互', () => {
  it('点击进入按钮时通知父级', async () => {
    const user = userEvent.setup()
    const { onEnter } = renderCover()

    await user.click(screen.getByRole('button', { name: cover.cta }))

    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it('按钮可被键盘触发', async () => {
    const user = userEvent.setup()
    const { onEnter } = renderCover()

    await user.tab()
    expect(screen.getByRole('button', { name: cover.cta })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onEnter).toHaveBeenCalledTimes(1)
  })
})

describe('封面页背景', () => {
  it('使用头像图片，且作为纯装饰不进无障碍树', () => {
    const { container } = renderCover()

    const image = container.querySelector('img')
    expect(image).toHaveAttribute('src', coverBackdrop.src)
    expect(image).toHaveAttribute('alt', '')
    expect(image?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('模糊半径由内容配置下发成 CSS 变量，便于直接调 4px~8px', () => {
    const { container } = renderCover()

    const section = container.querySelector('section')
    expect(section?.getAttribute('style')).toContain(`--cover-blur: ${coverBackdrop.blur}px`)
  })

  it('叠加了对读屏隐藏的遮罩层，用于保证文字可读', () => {
    const { container } = renderCover()
    // 背后是头像，可见性无法在 jsdom 里断言，这里确认遮罩层确实存在且不干扰语义
    const decorative = container.querySelectorAll('section > [aria-hidden="true"]')
    expect(decorative.length).toBeGreaterThanOrEqual(4)
  })

  it('不再渲染 canvas 或三维层', () => {
    const { container } = renderCover()
    expect(container.querySelector('canvas')).toBeNull()
  })
})
