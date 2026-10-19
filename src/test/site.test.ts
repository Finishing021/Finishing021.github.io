import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  about,
  contacts,
  cover,
  coverBackdrop,
  diary,
  nav,
  portfolioUrl,
  resumeUrl,
} from '../content/site'
import { projects } from '../content/projects.generated'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** 把站内绝对路径（/diary/theme1_01.jpg）映射到 public 下的真实文件 */
function publicFile(urlPath: string) {
  return resolve(projectRoot, 'public', urlPath.replace(/^\//, ''))
}

describe('站点内容配置', () => {
  it('导航与封面文案非空', () => {
    expect(nav.length).toBeGreaterThan(0)
    expect(cover.title.trim()).not.toBe('')
    expect(cover.eyebrow.trim()).not.toBe('')
    expect(cover.footnote.trim()).not.toBe('')
    expect(cover.cta.trim()).not.toBe('')
    for (const item of nav) {
      expect(item.id).toMatch(/^(about|archive|moments|projects|guestbook)$/)
      // 站内路径必须以 / 开头：写纯 #anchor 的话，在另一个页面上点了不会有反应
      expect(item.href.startsWith('/')).toBe(true)
    }
  })

  it('导航顺序为「关于我 → 成长档案 → 光影 → 作品集 → 留言」', () => {
    expect(nav.map((item) => item.id)).toEqual([
      'about',
      'archive',
      'moments',
      'projects',
      'guestbook',
    ])
  })

  it('关于我 / 光影 / 作品集指向独立整页，成长档案指向首页锚点', () => {
    expect(nav[0].href).toBe('/about')
    expect(nav[1].href).toBe('/#archive')
    expect(nav[2].href).toBe('/moments')
    expect(nav[3].href).toBe('/projects')
  })

  it('每个主题都有完整的必填字段，且至少一张手稿', () => {
    expect(diary.length).toBeGreaterThan(0)
    for (const entry of diary) {
      expect(entry.id.trim()).not.toBe('')
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isInteger(entry.year)).toBe(true)
      expect(entry.year).toBe(Number(entry.date.slice(0, 4)))
      expect(entry.title.trim()).not.toBe('')
      expect(entry.titleEn.trim()).not.toBe('')
      expect(entry.summary.trim()).not.toBe('')
      expect(Array.isArray(entry.images)).toBe(true)
      expect(entry.images.length).toBeGreaterThan(0)
      expect(Array.isArray(entry.tags)).toBe(true)
      for (const image of entry.images) {
        expect(image.startsWith('/')).toBe(true)
      }
    }
  })

  it('主题 id 唯一', () => {
    const ids = diary.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('主题按日期倒序排列', () => {
    const dates = diary.map((entry) => entry.date)
    const sorted = [...dates].sort().reverse()
    expect(dates).toEqual(sorted)
  })

  /*
   * 引用完整性：site.ts 里写到的每一张照片都必须真的在 public/ 下。
   * 字符串比对看不出路径对不对得上——这正是最容易悄悄坏掉的一环。
   */
  it('每个主题引用的手稿文件都真实存在', () => {
    const missing = diary
      .flatMap((entry) => entry.images)
      .filter((image) => !existsSync(publicFile(image)))
    expect(missing).toEqual([])
  })

  it('手稿路径统一是 /diary/ 下的图片文件', () => {
    for (const entry of diary) {
      for (const image of entry.images) {
        expect(image).toMatch(/^\/diary\/[\w-]+\.(jpe?g|png|webp)$/)
      }
    }
  })

  it('关于我信息完整且联系方式含微信', () => {
    expect(about.school.trim()).not.toBe('')
    expect(about.major.trim()).not.toBe('')
    expect(about.grade.trim()).not.toBe('')
    expect(about.bio.trim()).not.toBe('')
    expect(contacts.some((contact) => contact.type === 'wechat')).toBe(true)
    for (const contact of contacts) {
      expect(contact.label.trim()).not.toBe('')
      expect(contact.value.trim()).not.toBe('')
    }
  })

  it('联系方式已是真实号码，不再残留占位符', () => {
    for (const contact of contacts) {
      expect(contact.value).not.toMatch(/placeholder/i)
    }
  })

  it('微信与邮箱都填上了，且标签正确', () => {
    const byType = Object.fromEntries(contacts.map((c) => [c.type, c.value]))
    expect(byType.wechat).toBe('13357815021')
    expect(byType.email).toBe('2820106405@qq.com')
    expect(contacts.map((c) => c.label)).toEqual(['微信', '邮箱'])
  })

  it('简历路径为站内绝对路径，且文件真实存在', () => {
    expect(resumeUrl.startsWith('/')).toBe(true)
    expect(resumeUrl.endsWith('.pdf')).toBe(true)
    expect(existsSync(publicFile(resumeUrl))).toBe(true)
  })

  it('作品集 PDF 路径为站内绝对路径，且文件真实存在', () => {
    expect(portfolioUrl.startsWith('/')).toBe(true)
    expect(portfolioUrl.endsWith('.pdf')).toBe(true)
    expect(existsSync(publicFile(portfolioUrl))).toBe(true)
  })

  it('封面头像文件真实存在于 public 目录下', () => {
    expect(coverBackdrop.src.startsWith('/')).toBe(true)
    expect(existsSync(publicFile(coverBackdrop.src))).toBe(true)
  })

  it('封面头像的模糊半径落在「轻微」区间（4px~8px）', () => {
    expect(coverBackdrop.blur).toBeGreaterThanOrEqual(4)
    expect(coverBackdrop.blur).toBeLessThanOrEqual(8)
  })
})

/*
 * 作品集清单的引用完整性。
 *
 * 这一组守的是「跑了 projects:build 但忘了把图放进去 / 改了文件名」这类问题 ——
 * 页面上会安静地出现一堆破图，而不是报错，很难第一时间发现。
 */
describe('作品集清单', () => {
  it('清单非空，且每一页的全尺寸图与缩略图都真实存在', () => {
    expect(projects.length).toBeGreaterThan(0)

    const missing = projects
      .flatMap((item) => [item.src, item.thumb])
      .filter((url) => !existsSync(publicFile(url)))
    expect(missing).toEqual([])
  })

  it('路径统一是 /projects/ 下的 jpg，缩略图带 _thumb 后缀', () => {
    for (const item of projects) {
      expect(item.src).toMatch(/^\/projects\/[\w-]+\.webp$/)
      expect(item.thumb).toMatch(/^\/projects\/[\w-]+_thumb\.webp$/)
      expect(item.thumb).toContain('_thumb')
    }
  })

  it('每一页都有中文图注与读屏描述', () => {
    for (const item of projects) {
      expect(item.caption.trim()).not.toBe('')
      expect(item.alt.trim()).not.toBe('')
      expect(item.file.trim()).not.toBe('')
    }
  })

  it('按文件名升序排列，即课件的第 1 页在最前', () => {
    const files = projects.map((item) => item.file)
    expect(files).toEqual([...files].sort())
    expect(files[0]).toBe('slide-01.png')
  })

  it('宽高比统一是 16:9', () => {
    for (const item of projects) {
      expect(item.aspect).toBeCloseTo(16 / 9, 3)
    }
  })
})
