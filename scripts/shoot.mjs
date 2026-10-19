// 通过 CDP 驱动 Edge/Chrome 截图。相比 `--screenshot`，它支持整页截图、
// 视口模拟与 prefers-reduced-motion 模拟，能看到「静态终态」的真实版式。
//
// 用法: node scripts/shoot.mjs <url> <out.png> [width] [height] [viewport|full]
//
// ⚠️ 不要并行跑两个实例。脚本会连到浏览器的**第一个** page target，
// 多开就会抢同一个标签页：一个设 1440、另一个设 390，互相覆盖，结果
// 是「明明传了 390，window.innerWidth 却是 1432」，而且**不报错**，
// 只是静默量错。验收要串行，或在命令里用 for 循环依次跑。
//
// ⚠️ 验收轮播/画廊这类 <img> 时用 `viewport` 模式（可配一个够高的视口，
// 如 1440x1250 把整块内容装下），别用 `full`。captureBeyondViewport 对
// `decoding="async"` 的图会截出空白：几何尺寸和 naturalWidth 都正常，
// 视口截图也正常，唯独整页截图丢图 —— 是截图工具的取巧，不是页面 bug。
//
// ⚠️⚠️ **默认的 prefers-reduced-motion 会把「只在动效下才出现」的 bug 藏起来。**
// 真实教训：灯箱「点开跳回顶部 + 只有灰遮罩 + 图看不见」，默认模式下怎么测都正常，
// 于是连着误诊了好几轮。原因是代码在 reduced 分支里**整个跳过** GSAP 时间轴：
//   if (reduced || !cover) { setCoverMounted(false); return }
// 于是动画留给祖先的内联 `transform` 压根没被写下 —— 而那个 transform 正是根因
// （带 transform 的祖先会抢走 position: fixed 后代的包含块）。
// **凡是怀疑和动画/GSAP/transform 有关的 bug，必须加 MOTION=normal 再测一遍。**
const PORT = Number(process.env.CDP_PORT || 9222)
const [url, out, widthArg, heightArg, modeArg] = process.argv.slice(2)

const width = Number(widthArg || 1440)
const height = Number(heightArg || 900)
const fullPage = modeArg !== 'viewport'

if (!url || !out) {
  console.error('usage: node scripts/shoot.mjs <url> <out.png> [w] [h] [viewport|full]')
  process.exit(1)
}

if (typeof WebSocket === 'undefined') {
  console.error('需要 Node 22+ 的全局 WebSocket')
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function findPageTarget() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const targets = await response.json()
      const page = targets.find((target) => target.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {
      // 调试端口还没起来，稍后重试
    }
    await sleep(250)
  }
  throw new Error('找不到可用的调试目标，检查 Edge 是否带 --remote-debugging-port 启动')
}

const socket = new WebSocket(await findPageTarget())
const pending = new Map()
let nextId = 1

function send(method, params = {}) {
  const id = nextId++
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error(`${method} 超时`))
      }
    }, 30000)
  })
}

const loaded = new Promise((resolve) => {
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { resolve: ok, reject: fail } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) fail(new Error(JSON.stringify(message.error)))
      else ok(message.result)
      return
    }
    if (message.method === 'Page.loadEventFired') resolve()
  })
})

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve)
  socket.addEventListener('error', reject)
})

await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 600,
})
// 默认模拟 prefers-reduced-motion，拿到静止终态便于判断版式。
// 要验证真实动效（视差、滚动缩放）时传 MOTION=normal 关掉模拟。
if (process.env.MOTION !== 'normal') {
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
}
await send('Page.navigate', { url })

await Promise.race([loaded, sleep(12000)])
// 给延迟挂载的装饰层与字体留出时间
await sleep(1500)

// 可选：截图前依次点击若干元素（逗号分隔），用于验证多步交互后的状态。
// 例：先点封面进入，再点开某张日记卡
// CLICK_SELECTOR='[data-enter="cta"],[data-testid="diary-toggle-x"]'
const clickSelector = process.env.CLICK_SELECTOR
if (clickSelector) {
  await send('Runtime.enable')
  for (const selector of clickSelector.split(',')) {
    const trimmed = selector.trim()
    if (!trimmed) continue
    await send('Runtime.evaluate', {
      expression: `document.querySelector(${JSON.stringify(trimmed)})?.click()`,
    })
    await sleep(1400)
  }
}

// 可选：把目标元素滚进视口再截图。必须放在点击之后 ——
// 封面还在时页面滚动是锁住的，先滚等于白滚。
// 这一步对带 loading="lazy" 的图片也是必须的：整页截图不会真的滚动，
// 浏览器不会触发视口外的懒加载，截出来是一片空白，很容易误判成 bug。
const scrollTo = process.env.SCROLL_TO
if (scrollTo) {
  await send('Runtime.enable')
  await send('Runtime.evaluate', {
    expression: `document.querySelector(${JSON.stringify(scrollTo)})?.scrollIntoView({ block: 'center' })`,
  })
  await sleep(1600)
}

// 可选：把真鼠标移到某个元素上再截图。
// CSS :hover 无法用 JS 事件触发，只能派发真实的 mouseMoved —— 想验证悬停态
// （放大、掠光、光晕）必须走这一步，否则截图里永远是未悬停的样子。
//
// 必须排在 CLICK / SCROLL_TO 之后：改动前它跑在最前面，于是「先点进封面
// 再悬停卡片」这种组合里，鼠标其实是停在封面上、坐标完全对不上，
// 截出来和未悬停的一模一样 —— 而且不报错，很能骗人。
// 同理，滚动会挪动元素，所以也要排在 SCROLL_TO 后面按最终坐标算。
//
// 另外注意：默认模拟的 prefers-reduced-motion 会关掉这些位移，
// 想看到浮起效果得同时传 MOTION=normal。
const hoverSelector = process.env.HOVER
if (hoverSelector) {
  const { result } = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector(${JSON.stringify(hoverSelector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`,
    returnByValue: true,
  })
  const point = result?.value
  if (point) {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: point.x,
      y: point.y,
      buttons: 0,
    })
    await sleep(1000)
  }
}

// 可选：只求值并打印结果（用于程序化验收，如检查横向溢出）
const evalExpr = process.env.EVAL_EXPR
if (evalExpr) {
  await send('Runtime.enable')
  const { result } = await send('Runtime.evaluate', {
    expression: evalExpr,
    returnByValue: true,
    awaitPromise: true,
  })
  console.log(JSON.stringify(result.value, null, 2))
  socket.close()
  process.exit(0)
}

const { data } = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: fullPage,
})

const { writeFileSync } = await import('node:fs')
writeFileSync(out, Buffer.from(data, 'base64'))
console.log(`wrote ${out} (${width}x${height}${fullPage ? ', full page' : ''})`)

socket.close()
process.exit(0)
