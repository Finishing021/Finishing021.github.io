import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MomentsEmpty } from '../components/Moments/Moments'
import MomentsWall from '../components/Moments/MomentsWall'
import type { Photo } from '../content/photos.generated'
import { renderWithLang } from './testUtils'

/**
 * 用固定夹具而不是真实清单 —— 真实清单此刻是空的（站主还没放照片），
 * 拿它测等于什么都没测，而且清单内容一变测试就跟着飘。
 */
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

function renderWall(photos: Photo[] = FIXTURES) {
  return renderWithLang(<MomentsWall photos={photos} />)
}

describe('摄影墙网格', () => {
  it('渲染的张数与清单一致', () => {
    renderWall()
    // 照片数 = 图片数；胶囊筛选按钮是另外的 role=tab，不在这里数
    expect(screen.getAllByRole('img')).toHaveLength(FIXTURES.length)
  })

  it('每张照片的可访问名就是它的 alt', () => {
    renderWall()
    for (const photo of FIXTURES) {
      expect(screen.getByRole('button', { name: photo.alt })).toBeInTheDocument()
    }
  })

  it('网格里用的是缩略图，不是全尺寸大图', () => {
    renderWall()
    for (const photo of FIXTURES) {
      const button = screen.getByRole('button', { name: photo.alt })
      const image = button.querySelector('img')
      // 这条是性能契约：网格直接加载全尺寸图会让首屏拉几十 MB
      expect(image?.getAttribute('src')).toBe(photo.thumb)
      expect(image?.getAttribute('src')).not.toBe(photo.src)
    }
  })

  it('缩略图带 lazy 与异步解码', () => {
    renderWall()
    const image = within(screen.getByRole('button', { name: FIXTURES[0].alt })).getByRole('img')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('decoding', 'async')
  })

  it('用 aspect-ratio 在图片加载前占好位（否则每加载一张整堵墙往下跳一次）', () => {
    renderWall()
    const image = within(screen.getByRole('button', { name: FIXTURES[0].alt })).getByRole('img')
    /* React 会把数字序列化成 "1.5 / 1"，所以比数值而不是比字符串 */
    expect(Number.parseFloat(image.style.aspectRatio)).toBeCloseTo(FIXTURES[0].aspect)
  })

  it('清单为空时不渲染任何照片，但保留分类筛选按钮', () => {
    renderWall([])
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(screen.getByTestId('filter-all')).toBeInTheDocument()
  })
})

describe('分类筛选', () => {
  it('顶部有 4 个分类胶囊按钮（全部 / 风景 / 人像 / 日常）', () => {
    renderWall()
    expect(screen.getByTestId('filter-all')).toBeInTheDocument()
    expect(screen.getByTestId('filter-scenery')).toBeInTheDocument()
    expect(screen.getByTestId('filter-portraits')).toBeInTheDocument()
    expect(screen.getByTestId('filter-daily')).toBeInTheDocument()
  })

  it('点「风景」只显示风景类照片（FIXTURES 里只有 lake-morning 含 lake）', async () => {
    const user = userEvent.setup()
    renderWall()

    // 默认全部：3 张都在
    expect(screen.getAllByRole('img')).toHaveLength(FIXTURES.length)

    await user.click(screen.getByTestId('filter-scenery'))

    await waitFor(() => {
      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(1)
      expect(images[0].getAttribute('alt')).toBe('lake morning')
    })
  })

  it('点「全部」恢复显示所有照片', async () => {
    const user = userEvent.setup()
    renderWall()

    await user.click(screen.getByTestId('filter-scenery'))
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(1))

    await user.click(screen.getByTestId('filter-all'))
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(FIXTURES.length))
  })
})

describe('光影空态', () => {
  it('没有照片时给出可读的提示而不是白屏', () => {
    renderWithLang(<MomentsEmpty />)
    expect(screen.getByText('这里还没有照片')).toBeInTheDocument()
  })

  it('提示里直接写了那条要跑的命令', () => {
    renderWithLang(<MomentsEmpty />)
    expect(screen.getByText(/photos:build/)).toBeInTheDocument()
  })
})
