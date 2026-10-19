import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MouseParticles from '../components/MouseParticles/MouseParticles'

/**
 * 控制 matchMedia 的返回值：prefers-reduced-motion 与 pointer:coarse 各自独立。
 * jsdom 里 canvas 的 getContext('2d') 返回 null，组件会安全跳过动画但不报错，
 * 画布元素仍按预期渲染（或不渲染）。
 */
function mockMatchMedia(opts: { reduced?: boolean; coarse?: boolean }) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    let matches = false
    if (query.includes('prefers-reduced-motion')) matches = !!opts.reduced
    if (query.includes('pointer: coarse')) matches = !!opts.coarse
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  }) as unknown as typeof window.matchMedia
}

describe('MouseParticles 鼠标粒子动效', () => {
  it('默认（非减少动效、非触屏）下把画布 portal 到 body 并带 aria-hidden', () => {
    mockMatchMedia({ reduced: false, coarse: false })
    render(<MouseParticles />)
    const canvas = document.querySelector('body > canvas[aria-hidden="true"]')
    expect(canvas).not.toBeNull()
  })

  it('减少动态效果时不渲染画布（零干扰，把控制权交给系统）', () => {
    mockMatchMedia({ reduced: true, coarse: false })
    render(<MouseParticles />)
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('触屏设备（coarse pointer）下不渲染画布', () => {
    mockMatchMedia({ reduced: false, coarse: true })
    render(<MouseParticles />)
    expect(document.querySelector('canvas')).toBeNull()
  })
})
