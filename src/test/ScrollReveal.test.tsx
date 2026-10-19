import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScrollReveal from '../components/ScrollReveal'

function mockReducedMotion(reduced: boolean) {
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

afterEach(() => {
  document.body.innerHTML = ''
})

/*
 * 最危险的失败模式是：先把元素设成 opacity:0，结果 ScrollTrigger 没触发，
 * 内容就永久不可见了。下面两条分别守住降级路径和初始状态。
 */
describe('滚动进场动画', () => {
  it('减少动态效果时完全不介入，内容保持可见', async () => {
    mockReducedMotion(true)

    render(
      <>
        <p data-reveal>一段内容</p>
        <ScrollReveal />
      </>,
    )
    await new Promise((resolve) => setTimeout(resolve, 120))

    const target = screen.getByText('一段内容')
    expect(target.style.opacity).toBe('')
    expect(target.style.transform).toBe('')
  })

  it('页面上没有 data-reveal 元素时静默退出，不报错', async () => {
    mockReducedMotion(false)

    expect(() => render(<ScrollReveal />)).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 120))
  })
})
