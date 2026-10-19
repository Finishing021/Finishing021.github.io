# Finishing 首页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Finishing 个人网站的首页——深色青灰冷调、带分层视差悬浮动效的主视觉、时间轴+卡片翻转的成长档案预览、含中英切换与简历下载的「关于我」。

**Architecture:** Vite + React 18 + TypeScript 单页应用。内容与表现彻底分离：`src/content/site.ts` 是唯一内容入口，组件只消费它。视觉令牌集中在 `src/styles/tokens.css`，所有组件通过 CSS Modules 消费变量。三维星尘层用 `@react-three/fiber` 实现并懒加载，视差由自建 `useParallax` hook 通过 lerp 输出分层偏移。单开卡片状态归属 `Timeline`，`DiaryCard` 保持受控。

**Tech Stack:** Vite 5 · React 18 · TypeScript 5 · Three.js + @react-three/fiber · GSAP · CSS Modules · Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-09-30-finishing-personal-site-design.md`

## Global Constraints

- 深色为唯一主题，不实现亮色模式与主题开关。
- 色值必须取自 spec 第 4.1 节令牌表，组件内不得出现硬编码十六进制色值，一律走 `var(--*)`。
- 中文标题不加载 webfont，使用系统宋体回退栈；拉丁标题 webfont 必须异步加载并具备系统衬线回退。
- 所有动效必须尊重 `prefers-reduced-motion: reduce`。
- `Starfield` 必须经 `React.lazy` 动态加载，不得进入首屏关键路径。
- 装饰性 WebGL Canvas 必须 `aria-hidden="true"`。
- 同时只允许一张日记卡展开；`Escape` 必须复位。
- 语言切换仅作用于「关于我」区块与导航标签，Hero 与档案文案保持中文。
- 不使用 Tailwind，不引入 i18next。
- 文案中不得出现 emoji。

## Review Focus

- **WebGL 不可用时**：浏览器禁用 WebGL 或 `canvas.getContext('webgl')` 返回 null 时，页面其余部分必须照常渲染与交互，仅星尘层缺失——需捕获 Canvas 初始化异常并回退为纯色背景。
- **极窄视口（320px 宽）**：主标题与时间轴不得横向溢出或产生横向滚动条。
- **打开无手稿图片的日记条目**：`image` 指向的文件缺失时，卡片背面应呈现占位底而非塌陷的空白区域。
- **剪贴板 API 被拒绝**：`navigator.clipboard.writeText` 在非 HTTPS 或用户拒绝时抛错，联系方式复制失败需给出「复制失败，请手动选择」的可读反馈，不得静默失败。
- **长内容**：`excerpt` 与 `body` 远超预期长度时，卡片正反面高度需保持稳定，翻转不导致时间轴跳动。

---

### Task 1: 项目脚手架与设计令牌

**Files:**
- Create: `package.json` `vite.config.ts` `tsconfig.json` `tsconfig.node.json` `index.html` `src/main.tsx` `src/App.tsx` `src/styles/tokens.css` `src/styles/global.css` `src/setupTests.ts` `public/favicon.svg`

**Interfaces:**
- Consumes: 无
- Produces: 可运行的 Vite dev server；`tokens.css` 暴露 spec 4.1/4.2/4.3 全部 CSS 变量；`vite.config.ts` 内含 Vitest `test` 配置（`environment: 'jsdom'`、`setupFiles: './src/setupTests.ts'`）

- [ ] **Step 1: 写 `package.json`**

scripts：`dev` / `build`（`tsc -b && vite build`）/ `preview` / `test`（`vitest run`）/ `test:watch`。
依赖用 `npm install` 实际解析并写入，不手写版本号。

- [ ] **Step 2: 安装依赖并确认装到的版本**

```bash
npm install react react-dom three @react-three/fiber gsap
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/three vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```
记录 `react` 与 `@react-three/fiber` 的主版本号——Task 5 的 Canvas API 写法取决于此。

- [ ] **Step 3: 写配置与入口**

`vite.config.ts`（含 react 插件与 test 配置）、两份 tsconfig、`index.html`（`lang="zh-CN"`、异步加载拉丁衬线 webfont 并带系统衬线回退）、`src/main.tsx`、`src/setupTests.ts`（引入 `@testing-library/jest-dom`）。

- [ ] **Step 4: 写 `tokens.css` 与 `global.css`**

`tokens.css` 逐条落地 spec 4.1 色板、4.2 字体栈、4.3 间距/圆角/缓动/时长。`global.css` 写 reset、`color-scheme: dark`、选区样式、细滚动条、`.sr-only`、`@media (prefers-reduced-motion: reduce)` 全局动画归零。

- [ ] **Step 5: 验证构建与 dev server**

```bash
npx tsc -b && npx vite build
npm run dev
```
Expected: 构建成功无 TS 报错；dev server 打印本地地址；浏览器打开可见深色底页面。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold vite + react + ts project with design tokens"
```

---

### Task 2: 内容配置、字典与语言状态

**Files:**
- Create: `src/content/site.ts` `src/i18n/dict.ts` `src/i18n/useLang.ts` `src/test/site.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `type ContactType = 'wechat' | 'qq'`
  - `interface Contact { type: ContactType; label: string; value: string }`
  - `interface DiaryEntry { id: string; date: string; year: number; title: string; excerpt: string; body: string; image: string; tags: string[] }`
  - `interface AboutInfo { school: string; major: string; grade: string; bio: string }`
  - `nav: { label: string; href: string }[]`、`hero: { title: string; subtitle: string; scrollHint: string }`、`diary: DiaryEntry[]`、`about: AboutInfo`、`contacts: Contact[]`、`resumeUrl: string`
  - `type Lang = 'zh' | 'en'`
  - `aboutDict: Record<Lang, { heading: string; contactLabel: string; copyHint: string; copied: string; copyFailed: string; downloadResume: string; resumeMeta: string }>`
  - `LangProvider({ children }): JSX.Element`、`useLang(): { lang: Lang; toggle: () => void }`

- [ ] **Step 1: 写失败测试 `src/test/site.test.ts`**

断言：`diary` 非空；每条含非空 `id`/`date`/`title`/`image`/`body`；`id` 唯一；数组按 `date` 降序；`contacts` 至少含一条 `wechat`；`resumeUrl` 以 `/` 开头。

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/test/site.test.ts`
Expected: FAIL — 找不到模块 `../content/site`

- [ ] **Step 3: 实现 `site.ts`**

填 3 条日记（日期分散在 2025-2026，`image` 指向 `/diary/handwriting-0X.svg`）、扬州大学车辆工程大一新生的 `about`、微信与 QQ 占位联系方式（值为 `PLACEHOLDER_WECHAT` / `PLACEHOLDER_QQ`，并加注释提示站主替换）、`resumeUrl: '/resume.pdf'`。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/test/site.test.ts`
Expected: PASS

- [ ] **Step 5: 实现 `dict.ts` 与 `useLang.ts`**

`useLang.ts` 用 React context 持有 `lang`，`toggle` 在 `zh` / `en` 间切换；在 provider 缺失时抛出明确错误信息。

- [ ] **Step 6: 生成占位素材**

写 3 个 `/diary/handwriting-0X.svg`（浅纸色纸面、横格线、日期水印、不写具体文字内容）与一个最小合法 `/resume.pdf`。

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add site content config, about i18n dict and lang context"
```

---

### Task 3: Nav 与语言切换

**Files:**
- Create: `src/components/Nav/Nav.tsx` `src/components/Nav/Nav.module.css` `src/components/Nav/LangToggle.tsx` `src/test/LangToggle.test.tsx`

**Interfaces:**
- Consumes: `useLang()`、`aboutDict`、`nav`（来自 Task 2）
- Produces: `Nav({ }): JSX.Element`；`LangToggle({ }): JSX.Element` — 语言按钮 `aria-label` 固定为 `切换语言 / Switch language`，点击时先 `toggle()` 再 `document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`

- [ ] **Step 1: 写失败测试 `src/test/LangToggle.test.tsx`**

用 `vi.stubGlobal` 给 `Element.prototype.scrollIntoView` 装 spy。渲染 `<LangProvider><Nav /><About /></LangProvider>`（About 在 Task 7 完成，此处先渲染一个读取 `aboutDict` 的 `<h2 data-testid="about-heading">`）。

断言：初始 `about-heading` 文本为中文；点击语言按钮后变为英文；`scrollIntoView` 被调用一次且参数含 `behavior: 'smooth'`；再点一次变回中文。

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/test/LangToggle.test.tsx`
Expected: FAIL — 找不到 `../components/Nav/Nav`

- [ ] **Step 3: 实现 `LangToggle.tsx` 与 `Nav.tsx`**

`LangToggle` 渲染按钮，文案为另一语言的短标签（当前中文时显示 `EN`，反之显示 `中`），带 `aria-pressed`。`Nav` 为 `position: fixed` 顶部条，左侧 `Finishing` 字标（点击滚回顶部），右侧 `nav` 锚点与 `LangToggle`；滚动超过 80px 后加半透明背景与下边框。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/test/LangToggle.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add fixed nav bar with about-scoped language toggle"
```

---

### Task 4: 视差 hook 与 Hero 主视觉

**Files:**
- Create: `src/hooks/usePrefersReducedMotion.ts` `src/hooks/useParallax.ts` `src/components/Hero/Hero.tsx` `src/components/Hero/Hero.module.css` `src/components/Hero/HeroTitle.tsx`

**Interfaces:**
- Consumes: `hero`（Task 2）
- Produces:
  - `usePrefersReducedMotion(): boolean`
  - `useParallax(layers: number[]): { ref: RefObject<HTMLDivElement>; offsets: { x: number; y: number }[] }` — `layers` 为各层视差系数数组，输出数组与之等长；lerp 系数 `0.08`；`reduce motion` 时恒返回全零并跳过事件监听
  - `HeroTitle({ text, ghostOffsets }: { text: string; ghostOffsets: [number, number][] }): JSX.Element`
  - `Hero({ }): JSX.Element` — `section#hero`

- [ ] **Step 1: 实现 `usePrefersReducedMotion`**

`window.matchMedia('(prefers-reduced-motion: reduce)')`，订阅 `change` 事件，卸载时移除监听。

- [ ] **Step 2: 实现 `useParallax`**

`mousemove` 把指针归一化到 `[-1, 1]`；`requestAnimationFrame` 循环内对每层做 `current += (target - current) * 0.08`；返回 `translate` 用的 `{x, y}`（各层系数乘以基础位移量 `±14px`）。`reduce motion` 时不注册任何监听。

- [ ] **Step 3: 实现 `HeroTitle` 与 `Hero`**

四层结构（L0 星尘挂载点、L1 重影、L2 主标题、L3 细线+副标题+滚动提示）。主标题用 `aria-label` 保证可读，重影副本 `aria-hidden="true"`。

- [ ] **Step 4: 加 GSAP 入场时间轴**

在 `Hero` 的 `useLayoutEffect` 中构建时间轴：标题自下而上浮现并伴随 `filter: blur` 由 `8px` 收敛到 `0`；分割线 `scaleX` 从 0 展开；副标题与滚动提示延后淡入。`reduce motion` 时直接设置终态、不播放。

- [ ] **Step 5: 验证**

Run: `npm run dev`
Expected: 打开首页看到主标题分层重影与入场动画；移动鼠标时各层以不同速度位移；系统开启「减少动态效果」后刷新页面，无动画且鼠标移动不产生位移。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add hero with layered parallax title and gsap entrance"
```

---

### Task 5: WebGL 星尘粒子层

**Files:**
- Create: `src/components/Hero/Starfield.tsx` `src/test/Starfield.test.tsx`
- Modify: `src/components/Hero/Hero.tsx`（把 L0 挂载点替换为 `Suspense + lazy(Starfield)`）

**Interfaces:**
- Consumes: `usePrefersReducedMotion()`（Task 4）
- Produces: `Starfield({ count }: { count?: number }): JSX.Element` — 默认 `count` 桌面 900 / 窄屏（`innerWidth < 768`）450

- [ ] **Step 1: 写失败测试 `src/test/Starfield.test.tsx`**

断言两点：`reduce motion` 为真时组件渲染 `null`；WebGL context 获取抛错时组件渲染 `null` 而非向上抛异常（用 `vi.spyOn(HTMLCanvasElement.prototype, 'getContext')` 返回 `null` 模拟）。

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/test/Starfield.test.tsx`
Expected: FAIL — 找不到 `../components/Hero/Starfield`

- [ ] **Step 3: 实现 `Starfield.tsx`**

用 `@react-three/fiber` 的 `Canvas`（`dpr={[1, 2]}`、`gl={{ antialias: false }}`）承载一个 `Points`：随机分布在扁平盒体内的位置，材质 `size` 约 `0.018`、`color` 取 `#9DBFD8`、`transparent`、`opacity` 约 `0.55`。`useFrame` 中让整组极缓慢绕 Y 轴旋转（约 `0.02 rad/s`），并按 Task 4 的 `useParallax` 输出反向微位移形成纵深。Canvas 加 `aria-hidden="true"`。

- [ ] **Step 4: 在 `Hero` 中懒加载挂载**

`const Starfield = lazy(() => import('./Starfield'))`，外层 `Suspense fallback={null}`。确认 `npm run build` 后产物中 three 相关代码位于独立 chunk。

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run src/test/Starfield.test.tsx && npm run build`
Expected: 测试 PASS；构建成功；`dist/assets` 中出现独立的三维相关 chunk

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add lazily loaded webgl starfield layer with webgl fallback"
```

---

### Task 6: 成长档案时间轴与卡片翻转

**Files:**
- Create: `src/components/Archive/Timeline.tsx` `src/components/Archive/Timeline.module.css` `src/components/Archive/DiaryCard.tsx` `src/components/Archive/DiaryCard.module.css` `src/components/Archive/ArchivePreview.tsx` `src/test/DiaryCard.test.tsx` `src/test/Timeline.test.tsx`

**Interfaces:**
- Consumes: `diary: DiaryEntry[]`（Task 2）
- Produces:
  - `DiaryCard({ entry, isFlipped, onFlip, index }): JSX.Element` — 受控；正面触发元素为 `button`，带 `aria-expanded={isFlipped}` 与 `aria-controls`
  - `Timeline({ entries }: { entries: DiaryEntry[] }): JSX.Element` — 内部持有 `openId: string | null`，点新卡时旧卡自动复位
  - `ArchivePreview({ }): JSX.Element` — 取 `diary.slice(0, 3)` 交给 `Timeline`，底部给「查看全部」锚点

- [ ] **Step 1: 写失败测试 `src/test/Timeline.test.tsx`**

断言：初始所有卡片 `aria-expanded` 为 `false`；点击第一张后为 `true`；点击第二张后第一张变回 `false` 且第二张为 `true`；在展开状态按下 `Escape` 后全部为 `false`。

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/test/Timeline.test.tsx`
Expected: FAIL — 找不到 `../components/Archive/Timeline`

- [ ] **Step 3: 实现 `DiaryCard.tsx`**

3D 翻转：外层 `perspective: 1200px`，内层 `transform-style: preserve-3d` + `transform: rotateY(180deg)`（由 `isFlipped` 决定），正反面 `backface-visibility: hidden`，背面初始 `rotateY(180deg)`；过渡时长用 `--dur-flip`。背面图片缺失时以 `--bg-elevated` 填充固定宽高比容器（对应 Review Focus 第 3 条）。正反面内容区设 `overflow: hidden` 与行数截断，保证长内容下高度稳定（对应第 5 条）。

- [ ] **Step 4: 实现 `Timeline.tsx`**

左侧年份刻度：按 `year` 分组，渲染竖线与节点；右侧卡片列。容器挂 `onKeyDown` 监听 `Escape` 复位。加 `article` / `time` 语义标签。

- [ ] **Step 5: 实现 `ArchivePreview.tsx` 并接入 `App.tsx`**

区块标题 + `Timeline` + 「查看全部」链接（`href="#archive"`，本期为锚点占位）。

- [ ] **Step 6: 运行测试确认通过**

Run: `npx vitest run src/test/Timeline.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add archive timeline with single-open 3d flipping diary cards"
```

---

### Task 7: 关于我（双语 + 联系方式 + 简历下载）

**Files:**
- Create: `src/components/About/About.tsx` `src/components/About/About.module.css`
- Modify: `src/test/LangToggle.test.tsx`（把 Task 3 的临时标题替换为真实 `<About />`）

**Interfaces:**
- Consumes: `about`、`contacts`、`resumeUrl`（Task 2）；`useLang()`、`aboutDict`（Task 2）
- Produces: `About({ }): JSX.Element` — `section#about`

- [ ] **Step 1: 实现 `About.tsx`**

两栏：左栏 `about.bio` 与学校/专业/年级信息；右栏联系方式列表与简历下载。区块标题读取 `aboutDict[lang].heading`，并用 `data-testid="about-heading"` 供测试定位。

- [ ] **Step 2: 实现联系方式复制**

点击联系人调用 `navigator.clipboard.writeText(value)`；成功后在按钮上显示 `copied` 文案并 1.8 秒后复原；`catch` 分支显示 `copyFailed` 文案（对应 Review Focus 第 4 条），不得静默失败。

- [ ] **Step 3: 实现简历下载**

`<a href={resumeUrl} download>`，文案取 `aboutDict[lang].downloadResume`，旁边以小字显示格式与大小提示 `resumeMeta`。

- [ ] **Step 4: 更新 `LangToggle.test.tsx` 使用真实 `About`**

Run: `npx vitest run src/test/LangToggle.test.tsx`
Expected: PASS — 点击语言按钮后 `about-heading` 文本在中文与英文之间切换

- [ ] **Step 5: 加窄视口规则**

`@media (max-width: 480px)` 下两栏塌为单栏，主标题字号用 `clamp()` 收敛，确保 320px 宽无横向滚动（对应 Review Focus 第 2 条）。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add about section with bilingual copy, contact copy and resume download"
```

---

### Task 8: Footer、全量校验与交付

**Files:**
- Create: `src/components/Footer/Footer.tsx` `src/components/Footer/Footer.module.css`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: 全部前置任务
- Produces: 完整首页

- [ ] **Step 1: 实现 `Footer.tsx` 并接入 `App.tsx`**

版权行、站点标语、回顶部链接。`App.tsx` 用 `LangProvider` 包裹，并把 `Nav` / `Hero` / `ArchivePreview` / `About` / `Footer` 按序组合进 `main`。

- [ ] **Step 2: 跑全部测试**

Run: `npm test`
Expected: 三个测试文件全部 PASS

- [ ] **Step 3: 类型检查与构建**

Run: `npx tsc -b && npm run build`
Expected: 无 TS 报错，构建成功

- [ ] **Step 4: 质量校验**

Run: `npx vite preview`
在浏览器中逐条确认：320px 窄视口无横向滚动；禁用 WebGL（`chrome://flags` 或 devtools 覆盖 `getContext`）后页面其余部分正常；系统开启「减少动态效果」后无动画与视差；键盘 `Tab` 能遍历导航、语言按钮、档案卡、联系方式与下载按钮且聚焦环可见。

- [ ] **Step 5: 复核性能预算**

确认首屏关键 JS（gzip）≤ 180 KB，三维相关代码在独立 chunk 中。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: complete home page with footer and cross-cutting polish"
```

- [ ] **Step 7: 发布上线**

经用户确认后发布为可访问的在线链接，并在回复中给出分享地址。
