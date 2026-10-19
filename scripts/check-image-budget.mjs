/**
 * 校验产物里的图片：必须全是 WebP，且单张体积 ≤ 100KB（性能优化：图片预算闸门）
 *
 * 为什么做成构建的一环，而不是「转换脚本里顺手保证」：
 * 转换脚本（optimize-images.py）只在「有人想起来重新跑」时才生效。只要有人直接往
 * public/ 里丢了一张 800KB 的 PNG，或者在别处改了图，构建照样绿油油通过 ——
 * 于是那张图一路被上传到线上，手机端首屏就卡在它身上。
 * 把校验挂在 `npm run build` 之后，超标即构建失败，问题在上传前就暴露。
 *
 * 检查的是**产物目录**（dist）而不是源码目录：public/ 里可能有源图、缩略图等
 * 中间物，真正会被用户下载的就是 dist 里的那些。
 *
 * 退出码：有超标或非 WebP 即 1（阻断构建）；否则 0。
 *
 * 用法：npm run images:check
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 允许的格式：只认 WebP（性能优化的硬要求） */
const ALLOWED = new Set(['.webp'])
/** 单张上限 100KB —— 移动端弱网下，这是「等得起」的阈值 */
const MAX_BYTES = 100 * 1024

/** 要检查的产物目录。构建到别处时用 argv 传（如 vite build --outDir dist-perf） */
const distDir = resolve(root, process.argv[2] ?? 'dist')

if (!existsSync(distDir)) {
  console.error(`✗ 找不到产物目录：${distDir}`)
  console.error('  请先运行 npm run build，或把目录作为参数传进来。')
  process.exit(1)
}

/** 图片类扩展名（只统计这些，其它文件——JS/CSS/字体——不参与图片预算） */
const IMAGE_EXTS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.avif', '.gif', '.bmp'])

/**
 * 跳过这些文件：它们体积天然大、但都是「用户主动点击才下载」的附件，
 * 不在首屏关键路径上，不能拿图片的 100KB 标准去要求它们。
 * ⚠️ 图像类资源里没有任何东西被跳过 —— 全站所有会被自动加载的图都要过闸。
 */
const ATTACHMENT_EXTS = new Set(['.pdf', '.m4a', '.mp3', '.zip', '.mp4'])

/** @type {{file: string, size: number}[]} */
const images = []

/** 递归收集图片；dirs 记录已访问目录，防止软链接成环 */
function collect(dir, dirs = new Set()) {
  const real = resolve(dir)
  if (dirs.has(real)) return
  dirs.add(real)

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      collect(full, dirs)
      continue
    }
    if (!entry.isFile()) continue

    const ext = extname(entry.name).toLowerCase()
    // 非图片扩展名直接跳过（PDF / 音频等附件由上面的 ATTACHMENT_EXTS 说明豁免）
    if (!IMAGE_EXTS.has(ext)) continue

    images.push({ file: relative(distDir, full).replace(/\\/g, '/'), size: statSync(full).size })
  }
}

collect(distDir)

if (images.length === 0) {
  console.log('✓ 产物里没有图片，跳过检查。')
  process.exit(0)
}

const wrongFormat = images.filter((img) => !ALLOWED.has(extname(img.file).toLowerCase()))
const oversized = images.filter((img) => img.size > MAX_BYTES)

const kb = (bytes) => (bytes / 1024).toFixed(1)

console.log(`检查 ${images.length} 张图片（目录：${relative(root, distDir) || distDir}）`)

if (wrongFormat.length > 0) {
  console.error(`\n✗ 有 ${wrongFormat.length} 张不是 WebP（必须是 .webp）：`)
  for (const img of wrongFormat) {
    console.error(`    ${img.file}  ${kb(img.size)}KB  ${extname(img.file)}`)
  }
  console.error('\n  跑 npm run photos:build / diary:build / projects:build 重新生成。')
}

if (oversized.length > 0) {
  console.error(`\n✗ 有 ${oversized.length} 张超过 100KB 上限：`)
  // 从大到小排，最该改的排最前面
  for (const img of oversized.sort((a, b) => b.size - a.size)) {
    console.error(`    ${img.file}  ${kb(img.size)}KB  （超 ${kb(img.size - MAX_BYTES)}KB）`)
  }
  console.error('\n  调低 optimize-images.py 的 --quality，或减小 --max-edge 后重新生成。')
}

if (wrongFormat.length > 0 || oversized.length > 0) {
  console.error('\n图片预算未通过，构建终止（避免把超标的图上传到线上）。')
  process.exit(1)
}

const total = images.reduce((sum, img) => sum + img.size, 0)
const max = images.reduce((biggest, img) => (img.size > biggest.size ? img : biggest), images[0])
console.log(`✓ 全部为 WebP 且 ≤100KB —— 共 ${kb(total)}KB，最大 ${max.file} ${kb(max.size)}KB`)