import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ProjectCarousel from '../components/Projects/ProjectCarousel'
import Projects, { ProjectsEmpty } from '../components/Projects/Projects'
import { projects } from '../content/projects.generated'
import { renderWithLang } from './testUtils'

const first = projects[0]
const last = projects[projects.length - 1]
/** 页码随课件页数自动变化；换一套 PPT 时测试不用跟着改数字 */
const total = String(projects.length).padStart(2, '0')

function renderPage() {
  return renderWithLang(<Projects />)
}

function renderCarousel() {
  return renderWithLang(<ProjectCarousel projects={projects} />)
}

const prevButton = () => screen.getByTestId('carousel-prev')
const nextButton = () => screen.getByTestId('carousel-next')
const counter = () => screen.getByTestId('carousel-counter')
const slideImage = () => screen.getByTestId('carousel-slide').querySelector('img')

describe('作品集整页', () => {
  it('页面只有一个一级标题，就是作品集标题', () => {
    renderPage()
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('所见，所思，所行。')
  })

  it('两个模块都是轮播：同一时刻各只显示一页，整页共 2 张图（PPT 1 页 + 证书 1 页）', () => {
    renderPage()
    // 两个轮播，每个同一时刻只显示一张幻灯片
    const slides = screen.getAllByTestId('carousel-slide')
    expect(slides).toHaveLength(2)
    for (const slide of slides) {
      expect(slide.querySelectorAll('img')).toHaveLength(1)
    }
    // 整页：PPT 轮播 1 张 + 证书轮播 1 张 = 2
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })
})

describe('作品集 — 点证书打开灯箱放大', () => {
  it('初始不渲染灯箱', () => {
    renderPage()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('点证书打开灯箱，展示的是全尺寸图', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('img', { name: /初级/ }))

    const dialog = screen.getByRole('dialog')
    const image = within(dialog).getByRole('img')
    expect(image.getAttribute('src')).toBe('/certificates/ait-junior.webp')
  })

  it('Esc 关闭灯箱', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('img', { name: /初级/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('作品集轮播 — 一次只显示一页', () => {
  it('初始停在第一页，展示的是全尺寸图而不是缩略图', () => {
    renderCarousel()

    const image = slideImage()
    expect(image?.getAttribute('src')).toBe(first.src)
    expect(image?.getAttribute('src')).not.toBe(first.thumb)
  })

  it('图片的可访问名是这一页的 alt', () => {
    renderCarousel()
    expect(screen.getByRole('img', { name: first.alt })).toBeInTheDocument()
  })

  it(`页码显示 01 / ${total}（补零，两位对两位）`, () => {
    renderCarousel()
    expect(counter()).toHaveTextContent(`01/${total}`)
  })

  it('图片下方显示这一页的中文图注', () => {
    renderCarousel()
    expect(screen.getByText(first.caption)).toBeInTheDocument()
  })

  it('用 aspect-ratio 在图片加载前占好位（否则换页会跳一下）', () => {
    renderCarousel()
    expect(Number.parseFloat((slideImage() as HTMLElement).style.aspectRatio)).toBeCloseTo(
      first.aspect,
    )
  })
})

describe('作品集轮播 — 左右箭头翻页', () => {
  it('点右箭头到下一页，图和页码一起变', async () => {
    const user = userEvent.setup()
    renderCarousel()

    await user.click(nextButton())

    expect(slideImage()?.getAttribute('src')).toBe(projects[1].src)
    expect(counter()).toHaveTextContent(`02/${total}`)
    expect(screen.getByText(projects[1].caption)).toBeInTheDocument()
  })

  it('点左箭头回到上一页', async () => {
    const user = userEvent.setup()
    renderCarousel()

    await user.click(nextButton())
    await user.click(prevButton())

    expect(slideImage()?.getAttribute('src')).toBe(first.src)
    expect(counter()).toHaveTextContent(`01/${total}`)
  })

  it('第一页时左箭头不可用，最后一页时右箭头不可用', async () => {
    const user = userEvent.setup()
    renderCarousel()

    expect(prevButton()).toBeDisabled()
    expect(nextButton()).toBeEnabled()

    // 直接跳到最后一页最省事：连点到底
    for (let i = 1; i < projects.length; i += 1) {
      await user.click(nextButton())
    }

    expect(slideImage()?.getAttribute('src')).toBe(last.src)
    expect(counter()).toHaveTextContent(`${total}/${total}`)
    expect(nextButton()).toBeDisabled()
    expect(prevButton()).toBeEnabled()
  })

  it('方向键也能翻页', async () => {
    const user = userEvent.setup()
    renderCarousel()

    await user.keyboard('{ArrowRight}')
    expect(counter()).toHaveTextContent(`02/${total}`)

    await user.keyboard('{ArrowLeft}')
    expect(counter()).toHaveTextContent(`01/${total}`)
  })

  it('在第一页按左方向键不会越界', async () => {
    const user = userEvent.setup()
    renderCarousel()

    await user.keyboard('{ArrowLeft}')

    expect(counter()).toHaveTextContent(`01/${total}`)
    expect(prevButton()).toBeDisabled()
  })
})

describe('作品集 — 下载完整 PDF', () => {
  it('是一个指向 /portfolio.pdf 的真实下载链接', () => {
    renderPage()

    const link = screen.getByTestId('portfolio-download')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/portfolio.pdf')
    expect(link).toHaveTextContent('下载完整 PDF')
    // download 属性才会触发「另存为」而不是在浏览器里打开
    expect(link).toHaveAttribute('download')
  })

  it('按钮上标了 PDF 与页数', () => {
    renderPage()
    expect(screen.getByTestId('portfolio-download')).toHaveTextContent(
      `PDF · ${projects.length} 页`,
    )
  })
})

describe('作品集空态', () => {
  it('没有作品时给出可读的提示而不是白屏', () => {
    renderWithLang(<ProjectsEmpty />)
    expect(screen.getByText('这里还没有作品')).toBeInTheDocument()
  })

  it('提示里直接写了那条要跑的命令', () => {
    renderWithLang(<ProjectsEmpty />)
    expect(screen.getByText(/projects:build/)).toBeInTheDocument()
  })
})
