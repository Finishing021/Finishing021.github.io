import { describe, expect, it } from 'vitest'
import { photos } from '../content/photos.generated'

/**
 * 清单的结构完整性。
 *
 * 分工要说清楚，否则很容易把两种断言混在一起：
 *
 *   - **这里（会红）**：结构不变量。不管站主往里放什么照片，这些都得成立 ——
 *     排序、路径形状、字段非空、宽高比是正数、没有重复。
 *   - **npm run photos:check（只警告）**：内容质量。alt 是不是敷衍、日期是不是
 *     靠 mtime 兜底。这类问题取决于站主刚丢进来的那张图起名用不用心，
 *     拿它卡测试等于「你文件名起得不好 → 整个测试套件红」，既不可操作，
 *     又把红信号稀释掉了。
 *   - **scripts/test-optimize-images.py**：解析逻辑本身（EXIF 各种写法、
 *     文件名前缀、alt 推导），22 项断言，跑在合成样本上。
 *
 * 也不断言「清单非空」：照片是逐步补进去的，内容填充期间 npm test 不该一直红着。
 */
describe('摄影墙清单', () => {
  it('按拍摄日期倒序（新到旧）', () => {
    const dates = photos.map((photo) => photo.date)
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)))
  })

  it('每条的字段都可用', () => {
    for (const photo of photos) {
      // 字段少一个就说明生成脚本改了结构而消费方没跟上，
      // Object.keys 比对比逐个 toBeDefined 更容易发现「多了个字段」这种事
      expect(Object.keys(photo).sort()).toEqual(
        ['alt', 'aspect', 'caption', 'date', 'dateSource', 'file', 'src', 'thumb'].sort(),
      )
      // 站内绝对路径，换页时才不会因为相对路径而找不到图
      expect(photo.src.startsWith('/')).toBe(true)
      expect(photo.thumb.startsWith('/')).toBe(true)
      expect(photo.file.trim()).not.toBe('')
      expect(photo.alt.trim()).not.toBe('')
      expect(photo.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      // 宽高比必须是正有限数：它会直接写进 aspect-ratio，
      // 是 0 或 NaN 会让整个格子塌掉
      expect(Number.isFinite(photo.aspect)).toBe(true)
      expect(photo.aspect).toBeGreaterThan(0)
      expect(['exif', 'filename', 'mtime']).toContain(photo.dateSource)
    }
  })

  it('没有重复条目', () => {
    const srcs = photos.map((photo) => photo.src)
    expect(new Set(srcs).size).toBe(srcs.length)
  })

  it('缩略图是全尺寸图的配对文件，不是同一张', () => {
    for (const photo of photos) {
      expect(photo.thumb).not.toBe(photo.src)
      expect(photo.thumb).toMatch(/_thumb\.(jpe?g|webp)$/)
    }
  })
})
