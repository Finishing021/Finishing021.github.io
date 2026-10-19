import type { Lang } from '../i18n/dict'
import { portfolioUrl } from '../content/site'
import { projects } from './projects.generated'
import { projectCaptionEn } from './enText'

/**
 * 「作品集」页的模块化数据源。
 *
 * ⚠️ 设计目标：**加一个新模块 = 在下面数组里加一项**，页面自动长出来，
 * 不用碰任何组件代码。
 *
 * - `kind: 'carousel'` → 一屏一页的幻灯片轮播（左右切换），适合有顺序的成套内容
 *   （如 PPT 课件）。图片直接复用 `projects.generated.ts` 生成清单 ——
 *   想加新页：把图放进 assets-source/projects/ 再跑 `npm run projects:build`，
 *   轮播页数自动扩充，本文件一行都不用改。
 * - `kind: 'gallery'` → 白色相框卡片网格，适合并列的成件内容（如证书）。
 *   想加新证书：往 images 里再加一条即可。
 *
 * 点击两种模块里的任何一张图，都会打开与光影共用的 PhotoLightbox 放大查看。
 *
 * 注意：模块标题直接以双语写在这里（而不是进 dict.ts），是为了兑现
 * 「加一行数据就长出新模块」——不然每加一个模块还得去字典文件补两行文案。
 * 站点级通用文案仍归 dict.ts 管。
 */

/** 双语短文案 */
export type LocalizedText = Record<Lang, string>

/** 模块里的一张图。thumb/aspect 用于占位，灯箱与轮播都用全尺寸 src。 */
export interface ProjectModuleImage {
  /** 全尺寸图 URL（public 下的绝对路径） */
  src: string
  /** 缩略图 URL；没有缩略图时与 src 相同即可 */
  thumb: string
  /** 宽 / 高，用于在图片加载前占好位，避免布局抖动 */
  aspect: number
  /** 读屏描述 */
  alt: string
  /** 可选图注（轮播显示在页码上方，画廊可不用） */
  caption?: string
  /** 可选英文图注；EN 模式优先用它 */
  captionEn?: string
  /** 可选英文读屏描述；EN 模式优先用它 */
  altEn?: string
}

export type ProjectModuleKind = 'carousel' | 'gallery'

export interface ProjectModule {
  /** 稳定 id，同时用作 DOM 锚点（aria-labelledby） */
  id: string
  kind: ProjectModuleKind
  /** 区块标题，如「PPT 案例」「AI 认证」 */
  title: LocalizedText
  /** 可选的区块引言，一句话即可 */
  lead?: LocalizedText
  images: ProjectModuleImage[]
  /** 模块底部附一个下载按钮（如 PPT 模块的「下载完整 PDF」）；不传则不显示 */
  download?: { href: string; fileName: string }
}

export const projectModules: ProjectModule[] = [
  {
    id: 'ppt-deck',
    kind: 'carousel',
    title: { zh: 'PPT 案例', en: 'Presentation Deck' },
    // 课件页来自生成清单：加新图只需重跑 npm run projects:build，这里不用动
    // 英文图注从 enText.ts 按源文件名查表补上；生成文件重跑也不会覆盖翻译
    images: projects.map((item) => {
      const captionEn = projectCaptionEn[item.file] ?? item.caption
      return {
        src: item.src,
        thumb: item.thumb,
        aspect: item.aspect,
        alt: item.alt,
        caption: item.caption,
        captionEn,
        altEn: `Presentation slide: ${captionEn}`,
      }
    }),
    // 「下载完整 PDF」按钮挂在课件模块底部、轮播正下方（不再挤在页面顶部）
    download: { href: portfolioUrl, fileName: 'AI已来-思政课课件.pdf' },
  },
  {
    id: 'ai-certificates',
    kind: 'carousel',
    title: { zh: 'AI 认证', en: 'AI Certificates' },
    // 完全复用 PPT 轮播：一次只显示一张证书，左右箭头切换，下方页码 01 / 05
    // 新增的 3 张阿里云认证排在原有 2 张之后；点击任意一张都会打开共用灯箱放大。
    images: [
      {
        src: '/certificates/ait-junior.webp',
        thumb: '/certificates/ait-junior.webp',
        aspect: 1920 / 1357,
        alt: '人工智能训练师（初级）证书，郭勇，达摩院-机器智能技术事业部颁发，2026 年 7 月 28 日',
        altEn:
          'AI Trainer (Junior) certificate, Guo Yong, issued by the Damo Academy Machine Intelligence team, 28 July 2026',
        caption: '人工智能训练师（初级）· 2026',
        captionEn: 'AI Trainer (Junior) · 2026',
      },
      {
        src: '/certificates/ait-advanced.webp',
        thumb: '/certificates/ait-advanced.webp',
        aspect: 1920 / 1357,
        alt: '人工智能训练师（高级）证书，郭勇，达摩院-机器智能技术事业部颁发，2026 年 9 月 19 日',
        altEn:
          'AI Trainer (Advanced) certificate, Guo Yong, issued by the Damo Academy Machine Intelligence team, 19 September 2026',
        caption: '人工智能训练师（高级）· 2026',
        captionEn: 'AI Trainer (Advanced) · 2026',
      },
      {
        src: '/certificates/cert_new_01.webp',
        thumb: '/certificates/cert_new_01.webp',
        aspect: 1.4995,
        alt: '阿里云 Apsara Clouder 专项技能认证：基于 PAI ArtLab 的 AIGC 设计基础，郭勇，证书编号 CLDM05261002785323，2028 年 10 月 8 日到期',
        altEn:
          'Alibaba Cloud Apsara Clouder certification: AIGC Design Fundamentals with PAI ArtLab, Guo Yong, certificate ID CLDM05261002785323, valid until 8 October 2028',
        caption: '基于 PAI ArtLab 的 AIGC 设计基础 · 2028',
        captionEn: 'AIGC Design Fundamentals with PAI ArtLab · 2028',
      },
      {
        src: '/certificates/cert_new_02.webp',
        thumb: '/certificates/cert_new_02.webp',
        aspect: 1.4995,
        alt: '阿里云 Apsara Clouder 专项技能认证：大模型 Clouder 认证，基于百炼平台构建智能体应用，郭勇，证书编号 CLDM02261002785149，2028 年 10 月 7 日到期',
        altEn:
          'Alibaba Cloud Apsara Clouder certification: LLM Clouder, building agent applications on the Bailian platform, Guo Yong, certificate ID CLDM02261002785149, valid until 7 October 2028',
        caption: '大模型 Clouder · 基于百炼平台构建智能体应用 · 2028',
        captionEn: 'LLM Clouder · Building Agent Apps on Bailian · 2028',
      },
      {
        src: '/certificates/cert_new_03.webp',
        thumb: '/certificates/cert_new_03.webp',
        aspect: 1.4995,
        alt: '阿里云 Apsara Clouder 专项技能认证：人工智能 Clouder 认证，VISION 人工智能设计（入门），郭勇，证书编号 CLDM06261002786652，2028 年 10 月 18 日到期',
        altEn:
          'Alibaba Cloud Apsara Clouder certification: VISION AI Design (Introductory), Guo Yong, certificate ID CLDM06261002786652, valid until 18 October 2028',
        caption: 'VISION 人工智能设计（入门）· 2028',
        captionEn: 'VISION AI Design (Introductory) · 2028',
      },
    ],
  },
]
