import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import MomentsWall from '../components/Moments/MomentsWall'
import type { Photo } from '../content/photos.generated'
import { renderWithLang } from './testUtils'

const FIXTURES: Photo[] = [
  {
    src: '/photos/yangzhou-rain.jpg',
    thumb: '/photos/yangzhou-rain_thumb.jpg',
    aspect: 1.5,
    date: '2026-06-25',
    alt: 'yangzhou rain',
    caption: '',
    file: 'yangzhou-rain.jpg',
    dateSource: 'exif',
  },
  {
    src: '/photos/dorm-window-cloud.jpg',
    thumb: '/photos/dorm-window-cloud_thumb.jpg',
    aspect: 0.75,
    date: '2026-05-01',
    alt: 'dorm window cloud',
    caption: '',
    file: 'dorm-window-cloud.jpg',
    dateSource: 'exif',
  },
  {
    src: '/photos/lake-morning.jpg',
    thumb: '/photos/lake-morning_thumb.jpg',
    aspect: 1,
    date: '2026-04-02',
    alt: 'lake morning',
    caption: '',
    file: 'lake-morning.jpg',
    dateSource: 'exif',
  },
]

function renderWall() {
  return renderWithLang(<MomentsWall photos={FIXTURES} />)
}

const thumb = (alt: string) => screen.getByRole('button', { name: alt })

/*
 * 缩放施加在包着图片的「视口」层上（data-testid="lightbox-zoom"），
 * 而不是 <img> 自己 —— 读倍率要去那一层读。
 */
function zoomLayer() {
  return screen.getByTestId('lightbox-zoom')
}

function currentScale() {
  const match = /scale\(([\d.]+)\)/.exec(zoomLayer().style.transform)
  return match ? Number(match[1]) : NaN
}

const waitScale = (expected: number) =>
  waitFor(() => expect(currentScale()).toBeCloseTo(expected, 2))

describe('摄影灯箱 — 开关', () => {
  it('初始不渲染灯箱', () => {
    renderWall()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('点击缩略图打开灯箱，展示的是全尺寸图而不是缩略图', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))

    const dialog = screen.getByRole('dialog')
    const image = within(dialog).getByRole('img')
    expect(image.getAttribute('src')).toBe(FIXTURES[0].src)
    expect(image.getAttribute('src')).not.toBe(FIXTURES[0].thumb)
  })

  it('Esc 关闭', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('点遮罩关闭', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))

    // 遮罩是对话框里那个 aria-hidden 的绝对定位层
    const backdrop = screen.getByRole('dialog').querySelector('[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    await user.click(backdrop as Element)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('点关闭按钮关闭', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))
    await user.click(screen.getByRole('button', { name: '关闭大图' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('摄影灯箱 — 翻页', () => {
  it('方向键左右翻页', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[1].alt))

    await user.keyboard('{ArrowLeft}')
    expect(within(screen.getByRole('dialog')).getByRole('img').getAttribute('src')).toBe(
      FIXTURES[0].src,
    )

    await user.keyboard('{ArrowRight}')
    expect(within(screen.getByRole('dialog')).getByRole('img').getAttribute('src')).toBe(
      FIXTURES[1].src,
    )
  })

  it('到头时对应方向的按钮禁用', async () => {
    const user = userEvent.setup()
    renderWall()

    // 第一张：不能往前
    await user.click(thumb(FIXTURES[0].alt))
    expect(screen.getByRole('button', { name: '上一张照片' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '下一张照片' })).toBeEnabled()

    await user.keyboard('{Escape}')

    // 最后一张：不能往后
    await user.click(thumb(FIXTURES[FIXTURES.length - 1].alt))
    expect(screen.getByRole('button', { name: '下一张照片' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '上一张照片' })).toBeEnabled()
  })

  it('在头尾按下对应方向键不会越界', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))
    await user.keyboard('{ArrowLeft}')

    expect(within(screen.getByRole('dialog')).getByRole('img').getAttribute('src')).toBe(
      FIXTURES[0].src,
    )
  })
})

/*
 * 这一组是「点开照片后页面跳回顶部、只剩一片灰遮罩」那个 bug 的回归防线。
 *
 * 根因不在灯箱自己的 CSS，而在**祖先带了 transform**：带 transform 的元素会成为
 * position: fixed 后代的包含块，于是遮罩铺成了整页高度、图被居中到屏幕外、
 * 关闭按钮的 focus() 把页面滚回顶部。当时全靠 portal 把灯箱挪出那棵子树解决。
 *
 * 下面的用例就是在钉住这个前提：一旦有人把 portal 去掉，灯箱就会重新落回
 * 页面内容里，随时可能再被某个祖先的 transform 捕获 —— 那时这些用例会立刻失败。
 */
describe('摄影灯箱 — 脱离带 transform 的祖先（不能渲染在页面内容里）', () => {
  it('灯箱是 document.body 的直接子元素，而不是待在页面容器里面', async () => {
    const user = userEvent.setup()
    const { container } = renderWall()

    await user.click(thumb(FIXTURES[0].alt))

    const dialog = screen.getByRole('dialog')
    // 待在容器里 = 待在 div.main 里 = 会被 main 的 transform 捕获
    expect(container.contains(dialog)).toBe(false)
    expect(dialog.parentElement).toBe(document.body)
  })

  it('打开时锁住背景滚动，关闭后还原', async () => {
    const user = userEvent.setup()
    renderWall()
    const overflowBefore = document.body.style.overflow

    await user.click(thumb(FIXTURES[0].alt))
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe(overflowBefore)
  })

  /*
   * html 上有 scrollbar-gutter: stable，右侧那约 8px 槽位不属于页面可绘制区域，
   * 全屏遮罩也盖不上去 —— 只能靠根元素背景补色，否则会露一条浅缝。
   * 封面早就有同样的处理（data-cover-open），灯箱要有对称的一条。
   */
  it('打开时给 html 打 data-lightbox-open（补滚动条槽位的底色），关闭时摘掉', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))
    expect(document.documentElement).toHaveAttribute('data-lightbox-open')

    await user.keyboard('{Escape}')
    expect(document.documentElement).not.toHaveAttribute('data-lightbox-open')
  })
})

describe('摄影灯箱 — 缩放 / 双击复位', () => {
  /*
   * 缩放是手写的：滚轮缩放、− / + 按钮、双击复位、放大后可拖拽平移。
   * 这组用例钉住的是「行为」而不是实现细节：初始 1 倍、滚轮/按钮能放大、
   * 上限 3 倍、双击与 1:1 能复位、放大后拖拽能平移且不拖出画面。
   */
  it('初始为 1 倍', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))

    expect(currentScale()).toBe(1)
  })

  it('滚轮向上放大，双击复位', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))

    // 向上滚（deltaY<0）→ 放大一档（1.15 倍）
    fireEvent.wheel(window, { deltaY: -120 })
    await waitScale(1.15)

    // 双击复位到 1 倍并居中
    fireEvent.doubleClick(zoomLayer())
    await waitScale(1)
  })

  it('放大后点图片本身不会关掉灯箱', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))
    await user.click(screen.getByRole('button', { name: '放大图片' }))
    await waitScale(1.15)

    await user.click(within(screen.getByRole('dialog')).getByRole('img'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('+ 按钮放大、− 按钮缩回原位', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))

    await user.click(screen.getByRole('button', { name: '放大图片' }))
    await waitScale(1.15)

    await user.click(screen.getByRole('button', { name: '缩小图片' }))
    await waitScale(1)
  })

  it('最大只能到 3 倍，到顶后 + 禁用', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))
    const zoomIn = screen.getByRole('button', { name: '放大图片' })

    // 一档 0.15，从 1 到 3 需要 14 档；多点几次验证它停在上限而不是一路涨上去
    for (let i = 0; i < 20; i += 1) {
      await user.click(zoomIn)
    }

    await waitFor(() => expect(currentScale()).toBeCloseTo(3, 2))
    expect(zoomIn).toBeDisabled()
    expect(screen.getByRole('button', { name: '缩小图片' })).toBeEnabled()
  })

  it('1 倍时 − 禁用（不能再缩小）', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))

    expect(screen.getByRole('button', { name: '缩小图片' })).toBeDisabled()
  })
})

describe('摄影灯箱 — 放大后拖拽平移', () => {
  /*
   * 平移是手写实现的回归防线：放大后拖动会把图片平移、且位移被夹在视口内
   * （不会拖出画面露出空白、也不会产生 NaN）。jsdom 量不到真实尺寸，这里手动
   * 给舞台与视口打桩，制造「放大后视口比舞台大」的局面，平移才有边界可测。
   */
  it('放大后可拖拽平移，且平移被夹在视口内（双击复位归零）', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))
    // 先放大，平移才有意义
    fireEvent.wheel(window, { deltaY: -120 })
    await waitScale(1.15)

    const layer = zoomLayer()
    const stage = layer.parentElement as HTMLElement
    layer.getBoundingClientRect = () =>
      ({ width: 2000, height: 1600, top: 0, left: 0, right: 2000, bottom: 1600, x: 0, y: 0, toJSON: () => {} }) as DOMRect
    stage.getBoundingClientRect = () =>
      ({ width: 1000, height: 800, top: 0, left: 0, right: 1000, bottom: 800, x: 0, y: 0, toJSON: () => {} }) as DOMRect

    // 按住向左拖 100px（pointerId 让 setPointerCapture 路径也能走通）
    fireEvent.pointerDown(stage, { clientX: 500, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(stage, { clientX: 400, clientY: 400, pointerId: 1 })
    fireEvent.pointerUp(stage, { pointerId: 1 })

    expect(layer.style.transform).toContain('translate(-100px')
    // 平移不应改变倍率
    expect(currentScale()).toBeCloseTo(1.15, 2)

    // 双击复位：1 倍、位移归零
    fireEvent.doubleClick(layer)
    await waitScale(1)
    expect(layer.style.transform).toContain('translate(0px')
  })

  it('1 倍时拖动不会触发平移、也不会误关灯箱', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))
    expect(currentScale()).toBe(1)

    const layer = zoomLayer()
    const stage = layer.parentElement as HTMLElement
    stage.getBoundingClientRect = () =>
      ({ width: 1000, height: 800, top: 0, left: 0, right: 1000, bottom: 800, x: 0, y: 0, toJSON: () => {} }) as DOMRect
    layer.getBoundingClientRect = () =>
      ({ width: 1000, height: 800, top: 0, left: 0, right: 1000, bottom: 800, x: 0, y: 0, toJSON: () => {} }) as DOMRect

    fireEvent.pointerDown(stage, { clientX: 500, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(stage, { clientX: 200, clientY: 400, pointerId: 1 })
    fireEvent.pointerUp(stage, { pointerId: 1 })

    // 1 倍没有平移：位移始终被夹成 0
    expect(layer.style.transform).toContain('translate(0px')
    // 而且灯箱没被拖拽误关
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('摄影灯箱 — 可访问性', () => {
  it('打开后焦点落在关闭按钮上', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))

    expect(document.activeElement).toBe(screen.getByRole('button', { name: '关闭大图' }))
  })

  it('关闭后焦点回到触发它的那张缩略图', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[1].alt))
    await user.keyboard('{Escape}')

    // 不还回去的话，键盘用户会被扔回页面顶部，得重新 Tab 一遍
    expect(document.activeElement).toBe(thumb(FIXTURES[1].alt))
  })

  it('对话框的可访问名是当前照片的 alt', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[2].alt))

    expect(screen.getByRole('dialog', { name: FIXTURES[2].alt })).toBeInTheDocument()
  })

  it('纯图墙：灯箱里没有任何说明文字（日期、计数器都不该有）', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(thumb(FIXTURES[0].alt))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getAllByRole('img')).toHaveLength(1)
    expect(within(dialog).queryByText(/\d{4}-\d{2}-\d{2}/)).toBeNull()
    expect(within(dialog).queryByText(/\d\s*\/\s*\d/)).toBeNull()
  })
})
