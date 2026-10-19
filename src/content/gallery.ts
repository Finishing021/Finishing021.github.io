/**
 * 「相框 + 灯箱」这条展示线消费的通用条目形状。
 *
 * 光影摄影墙用的就是这一套：网格里一张白边卡片，点开是全屏大图，能左右翻页。
 * 生成脚本产出的 photos.generated.ts / projects.generated.ts 字段完全相同，
 * 都满足这个接口 —— 所以日后若再有一条内容线要用这堵墙，不必再动组件。
 *
 * 契约手写在这里、而不是让组件直接依赖生成文件，是为了让展示层不跟生成器耦合：
 * 生成脚本改了字段名或类型，传参处会立刻编译报错，而不是等到运行时图不显示才发现。
 *
 * 注意：生成脚本仍会各自声明同形状的接口（Photo / Project），
 * 这里只借用 TypeScript 的结构化类型做兼容。
 */
export interface GalleryItem {
  /** 全尺寸图 URL，灯箱用 */
  src: string
  /** 缩略图 URL，网格用 */
  thumb: string
  /** 缩略图宽高比 = 宽 / 高，用于占位、避免布局抖动 */
  aspect: number
  /** 日期 YYYY-MM-DD；课件这类有序内容可能没有实际意义 */
  date: string
  /** 读屏描述 */
  alt: string
  /** 图片下方的中文图注；空串表示未填，组件会退回文件名 */
  caption: string
  /** 源文件名，排查问题时用 */
  file: string
  /** 日期来源；mtime 表示靠兜底 */
  dateSource: 'exif' | 'filename' | 'mtime'
}
