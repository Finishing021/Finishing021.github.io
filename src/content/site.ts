export type ContactType = 'wechat' | 'email'

export interface Contact {
  type: ContactType
  label: string
  value: string
}

export interface DiaryEntry {
  id: string
  /** YYYY-MM-DD */
  date: string
  year: number
  /** 主题名，显示在卡片正面与右侧文字栏 */
  title: string
  /** 英文主题名：切到 EN 时卡片图注与灯箱标题使用它 */
  titleEn: string
  /** 简短摘要 */
  summary: string
  /**
   * 该主题下的手稿照片，**第一张作为卡片正面的缩略图**。
   * 路径对应 public/diary/ 下的成品文件。
   */
  images: string[]
  tags: string[]
}

export interface AboutInfo {
  school: string
  major: string
  grade: string
  bio: string
}

export interface NavItem {
  /** 与 i18n 的 navDict 对应；文案不写在这里，好让导航随语言切换 */
  id: 'about' | 'archive' | 'moments' | 'projects' | 'guestbook'
  /**
   * 站内路径。
   * `/about`、`/moments` 与 `/projects` 是独立整页；`/#archive` 是首页上的锚点。
   * 注意不要再写纯 `#xxx` —— 内容搬走后首页只剩成长档案，
   * 纯锚点链接在其它页面上会指向一个不存在的元素。
   */
  href: string
}

/** 顺序即为导航从左到右的顺序：关于我 → 成长档案 → 光影 → 作品集 → 留言 */
export const nav: NavItem[] = [
  { id: 'about', href: '/about' },
  { id: 'archive', href: '/#archive' },
  { id: 'moments', href: '/moments' },
  { id: 'projects', href: '/projects' },
  { id: 'guestbook', href: '/guestbook' },
]

/**
 * 封面页文案。
 * 封面是一张独立的全屏引导页，点击进入后才展开主内容区。
 */
export const cover = {
  title: 'Finishing',
  eyebrow: '2026 YZU Vehicle Engineering',
  footnote: '希望你永远 风华正茂',
  cta: '点击进入',
}

/**
 * 封面的头像背景。
 * 文件实际位置：public/hero/avatar.webp → 运行时 URL /hero/avatar.webp
 * 换图：把新图放到任意位置，执行 npm run backdrop -- "图片路径"
 */
export const coverBackdrop = {
  src: '/hero/avatar.webp',
  /** 模糊半径 px，要求落在 4px~8px（有测试守着这个区间） */
  blur: 6,
}

/**
 * 成长档案：5 个主题，每个主题是一个时间轴节点。
 *
 * 照片工作流：
 *   1. 原图放 assets-source/diary/，建议按主题命名（theme1_01.jpg、theme4_03.jpg）
 *   2. npm run diary:build —— 按 EXIF 摆正方向、长边压到 1600px、输出到 public/diary/
 *   3. npm run diary:check —— 核对哪条缺图
 *
 * 数组需按 date 倒序（时间轴从上到下由新到旧）。
 *
 * ⚠️ 日期说明：只有「二检写小结」的日期是从手稿上直接读到的（3月28日）。
 *    其余四个是根据内容推断的，其中 theme4（高一）与 theme5（黄卡片）把握较低，
 *    请自行核对后改正。
 */
export const diary: DiaryEntry[] = [
  {
    id: 'gaokao-result',
    date: '2026-06-25',
    year: 2026,
    title: '高考出分后的自我调整',
    titleEn: 'Self-adjustment after Gaokao',
    summary:
      '总分 585，排名 48811。早就做过心理准备，真看到那个数字时还是愣住了——第一眼看的不是总分，是排名。这一页写满了「复读」，也写下复读要面对的焦虑、敏感、自卑、环境与年龄。',
    images: ['/diary/theme1_01.webp', '/diary/theme1_02.webp'],
    tags: ['高考', '复读'],
  },

  {
    id: 'second-mock-summary',
    date: '2026-03-28',
    year: 2026,
    title: '二检写小结',
    titleEn: '2nd Mock Exam Summary',
    summary:
      '3 月 28 日，生物考完，二检落幕。站在折桂楼西边，无意间瞥见樱花大道已经开满。植树节新栽的玉兰也活了下来。搬把椅子坐在太阳底下，什么都不做，只是歇歇。',
    images: ['/diary/theme3_01.webp'],
    tags: ['高三', '二检'],
  },

  {
    id: 'self-consolation',
    date: '2025-07-01',
    year: 2025,
    title: '一种自我安慰',
    titleEn: 'A Kind of Self-consolation',
    summary:
      '「希望你能有『人是一体两面』的清醒。永远不落入别人的自证预言里面去，永远笃信只有自己才能定义自己。」写在黄色卡片上的一段话，一直留着。',
    images: ['/diary/theme5_01.webp'],
    tags: ['自我', '卡片'],
  },

  {
    id: 'advice-from-limingrui',
    date: '2025-06-28',
    year: 2025,
    title: '李铭睿同学给我的建议',
    titleEn: 'Advice from Li Mingrui',
    summary:
      '「我说的话仅代表个人见解，莫把我言作箴言。」他说每个人的处境都不一样，一面之词未免适用；不必抱怨过去，也不必抱怨环境，客观存在的难题一定有解决方法。',
    images: ['/diary/theme2_01.webp', '/diary/theme2_02.webp'],
    tags: ['朋友', '建议'],
  },

  {
    id: 'grade-1-burnout',
    date: '2023-05-17',
    year: 2023,
    title: '高一内耗到极点，精神已经失控',
    titleEn: 'Grade 10 Burnout: Losing My Grip',
    summary:
      '从化学考试结束那一刻萌生「退学」的念头，想了两天。把退学之后能做什么、父母会怎么看我、同学会怎么说，都想了一遍。最后承认：我只是想逃。',
    images: [
      '/diary/theme4_01.webp',
      '/diary/theme4_02.webp',
      '/diary/theme4_03.webp',
      '/diary/theme4_04.webp',
    ],
    tags: ['高一', '内耗'],
  },

  {
    id: 'opening-two-days',
    date: '2023-02-22',
    year: 2023,
    title: '开学后的两天假期',
    titleEn: 'Two Days Off After the Term Began',
    summary:
      '把开学头两天的雪、那次迟到、那碗豆浆，连同寒假末尾的回望与晚自习里的自律拷问，一起收进这一叠手写日记里。点开后用左右箭头一张一张翻，全是当时真实的笔迹。',
    images: [
      '/diary/diary_2023_01.webp',
      '/diary/diary_2023_02.webp',
      '/diary/diary_2023_03.webp',
      '/diary/diary_2023_04.webp',
      '/diary/diary_2023_05.webp',
    ],
    tags: ['高一', '雪', '开学'],
  },

]

export const about: AboutInfo = {
  school: '扬州大学',
  major: '车辆工程',
  grade: '大一',
  bio: '扬州大学车辆工程专业大一新生。对机械结构怎么动起来这件事一直很好奇，喜欢把看到的东西拆开再装回去。平时写字、拍照片，把想不清的事情先记下来，过一阵再回头看。',
}

/**
 * 关于我整页用的头像。
 * 与封面共用同一张成品图（public/hero/avatar.webp），换封面图时这里自动跟着换。
 */
export const aboutPortrait = coverBackdrop.src

export const contacts: Contact[] = [
  { type: 'wechat', label: '微信', value: '13357815021' },
  { type: 'email', label: '邮箱', value: '2820106405@qq.com' },
]

/** 简历：把 PDF 放到 public/resume.pdf 即可，不需要改代码 */
export const resumeUrl = '/resume.pdf'

/**
 * 作品集的完整 PDF。
 * 由 `npm run projects:export` 从 assets-source/ppt/deck.pptx 导出，或直接放一份
 * 最新版导出的 PDF；落在 public/portfolio.pdf；页面上「下载完整 PDF」按钮指向它。
 */
export const portfolioUrl = '/portfolio.pdf'
