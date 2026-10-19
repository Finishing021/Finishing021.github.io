import { about, cover, type ContactType } from '../content/site'
import type { PhotoCategory } from '../content/photoCategories'

export type Lang = 'zh' | 'en'

export interface AboutCopy {
  /** 页面顶部的小标签 */
  eyebrow: string
  /** 一级标题 */
  heading: string
  /** 标题下的那句引子 */
  lead: string
  bio: string
  labels: { school: string; major: string; grade: string }
  values: { school: string; major: string; grade: string }
  contactLabel: string
  copyHint: string
  copied: string
  /** 自动复制失败后的降级提示：文本已帮访客选中，提示按 Ctrl+C */
  selectedHint: string
  copyFailed: string
  downloadResume: string
  resumeMeta: string
  /** 头像的替代文本 */
  portraitAlt: string
  /** 页面底部回到成长档案的链接文案 */
  backToArchive: string
  /** 切换语言后弹出的提示 */
  langSwitched: string
}

export const aboutDict: Record<Lang, AboutCopy> = {
  zh: {
    eyebrow: 'ABOUT ME',
    heading: '关于我',
    lead: '把想不清的事情先写下来，过一阵再回头看。',
    bio: about.bio,
    labels: { school: '学校', major: '专业', grade: '年级' },
    values: {
      school: about.school,
      major: about.major,
      grade: about.grade,
    },
    contactLabel: '联系方式',
    copyHint: '点击复制',
    copied: '已复制',
    selectedHint: '已为您选中，请按 Ctrl+C 复制',
    copyFailed: '复制失败，请手动选择',
    downloadResume: '下载简历',
    resumeMeta: 'PDF',
    portraitAlt: '站主的头像',
    backToArchive: '看看成长档案',
    langSwitched: '已切换为中文',
  },
  en: {
    eyebrow: 'ABOUT ME',
    heading: 'About Me',
    lead: 'Writing things down first, and reading them again later.',
    bio: 'A first-year Vehicle Engineering student at Yangzhou University. Long curious about how mechanical things move, and fond of taking them apart and putting them back together. I write and take photographs, mostly to keep the thoughts I cannot yet sort out somewhere I can return to later.',
    labels: { school: 'School', major: 'Major', grade: 'Year' },
    /* 英文模式下这三项显示对应英文；中文模式走上面的 zh 分支显示中文原文 */
    values: {
      school: 'Yangzhou University',
      major: 'Vehicle Engineering',
      grade: 'Freshman',
    },
    contactLabel: 'Contact',
    copyHint: 'Click to copy',
    copied: 'Copied',
    selectedHint: 'Selected for you — press Ctrl+C to copy',
    copyFailed: 'Copy failed, please select manually',
    downloadResume: 'Download CV',
    resumeMeta: 'PDF',
    portraitAlt: 'Portrait of the author',
    backToArchive: 'View the archive',
    langSwitched: 'Switched to English',
  },
}

/** 导航文案。导航是全站外壳，关于我整页是英文时导航还是中文会很割裂，所以一并双语。 */
export const navDict: Record<
  Lang,
  Record<'about' | 'archive' | 'home' | 'moments' | 'projects' | 'guestbook', string>
> = {
  zh: {
    about: '关于我',
    archive: '成长档案',
    home: '首页',
    moments: '光影',
    projects: '作品集',
    guestbook: '留言',
  },
  en: {
    about: 'About',
    archive: 'Archive',
    home: 'Home',
    moments: 'Moments',
    projects: 'Projects',
    guestbook: 'Guestbook',
  },
}

/**
 * 「留言」整页文案。极简写信/留言板，不接数据库、不存任何数据，
 * 点发送走 Web3Forms 表单服务把留言寄到站主邮箱。
 */
export interface GuestbookCopy {
  /** 页头小标签 */
  eyebrow: string
  /** 一级标题 */
  heading: string
  /** 标题下的引子 */
  lead: string
  /** 称呼输入框标签 */
  nameLabel: string
  /** 称呼输入框占位 */
  namePlaceholder: string
  /** 留言输入框标签 */
  messageLabel: string
  /** 留言输入框占位 */
  messagePlaceholder: string
  /** 发送按钮 */
  send: string
  /** 发送按钮聚焦 / 发送后的短标签（如「已发送」/「Sent」） */
  sentShort: string
  /** 表单下方文艺小字 */
  hint: string
  /** 右侧装饰区的点睛大字 */
  decorTitle: string
  /** 右侧装饰区的引导小字 */
  decorLead: string
  /** 板块寄语（诗词 / 金句），排版走 section.module.css 的 .epigraphLg */
  epigraph: string
  /** 留言为空时的内联错误提示 */
  emptyError: string
  /** 按钮「发送中」态文案 */
  sending: string
  /** 发送成功后的提示 */
  successNote: string
  /** 发送失败后的提示 */
  failNote: string
  /** 未留称呼时的默认署名 */
  anonymous: string
  /** 表单 / 邮件主题前缀 */
  mailSubjectPrefix: string
}

export const guestbookDict: Record<Lang, GuestbookCopy> = {
  zh: {
    eyebrow: 'GUESTBOOK',
    heading: '给我写封信',
    lead: '这里没有评论框，也不存任何数据。点「发送」，留言会直接寄到我的邮箱。',
    nameLabel: '你的称呼',
    namePlaceholder: '名字 / 昵称',
    messageLabel: '你想说的话',
    messagePlaceholder: '想说什么都好，哪怕只是一句你好。',
    send: '发送',
    sentShort: '已发送',
    hint: '如果你有话想说，或者只是想打个招呼，欢迎给我写信。',
    decorTitle: '见字如面',
    decorLead: '如果你有话想说，欢迎在这里留下足迹。',
    epigraph: '希君生羽翼，一化北溟鱼。',
    emptyError: '写点什么再寄吧～',
    sending: '发送中...',
    successNote: '留言已发送，感谢你的来信',
    failNote: '发送失败，请稍后再试',
    anonymous: '一位访客',
    mailSubjectPrefix: 'Finishing 留言 · ',
  },
  en: {
    eyebrow: 'GUESTBOOK',
    heading: 'Write me a letter',
    lead: 'No comment box, no database. Press send and your message goes straight to my inbox.',
    nameLabel: 'Your name',
    namePlaceholder: 'Name / nickname',
    messageLabel: 'Your message',
    messagePlaceholder: 'Anything at all — even just a hello.',
    send: 'Send',
    sentShort: 'Sent',
    hint: 'If you have something to say, or just want to say hi, write me a letter.',
    decorTitle: 'A note from you',
    decorLead: 'If there is something you would like to say, this is a good place to leave it.',
    epigraph: 'May you grow wings, and rise as the great fish of the Northern Sea.',
    emptyError: 'Say something before you send it off.',
    sending: 'Sending...',
    successNote: 'Message sent. Thank you for writing.',
    failNote: 'Failed to send. Please try again.',
    anonymous: 'A visitor',
    mailSubjectPrefix: 'Finishing guestbook · ',
  },
}

/* ------------------------------------------------------------------ 全站其它板块
   以下文案都随语言切换。唯一**不**跟着切的，是成长档案 / 光影里图片下方的中文图注 ——
   那是作品自带的文字，不是界面文案。 */

/** 封面文案。中文沿用 site.cover，英文另给；标题两种语言都保持 Finishing。 */
export interface CoverCopy {
  title: string
  eyebrow: string
  footnote: string
  cta: string
}

export const coverCopy: Record<Lang, CoverCopy> = {
  zh: {
    title: cover.title,
    eyebrow: cover.eyebrow,
    footnote: cover.footnote,
    cta: cover.cta,
  },
  en: {
    title: 'Finishing',
    eyebrow: '2026 YZU · Vehicle Engineering',
    footnote: 'May you always be in your prime',
    cta: 'Enter',
  },
}

export interface FooterCopy {
  note: string
  backToTop: string
}

export const footerCopy: Record<Lang, FooterCopy> = {
  zh: { note: '写下来，就算数', backToTop: '回到顶部' },
  en: { note: 'Writing it down counts.', backToTop: 'Back to top' },
}

/** 成长档案区块的页头 + 年份后缀（中文「2026 年」/ 英文「2026」）。 */
export interface ArchiveCopy {
  eyebrow: string
  heading: string
  lead: string
  yearSuffix: string
}

export const archiveCopy: Record<Lang, ArchiveCopy> = {
  zh: {
    eyebrow: '成长档案',
    heading: '写下来的那些时候',
    lead: '日记手稿按主题整理，时间从新到旧。点击任意一张卡片查看原稿大图。',
    yearSuffix: ' 年',
  },
  en: {
    eyebrow: 'Archive',
    heading: 'The times I wrote down',
    lead: 'Journal manuscripts grouped by theme, newest first. Click any card to view the full scan.',
    yearSuffix: '',
  },
}

/** 光影区块的页头 + 空态。 */
export interface MomentsCopy {
  eyebrow: string
  heading: string
  lead: string
  /** 板块寄语（金句），排版走 section.module.css 的 .epigraph */
  epigraph: string
  emptyTitle: string
  emptyHintPre: string
  emptyHintMid: string
}

/** 光影分类筛选的胶囊标签，随语言切换。key 与 PhotoCategory 对齐。 */
export const momentsCategories: Record<Lang, Record<PhotoCategory, string>> = {
  zh: { all: '全部', scenery: '风景', portraits: '人像', daily: '日常' },
  en: { all: 'All', scenery: 'Scenery', portraits: 'Portraits', daily: 'Daily' },
}

/** 光影筛选栏的读屏标签（视觉上不可见） */
export const momentsFilterLabel: Record<Lang, string> = {
  zh: '照片分类',
  en: 'Photo categories',
}

/** 主导航的读屏标签（视觉上不可见） */
export const navMainLabel: Record<Lang, string> = {
  zh: '主导航',
  en: 'Main navigation',
}

/**
 * 背景音乐播放器的无障碍文案。
 * 播放器在导航栏里只有图标，这些字符串是读屏用户唯一能听到的说明。
 */
export const musicCopy: Record<Lang, { volume: string; play: string; pause: string }> = {
  zh: {
    volume: '背景音乐音量',
    play: '播放背景音乐',
    pause: '暂停背景音乐',
  },
  en: {
    volume: 'Background music volume',
    play: 'Play background music',
    pause: 'Pause background music',
  },
}

export const momentsCopy: Record<Lang, MomentsCopy> = {
  zh: {
    eyebrow: '光影',
    heading: '拍下来的那些时候',
    lead: '按拍摄时间从新到旧排列，点击任意一张看大图。',
    epigraph: '把一瞬的光，留成可以回头看的样子',
    emptyTitle: '这里还没有照片',
    emptyHintPre: '把作品放进 ',
    emptyHintMid: '，再跑一次 ',
  },
  en: {
    eyebrow: 'Moments',
    heading: 'The moments I captured',
    lead: 'Sorted newest first by capture time. Click any photo to view it large.',
    epigraph: 'Keep a moment of light, in a form you can look back on.',
    emptyTitle: 'No photos yet',
    emptyHintPre: 'Add photos to ',
    emptyHintMid: ' then run ',
  },
}

/** 作品集区块的页头、下载按钮与空态。
 *
 * 这里**不**包含课件本身的文字 —— 课件是作品，它的图注与 alt 保留中文原样，
 * 和成长档案的主题名、光影的图注是同一条规矩。 */
export interface ProjectsCopy {
  eyebrow: string
  heading: string
  /** 标题下的副标题（作品集页专用，一行小字） */
  subtitle: string
  lead: string
  /** 板块寄语（金句），排版走 section.module.css 的 .epigraph */
  epigraph: string
  /** 下载按钮的主文案 */
  download: string
  /** 下载按钮右侧的小标签，如 PDF */
  pdfLabel: string
  /** 页数后缀：中文「 页」/ 英文「 pages」 */
  pagesSuffix: string
  /** 下载按钮的读屏补充说明 */
  downloadHint: string
  /** 左右箭头的读屏文案 */
  prev: string
  next: string
  /** 点击幻灯片/证书放大查看的读屏文案 */
  viewLarge: string
  emptyTitle: string
  emptyHintPre: string
  emptyHintMid: string
}

export const projectsCopy: Record<Lang, ProjectsCopy> = {
  zh: {
    eyebrow: '作品集',
    heading: '所见，所思，所行。',
    subtitle: '一些阶段性的学习记录与实践。',
    lead: '思政课的课堂展示课件。从「AI 能做什么」讲到「我们该怎么做」，点击任意一页可以看大图。',
    epigraph: '还没学会，但我已经在路上了',
    download: '下载完整 PDF',
    pdfLabel: 'PDF',
    pagesSuffix: ' 页',
    downloadHint: '下载完整课件 PDF',
    prev: '上一页',
    next: '下一页',
    viewLarge: '放大查看这一页',
    emptyTitle: '这里还没有作品',
    emptyHintPre: '把图片放进 ',
    emptyHintMid: '，再跑一次 ',
  },
  en: {
    eyebrow: 'Projects',
    heading: 'Seen, Thought, Done.',
    subtitle: 'Some records of learning and practice, stage by stage.',
    lead: 'A class presentation deck for a first-year seminar — from what AI can already do, to what we should do with it. Click any slide to view it large.',
    epigraph: "I haven't learned it all yet — but I'm already on my way.",
    download: 'Download full PDF',
    pdfLabel: 'PDF',
    pagesSuffix: ' pages',
    downloadHint: 'Download the full deck as PDF',
    prev: 'Previous slide',
    next: 'Next slide',
    viewLarge: 'View this slide large',
    emptyTitle: 'No projects yet',
    emptyHintPre: 'Add images to ',
    emptyHintMid: ' then run ',
  },
}

/** 联系方式的字段标签（微信 / 邮箱）。 */
export const contactLabel: Record<Lang, Record<ContactType, string>> = {
  zh: { wechat: '微信', email: '邮箱' },
  en: { wechat: 'WeChat', email: 'Email' },
}

/** 成长档案卡片上的张数角标与缺图降级文案。 */
export interface DiaryCardCopy {
  countSuffix: string
  missing: string
}

export const diaryCardCopy: Record<Lang, DiaryCardCopy> = {
  zh: { countSuffix: ' 张', missing: '原稿待补' },
  en: { countSuffix: ' photos', missing: 'Original pending' },
}

/** 灯箱上的按钮文案（不可见，给读屏用）。 */
export interface LightboxCopy {
  close: string
  prev: string
  next: string
  zoomIn: string
  zoomOut: string
  zoomReset: string
}

export const photoLightboxCopy: Record<Lang, LightboxCopy> = {
  zh: {
    close: '关闭大图',
    prev: '上一张照片',
    next: '下一张照片',
    zoomIn: '放大图片',
    zoomOut: '缩小图片',
    zoomReset: '复位图片大小',
  },
  en: {
    close: 'Close photo',
    prev: 'Previous photo',
    next: 'Next photo',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Reset zoom',
  },
}

export const diaryLightboxCopy: Record<Lang, LightboxCopy> = {
  zh: {
    close: '关闭原图',
    prev: '上一张原图',
    next: '下一张原图',
    zoomIn: '放大原图',
    zoomOut: '缩小原图',
    zoomReset: '复位原图大小',
  },
  en: {
    close: 'Close scan',
    prev: 'Previous scan',
    next: 'Next scan',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Reset zoom',
  },
}
