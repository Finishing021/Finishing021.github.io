// 本文件由 scripts/optimize-images.py 自动生成，请勿手动修改。
// 重新生成：npm run projects:build

export interface Project {
  /** 全尺寸图 URL，灯箱用 */
  src: string
  /** 缩略图 URL，网格用 */
  thumb: string
  /** 缩略图宽高比 = 宽 / 高，用于占位、避免布局抖动 */
  aspect: number
  /** 拍摄日期 YYYY-MM-DD */
  date: string
  /** 读屏描述，由文件名推导（或 alt.json 覆盖） */
  alt: string
  /** 中文图注，由 AI 看图生成（captions.json 覆盖）；空串表示未填 */
  caption: string
  /** 源文件名，排查问题时用 */
  file: string
  /** 日期来源；mtime 表示靠兜底，建议人工确认 */
  dateSource: 'exif' | 'filename' | 'mtime'
}

/** 排序见 --manifest-order：照片是新到旧，课件这类有序内容用 asc（第 1 页在前） */
export const projects: Project[] = [
  {
    src: '/projects/slide-01.webp',
    thumb: '/projects/slide-01_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件封面：AI 已来，科技创新如何改变我们、我们如何用好它',
    caption: '封面：AI 已来',
    file: 'slide-01.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-02.webp',
    thumb: '/projects/slide-02_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 2 页：先猜一下这是 AI 做的还是人做的',
    caption: '先猜一下，AI 还是人',
    file: 'slide-02.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-03.webp',
    thumb: '/projects/slide-03_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 3 页：AI 不只是聊天，它开始动手了',
    caption: 'AI 开始动手了',
    file: 'slide-03.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-04.webp',
    thumb: '/projects/slide-04_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 4 页：这些 AI 你现在打开手机就能用',
    caption: '手机上就能用的 AI',
    file: 'slide-04.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-05.webp',
    thumb: '/projects/slide-05_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 5 页：一个人加 AI 就能开始创作',
    caption: '一个人 + AI 就开始创作',
    file: 'slide-05.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-06.webp',
    thumb: '/projects/slide-06_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 6 页：不会乐器、不懂乐理也能写歌',
    caption: '不懂乐理也能写歌',
    file: 'slide-06.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-07.webp',
    thumb: '/projects/slide-07_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 7 页：一个人加 AI 四十八小时做一部短剧',
    caption: '48 小时做一部短剧',
    file: 'slide-07.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-08.webp',
    thumb: '/projects/slide-08_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 8 页：现在就能参加的 AI 创作比赛',
    caption: '现在就能参加的比赛',
    file: 'slide-08.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-09.webp',
    thumb: '/projects/slide-09_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 9 页：AI 对我们到底意味着什么',
    caption: 'AI 对我们意味着什么',
    file: 'slide-09.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-10.webp',
    thumb: '/projects/slide-10_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 10 页：AI 有智能、人有智慧，AI 拿不走的九点',
    caption: 'AI 拿不走的 9 点',
    file: 'slide-10.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-11.webp',
    thumb: '/projects/slide-11_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 11 页：科技向善，关键在人',
    caption: '科技向善，关键在人',
    file: 'slide-11.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-12.webp',
    thumb: '/projects/slide-12_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 12 页：从围观到驾驭，AI 时代大学生的行动指南',
    caption: '从「围观」到「驾驭」',
    file: 'slide-12.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-13.webp',
    thumb: '/projects/slide-13_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 13 页：还记得开场那个问题吗',
    caption: '还记得开场那个问题吗',
    file: 'slide-13.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-14.webp',
    thumb: '/projects/slide-14_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 14 页：AI 历程的发展',
    caption: 'AI 历程的发展',
    file: 'slide-14.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-15.webp',
    thumb: '/projects/slide-15_thumb.webp',
    aspect: 1.7778,
    date: '2026-10-01',
    alt: '思政课课件第 15 页：谢谢大家',
    caption: '谢谢大家',
    file: 'slide-15.png',
    dateSource: 'mtime',
  },
]
