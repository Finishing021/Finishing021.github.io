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
    date: '2026-11-07',
    alt: '科技创新思政课课件封面：AI 时代的变局与破局，副标题「AI 接管的是结果，人守住的是过程」，11 月 17 日课堂展示与小组成员名单',
    caption: '封面：AI 时代的变局与破局',
    file: 'slide-01.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-02.webp',
    thumb: '/projects/slide-02_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 2 页：从大国重器到 AI，用长征五号、C919、CR450 高铁等工程对比有形的突破与无形的智能变局',
    caption: '从「大国重器」到「AI」',
    file: 'slide-02.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-03.webp',
    thumb: '/projects/slide-03_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 3 页：今天的主角群雄逐鹿，展示文本、图像、音频、视频四类 AI 工具与国内外代表性力量',
    caption: '今天的主角 · 群雄逐鹿',
    file: 'slide-03.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-04.webp',
    thumb: '/projects/slide-04_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 4 页：AI 生成人像已难用肉眼分辨，右侧列出光影、发丝、肤质三项现场辨真观察项',
    caption: 'AI 人像，肉眼已难分辨',
    file: 'slide-04.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-05.webp',
    thumb: '/projects/slide-05_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 5 页：同一命题下 9 人画 1 小时与 6 个模型 15 秒的效率对比实验及成图结果',
    caption: '9 人画 1 小时，AI 只用 15 秒',
    file: 'slide-05.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-06.webp',
    thumb: '/projects/slide-06_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 6 页：OpenAI 公开 722 篇数学手稿，说明 AI 已开始进入知识生产环节',
    caption: '722 篇数学手稿：知识生产',
    file: 'slide-06.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-07.webp',
    thumb: '/projects/slide-07_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 7 页：70% 的网站基于 PHP，AI 找出潜伏十余年的安全盲区，把可利用这一步从两年压缩到两周',
    caption: '70% 的网站：被 AI 揪出的盲区',
    file: 'slide-07.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-08.webp',
    thumb: '/projects/slide-08_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 8 页：Argon 与 Carbon 相隔 28 天发布，模型迭代进入以周为单位的节奏',
    caption: '28 天：以周为单位的迭代',
    file: 'slide-08.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-09.webp',
    thumb: '/projects/slide-09_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 9 页：从人类投喂到 AI 自我迭代，人类的时间被压缩成算力维度的几小时',
    caption: 'AI 训 AI：算法的自我加速',
    file: 'slide-09.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-10.webp',
    thumb: '/projects/slide-10_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 10 页：一键外包带来完美结果，却剥夺了克服困难的过程，空虚感随之蔓延',
    caption: '过程被省略，爽感也一起消失',
    file: 'slide-10.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-11.webp',
    thumb: '/projects/slide-11_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 11 页：面对绝对效率是否要躺平，追问只追求结果时大学生存在的意义',
    caption: '面对绝对效率，要彻底躺平吗？',
    file: 'slide-11.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-12.webp',
    thumb: '/projects/slide-12_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 12 页：AI 能生成完美照片，为何还要拿相机，因为我们乎的是按下快门那一刻的心跳与走过的路',
    caption: '为何还要亲手拿起相机？',
    file: 'slide-12.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-13.webp',
    thumb: '/projects/slide-13_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 13 页：过程就是意义本身，用过程定义自己而非用结果审判自己',
    caption: '过程，就是意义本身',
    file: 'slide-13.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-14.webp',
    thumb: '/projects/slide-14_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 14 页：划清边界，AI 负责效率与算力，人类负责提问、情绪与从无到有的体验',
    caption: '划清边界：效率与体验',
    file: 'slide-14.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-15.webp',
    thumb: '/projects/slide-15_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 15 页：做自己人生的摄影师，行动指南为不神化、不恐慌、去行动',
    caption: '做自己人生的「摄影师」',
    file: 'slide-15.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-16.webp',
    thumb: '/projects/slide-16_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 16 页：看过了完美的 AI 生图，回到那个问题，自己拍的普通照片是否依然珍贵',
    caption: '回到那个问题：照片还珍贵吗？',
    file: 'slide-16.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-17.webp',
    thumb: '/projects/slide-17_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 17 页：总结科技向善以人为本，把 AI 用在比自己更大的事上',
    caption: '科技向善，以人为本',
    file: 'slide-17.png',
    dateSource: 'mtime',
  },
  {
    src: '/projects/slide-18.webp',
    thumb: '/projects/slide-18_thumb.webp',
    aspect: 1.7778,
    date: '2026-11-07',
    alt: '科技创新思政课课件第 18 页：谢谢大家，结语「把效率交给 AI，把体验留给自己」，配小组合影',
    caption: '谢谢大家 · 把效率交给 AI',
    file: 'slide-18.png',
    dateSource: 'mtime',
  },
]
