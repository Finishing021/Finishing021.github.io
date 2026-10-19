import type { Lang } from '../i18n/dict'
import { photoCaptionEn } from '../content/enText'

/**
 * 把一张照片的「图注 / alt」换成当前语言。
 *
 * - 中文：优先用生成文件里的中文图注作为 alt（原来 alt 是拼音文件名，
 *   对读屏用户几乎没有意义）。
 * - 英文：查 `photoCaptionEn`；缺译时回落到中文，绝不出现空标题。
 *
 * 返回新对象，不修改原数据，避免影响分类筛选与 key。
 */
export function localizePhoto<T extends { file: string; caption: string; alt: string }>(
  photo: T,
  lang: Lang,
): T {
  if (lang === 'zh') {
    return photo.caption ? { ...photo, alt: photo.caption } : photo
  }

  const caption = photoCaptionEn[photo.file] ?? photo.caption
  return { ...photo, caption, alt: caption || photo.alt }
}
