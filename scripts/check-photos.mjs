/**
 * 核对摄影墙的素材是否对得上：清单指向的图在不在、每张全尺寸图有没有配缩略图、
 * 有没有新照片忘了跑 build、文件名起得太敷衍。
 *
 * 和 check-diary.mjs 一样刻意做成脚本而不是测试：照片是逐步补进去的，
 * 做成测试会让 npm test 在内容填充期间一直红着。
 *
 * 用 Vite 的 ssrLoadModule 直接读清单，而不是正则抠字符串 ——
 * 拿到的就是真正的数据结构，清单怎么改格式都不影响。
 *
 * 退出码：报错（缺文件、同名冲突）为 1，警告（日期兜底、alt 敷衍）不阻断。
 * 这样它既能进 CI，也能当日常顺手一跑的工具。
 *
 * 用法：npm run photos:check
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = join(root, 'assets-source', 'photos')
const outputDir = join(root, 'public', 'photos')
const manifestFile = join(root, 'src', 'content', 'photos.generated.ts')

const errors = []
const warnings = []

if (!existsSync(manifestFile)) {
  console.error('还没生成过清单（src/content/photos.generated.ts 不存在）')
  console.error('先跑一次：npm run photos:build')
  process.exit(1)
}

let photos
try {
  const server = await createServer({
    root,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  })
  try {
    const mod = await server.ssrLoadModule('/src/content/photos.generated.ts')
    photos = mod.photos
  } finally {
    await server.close()
  }
} catch (error) {
  console.error('清单读不出来，检查文件是否被改坏：')
  console.error(`  ${error.message}`)
  process.exit(1)
}

if (!Array.isArray(photos)) {
  console.error('清单里没有导出 photos 数组，检查生成结果')
  process.exit(1)
}

const listDir = (dir) =>
  existsSync(dir)
    ? readdirSync(dir).filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    : []

const listSourceFiles = (dir) =>
  existsSync(dir)
    ? readdirSync(dir).filter(
        (name) =>
          /\.(jpe?g|png|webp)$/i.test(name) && !name.startsWith('.') && !name.startsWith('_'),
      )
    : []

// ---- 1. 清单里每条指向的文件真实存在
const missingFiles = []
for (const photo of photos) {
  for (const key of ['src', 'thumb']) {
    const relative = String(photo[key] ?? '').replace(/^\//, '')
    if (!existsSync(join(root, 'public', relative))) {
      missingFiles.push(`${photo.file} → ${photo[key]}`)
    }
  }
}
if (missingFiles.length > 0) {
  errors.push(
    `清单里有 ${missingFiles.length} 个路径指向不存在的文件：\n` +
      missingFiles.map((line) => `     ${line}`).join('\n'),
  )
}

// ---- 2. 每张全尺寸图都要有配对的缩略图
const onDisk = new Set(listDir(outputDir))
const fullImages = [...onDisk].filter((name) => !/_thumb\.(jpe?g|webp)$/i.test(name))
const orphanFull = fullImages.filter((name) => {
  const stem = name.replace(/\.(jpe?g|webp)$/i, '')
  return !onDisk.has(`${stem}_thumb.webp`) && !onDisk.has(`${stem}_thumb.jpg`)
})
if (orphanFull.length > 0) {
  errors.push(
    `${orphanFull.length} 张全尺寸图没有配对的缩略图（网格会退回加载大图）：\n` +
      orphanFull.map((name) => `     ${name}`).join('\n'),
  )
}

// ---- 3. 源目录同名不同扩展名
const sourceFiles = listSourceFiles(sourceDir)
const byStem = new Map()
for (const name of sourceFiles) {
  const stem = name.replace(/\.[^.]+$/, '')
  byStem.set(stem, [...(byStem.get(stem) ?? []), name])
}
const collisions = [...byStem.entries()].filter(([, names]) => names.length > 1)
if (collisions.length > 0) {
  errors.push(
    `源目录有 ${collisions.length} 组同名不同扩展名的文件（会互相覆盖）：\n` +
      collisions.map(([stem, names]) => `     ${stem}: ${names.join(', ')}`).join('\n'),
  )
}

// ---- 4. 源目录有新图没跑 build
const manifestNames = new Set(photos.map((photo) => String(photo.file)))
const notInManifest = sourceFiles.filter((name) => !manifestNames.has(name))
if (notInManifest.length > 0) {
  warnings.push(
    `源目录有 ${notInManifest.length} 张图还没进清单（忘了跑 npm run photos:build？）：\n` +
      notInManifest.map((name) => `     ${name}`).join('\n'),
  )
}

// ---- 5. 日期靠 mtime 兜底
const mtimeBased = photos.filter((photo) => photo.dateSource === 'mtime')
if (mtimeBased.length > 0) {
  warnings.push(
    `${mtimeBased.length} 张图的日期靠文件修改时间兜底（拷贝就会失真）：\n` +
      mtimeBased.map((photo) => `     ${photo.file}`).join('\n') +
      '\n     建议改成 YYYY-MM-DD_描述.jpg 明确日期。',
  )
}

// ---- 6. alt 太敷衍
const genericAlt = photos.filter((photo) => photo.alt === '摄影作品')
if (genericAlt.length > 0) {
  warnings.push(
    `${genericAlt.length} 张图的 alt 退化为「摄影作品」，读屏用户听不出内容：\n` +
      genericAlt.map((photo) => `     ${photo.file}`).join('\n') +
      '\n     改成有意义的英文短词，或在 assets-source/photos/alt.json 里补中文描述。',
  )
}

// ---- 7. alt.json 里的残留键
const altFile = join(sourceDir, 'alt.json')
if (existsSync(altFile)) {
  try {
    const overrides = JSON.parse(readFileSync(altFile, 'utf-8'))
    const stale = Object.keys(overrides).filter((key) => !sourceFiles.includes(key))
    if (stale.length > 0) {
      warnings.push(
        `alt.json 里有 ${stale.length} 条对应不上任何源文件（改名后残留？）：\n` +
          stale.map((key) => `     ${key}`).join('\n'),
      )
    }
  } catch {
    warnings.push('alt.json 不是合法 JSON，会被构建忽略。')
  }
}

// ---- 输出
const total = photos.length
const newest = photos[0]?.date ?? '—'
const oldest = photos[total - 1]?.date ?? '—'
const bytes = photos.reduce((sum, photo) => {
  const relative = String(photo.thumb ?? '').replace(/^\//, '')
  const path = join(root, 'public', relative)
  try {
    return sum + statSync(path).size
  } catch {
    return sum
  }
}, 0)

const humanSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

console.log(
  `摄影墙共 ${total} 张照片，时间跨度 ${oldest} ~ ${newest}，缩略图合计 ${humanSize(bytes)}\n`,
)

for (const warning of warnings) console.log(`⚠️  ${warning}\n`)
for (const error of errors) console.log(`❌ ${error}\n`)

if (errors.length === 0 && warnings.length === 0) {
  console.log('全部对得上，没有需要处理的。')
}

process.exit(errors.length > 0 ? 1 : 0)
