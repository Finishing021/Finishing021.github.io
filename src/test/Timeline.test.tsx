import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ArchivePreview from '../components/Archive/ArchivePreview'
import Timeline from '../components/Archive/Timeline'
import { diary } from '../content/site'
import { renderWithLang } from './testUtils'

const entries = diary
/** 取图片最多的主题来测翻页；用 find 取「第一个多图主题」会随数组顺序变化而失准 */
const multi = diary.reduce((most, entry) =>
  entry.images.length > most.images.length ? entry : most,
)
const single = diary.find((entry) => entry.images.length === 1)!

function openButton(id: string) {
  return screen.getByTestId(`diary-open-${id}`)
}

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

/*
 * 回归测试：ArchivePreview 里曾经有个 diary.slice(0, 3)（当初当「首页预告」用），
 * 结果第 4、5 个主题在页面上根本不存在。这个区块就是站点核心内容本身，不该截断。
 */
describe('成长档案区块', () => {
  it('渲染全部主题，不做「首页只放最近几条」的截断', () => {
    expect(diary.length).toBeGreaterThan(3)

    renderWithLang(<ArchivePreview />)

    for (const entry of diary) {
      expect(screen.getByRole('heading', { name: entry.title })).toBeInTheDocument()
      expect(openButton(entry.id)).toBeInTheDocument()
    }
  })
})

describe('档案时间轴分组', () => {
  it('按年份分组渲染，年份降序且每组都有可访问名称', () => {
    const expectedYears = [...new Set(entries.map((item) => item.year))].sort(
      (a, b) => b - a,
    )
    expect(expectedYears.length).toBeGreaterThan(1)

    renderWithLang(<Timeline entries={entries} />)

    const labels = screen
      .getAllByRole('region')
      .map((region) => region.getAttribute('aria-label'))
    expect(labels).toEqual(expectedYears.map((year) => `${year} 年`))
  })

  it('卡片放在 ol 里，保持列表语义', () => {
    renderWithLang(<Timeline entries={entries} />)
    const lists = screen.getAllByRole('list')
    const total = lists.reduce(
      (sum, list) => sum + within(list).getAllByRole('listitem').length,
      0,
    )
    expect(total).toBe(entries.length)
  })
})

/*
 * 卡片高度由照片比例决定且必须固定，缩略图上限 250px，手写字在这个尺寸下读不清 ——
 * 所以点击后必须能看原图。这一组守住灯箱的开关与翻页。
 */
describe('原图灯箱', () => {
  /*
   * 和摄影灯箱同一类 bug：档案灯箱也渲染在 div.main 里，而 main 上残留的入场
   * transform 会抢走 position: fixed 的包含块 —— 遮罩铺满整页、图落到屏幕外、
   * focus() 把页面滚回顶部。修法是 portal 到 document.body。这条用例钉住它。
   */
  it('灯箱是 document.body 的直接子元素，不会待在页面内容里', async () => {
    const user = userEvent.setup()
    const { container } = renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(entries[0].id))

    const dialog = screen.getByRole('dialog')
    expect(container.contains(dialog)).toBe(false)
    expect(dialog.parentElement).toBe(document.body)
  })

  it('初始 1 倍，+ 按钮放大、− 按钮缩回原位', async () => {
    const user = userEvent.setup()
    renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(multi.id))

    expect(currentScale()).toBe(1)

    await user.click(screen.getByRole('button', { name: '放大原图' }))
    await waitFor(() => expect(currentScale()).toBeCloseTo(1.15, 2))

    await user.click(screen.getByRole('button', { name: '缩小原图' }))
    await waitFor(() => expect(currentScale()).toBeCloseTo(1, 2))
  })

  it('滚轮向上放大，双击复位', async () => {
    const user = userEvent.setup()
    renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(multi.id))

    fireEvent.wheel(window, { deltaY: -120 })
    await waitFor(() => expect(currentScale()).toBeCloseTo(1.15, 2))

    fireEvent.doubleClick(zoomLayer())
    await waitFor(() => expect(currentScale()).toBeCloseTo(1, 2))
  })

  /*
   * 缩放上限 3 倍是有意设的：再往上就是纯噪点了。
   * 放大后支持拖拽平移（手写实现，平移边界夹在视口内，不会拖出画面）。
   */
  it('最多放大到 3 倍就停住', async () => {
    const user = userEvent.setup()
    renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(multi.id))
    const zoomIn = screen.getByRole('button', { name: '放大原图' })

    for (let i = 0; i < 20; i += 1) {
      await user.click(zoomIn)
    }

    await waitFor(() => expect(currentScale()).toBeCloseTo(3, 2))
    expect(zoomIn).toBeDisabled()
  })

  it('点击缩略图打开灯箱，并展示原图', async () => {
    const user = userEvent.setup()
    renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(entries[0].id))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(
      within(dialog).getByAltText(`《${entries[0].title}》第 1 张手稿原图`),
    ).toBeInTheDocument()
  })

  it('打开后焦点落在关闭按钮上', async () => {
    const user = userEvent.setup()
    renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(entries[0].id))

    expect(screen.getByRole('button', { name: '关闭原图' })).toHaveFocus()
  })

  it('按 Esc 关闭灯箱', async () => {
    const user = userEvent.setup()
    renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(entries[0].id))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('关闭按钮可以关掉灯箱', async () => {
    const user = userEvent.setup()
    renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(entries[0].id))
    await user.click(screen.getByRole('button', { name: '关闭原图' }))

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('点击遮罩空白处也能关闭', async () => {
    const user = userEvent.setup()
    renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(entries[0].id))

    /*
     * 遮罩是对话框里那个 aria-hidden 的绝对定位层。
     * 注意要从 document 找，不能用 render 返回的 container ——
     * 灯箱已经 portal 到 document.body，不在 container 那棵子树里了。
     */
    const backdrop = screen.getByRole('dialog').querySelector('[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    await user.click(backdrop as Element)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('多张手稿时可以在灯箱里翻页，方向键也可以', async () => {
    const user = userEvent.setup()
    // 这条要翻到第 3 张，先确认这个主题真的有 3 张以上，否则失败原因会很难看懂
    expect(multi.images.length).toBeGreaterThanOrEqual(3)

    renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(multi.id))
    expect(
      screen.getByAltText(`《${multi.title}》第 1 张手稿原图`),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '下一张原图' }))
    expect(
      screen.getByAltText(`《${multi.title}》第 2 张手稿原图`),
    ).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    expect(
      screen.getByAltText(`《${multi.title}》第 3 张手稿原图`),
    ).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')
    expect(
      screen.getByAltText(`《${multi.title}》第 2 张手稿原图`),
    ).toBeInTheDocument()
  })

  it('第一张时「上一张原图」不可用', async () => {
    const user = userEvent.setup()
    renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(multi.id))

    expect(screen.getByRole('button', { name: '上一张原图' })).toBeDisabled()
  })

  it('单张手稿的主题不出现翻页按钮', async () => {
    const user = userEvent.setup()
    renderWithLang(<Timeline entries={[single]} />)

    await user.click(openButton(single.id))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '下一张原图' })).toBeNull()
  })

  it('重新打开另一个主题时回到第一张', async () => {
    const user = userEvent.setup()
    renderWithLang(<Timeline entries={entries} />)

    await user.click(openButton(multi.id))
    await user.click(screen.getByRole('button', { name: '下一张原图' }))
    await user.click(screen.getByRole('button', { name: '关闭原图' }))

    await user.click(openButton(single.id))

    expect(
      screen.getByAltText(`《${single.title}》第 1 张手稿原图`),
    ).toBeInTheDocument()
  })
})
