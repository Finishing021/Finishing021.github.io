import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DiaryCard from '../components/Archive/DiaryCard'
import { diary } from '../content/site'
import { renderWithLang } from './testUtils'

const single = diary.find((entry) => entry.images.length === 1)!
const multi = diary.find((entry) => entry.images.length > 1)!

function renderCard(entry = single, onOpen = vi.fn()) {
  return {
    ...renderWithLang(
      <ul>
        <DiaryCard entry={entry} index={0} onOpen={onOpen} />
      </ul>,
    ),
    onOpen,
  }
}

describe('网格里的主题卡', () => {
  it('展示主题名与缩略图', () => {
    const { container } = renderCard()

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(single.title)
    expect(container.querySelector('img')).toHaveAttribute('src', single.images[0])
  })

  it('点击整张卡把主题 id 回传给父级', async () => {
    const user = userEvent.setup()
    const { onOpen } = renderCard()

    await user.click(screen.getByTestId(`diary-open-${single.id}`))

    expect(onOpen).toHaveBeenCalledWith(single.id)
  })

  it('多张手稿时显示合集角标（当前/总数），单张不显示', () => {
    const { unmount } = renderCard(multi)
    expect(screen.getByText(`1 / ${multi.images.length}`)).toBeInTheDocument()
    unmount()

    renderCard(single)
    expect(screen.queryByText(/^1 \/ \d+$/)).toBeNull()
  })

  /*
   * 回归：卡片曾经是「整张卡翻转 + 背面放操作按钮」的结构。
   * 改成网格 + 灯箱之后，卡片不该再带 aria-expanded 这类翻转语义。
   */
  it('不再是可翻转的卡片，没有 aria-expanded', () => {
    renderCard()
    const button = screen.getByTestId(`diary-open-${single.id}`)
    expect(button).not.toHaveAttribute('aria-expanded')
    expect(button).not.toHaveAttribute('aria-controls')
  })
})

describe('网格卡片 · 缺图时的降级', () => {
  it('缩略图加载失败时换成占位面板，不留破图', () => {
    const { container } = renderCard()

    fireEvent.error(container.querySelector('img') as HTMLImageElement)

    expect(screen.getByText('原稿待补')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    // 卡片仍然可点，进去还能看到同主题的其它照片
    expect(screen.getByTestId(`diary-open-${single.id}`)).toBeInTheDocument()
  })
})
