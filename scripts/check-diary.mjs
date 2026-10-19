/**
 * 核对成长档案的图片是否对得上：哪些条目缺图、哪些图没被任何条目引用。
 *
 * 刻意做成脚本而不是测试：照片是逐步补进去的，做成测试会让 npm test
 * 在内容填充期间一直红着。等照片全了可以再考虑提升成测试。
 *
 * 用 Vite 的 ssrLoadModule 直接读 site.ts，而不是正则抠字符串 ——
 * 这样拿到的就是真正的数据结构，site.ts 怎么改格式都不影响。
 *
 * 用法：npm run diary:check
 */
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const server = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})

let diary
try {
  const site = await server.ssrLoadModule('/src/content/site.ts')
  diary = site.diary
} finally {
  await server.close()
}

if (!Array.isArray(diary)) {
  console.error('没能从 site.ts 读到 diary 数组，检查导出是否被改过')
  process.exit(1)
}

const diaryDir = join(root, 'public', 'diary')
const onDisk = new Set(
  existsSync(diaryDir)
    ? readdirSync(diaryDir).filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    : [],
)

/** 每条主题引用的图片（数据结构是 images: string[]，不是单张 image） */
const referenced = new Set()
const missing = []

for (const entry of diary) {
  const images = Array.isArray(entry.images) ? entry.images : []
  if (images.length === 0) {
    missing.push({ entry, image: '(该主题没有配任何图片)' })
    continue
  }
  for (const image of images) {
    const name = String(image).replace(/^\//, '').replace(/^diary\//, '')
    referenced.add(name)
    if (!existsSync(join(root, 'public', String(image).replace(/^\//, '')))) {
      missing.push({ entry, image })
    }
  }
}

const unused = [...onDisk].filter((name) => !referenced.has(name))
const totalImages = diary.reduce(
  (sum, entry) => sum + (Array.isArray(entry.images) ? entry.images.length : 0),
  0,
)

console.log(
  `成长档案共 ${diary.length} 个主题、${totalImages} 张手稿，public/diary/ 下有 ${onDisk.size} 个图片文件\n`,
)

if (missing.length === 0) {
  console.log('全部主题的图片都对得上')
} else {
  console.log(`有 ${missing.length} 处对不上（这些位置会显示「原稿待补」占位面板）：`)
  for (const item of missing) {
    console.log(`  ${item.entry.date}  ${item.entry.title}  →  ${item.image}`)
  }
}

if (unused.length > 0) {
  console.log(`\n有 ${unused.length} 个文件没被任何主题引用：`)
  for (const name of unused) console.log(`  ${name}`)
}

process.exit(missing.length > 0 ? 1 : 0)
