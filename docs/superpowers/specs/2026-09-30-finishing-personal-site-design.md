# Finishing 个人网站 — 设计文档

日期：2026-09-30
状态：已获用户确认（2026-09-30）
范围：站点整体架构设计 + 首页（Home）基础实现

---

## 变更记录

### 2026-10-01 第 7 版：滚动进场 + 悬停质感

- 新增 `ScrollReveal`：所有带 `data-reveal` 的元素在滚动到视口时淡入 + 上浮。
  用 `ScrollTrigger.batch`（同批元素做 stagger），**只在封面退场后挂载**（那时才可滚动），
  减少动态效果时整个跳过，动画结束 `clearProps` 交还给 CSS。
  已挂 `data-reveal`：档案区标题/年份标签/网格卡，关于我区全部区块，页脚。
- 悬停质感：导航字标/链接/语言切换、日记卡片（浮起 + 放大 + 冷调光晕 + 斜向掠光）。
- **卡片加 `overflow: hidden` 与 `position: relative`**，掠光靠 `::after` 斜向渐变扫过。
- 页脚「回到顶部」的 `#hero` 是个坏链（封面早已改名），改为 `#main`。
- jsdom 缺 `window.matchMedia`，导致 ScrollTrigger 在模块加载阶段崩掉整份测试套件；
  已在 `setupTests.ts` 补兜底实现。

### 2026-10-01 第 6 版：档案区改为网格 + 灯箱

- 档案区由「年份刻度 + 竖排大卡 + 原地翻转」改为**「年份分组 + 缩略图网格」+ 全屏灯箱**。
  年份仍作为分组标题保留，时间顺序不丢。
- 卡片只放缩略图与主题名，尺寸缩到约 217px 宽：桌面一行 5 张、平板 3 张、手机 2 张。
- **缩略图 `max-height: 250px`**，元素尺寸贴合照片自身（`width/height: auto + max-*`）
  而非固定盒子 + `contain` 撑满 —— 灯箱的 FLIP 入场需要缩略图真实的可视边界。
  `object-fit: contain` 保留作保底。
- 卡片外观：白卡纸（白底 + 内白边 + 细描边 + 轻阴影），照片自身再带一层淡投影。
  悬停反馈：`translateY(-6px) scale(1.03)` + 阴影加深。
- 灯箱：深蓝黑蒙版 `rgba(16,27,41,0.86)` + 背景模糊；大图 `max-width: 80vw` / `max-height: 80vh`
  + `contain`；入场用 **GSAP FLIP 从缩略图推近**；关闭支持按钮 / 遮罩 / `Esc`；
  多张时左右按钮与方向键翻页，并预加载同主题其它照片。
- 移除 `DiaryEntry.aspect`；Escape 的处理由 `Timeline` 移入灯箱自身（只剩一层）。
- 卡片上的 `data-thumb` 是灯箱 FLIP 的契约，有测试守护。

### 2026-10-01 第 5 版：成长档案改为「主题制」

- 数据模型改为「一个主题 = 一个时间轴节点 = 多条 `images`」，第一张作卡片正面缩略图。
- 新增 `aspect` 字段（卡片宽高比 = 宽/高），**跟着照片本身的形状走**而非统一 3:4：
  竖版手稿约 0.71~0.74，横版的主题 2 是 1.33、主题 5（黄色卡片）是 1.96。
- 时间轴每一行改为「年份刻度 → 卡片 → 右侧文字栏（日期 / 摘要 / 标签）」。
- 卡片正面：缩略图 `cover` 铺满 + 底部渐变上的主题名 + 张数角标；
  卡片背面：大图 `contain` + 翻页（按钮与左右方向键）+ 查看原图 / 收起。
- 原图弹层支持同主题内翻页，页码状态由 `Timeline` 统一持有，卡片与弹层共用。
- `ArchivePreview` 不再截断，渲染全部主题。
- 所有叠在照片上的控件改为**自带深色底**，不再依赖渐变遮罩保证可读性。

### 2026-09-30 第 4 版：填入真实内容

- 成长档案扩到 10 条，图片统一为 `/diary/diary_01.jpg` ~ `/diary/diary_10.jpg`。
  **编号 01 对应最新一篇**，页面顺序与文件编号顺序一致。
- 新增内容工作流：原图放 `assets-source/diary/`，`npm run diary:build` 压到 `public/diary/`，
  `npm run diary:check` 核对缺图。见 `scripts/optimize-diary.py` 与 `scripts/check-diary.mjs`。
- **日记卡片结构调整**：整张卡不再是一个大 `<button>`（背面需要「查看原图」「收起」两个按钮，
  HTML 不允许按钮嵌套）。改为正面铺满一层透明触发按钮 + 背面自己的操作区。
- **背面手稿图由 `object-fit: cover` 改为 `contain`**：cover 会裁掉文档边缘，切掉的正好是字。
- 新增 `DiaryLightbox` 原图弹层。卡片高度固定（翻转动画要求）导致手稿在卡内只能显示约
  255×340，手写字读不清，放大必须靠弹层。Escape 的优先级（先关弹层再收卡片）在 `Timeline` 里统一处理。
- 手稿图缺失时降级为「原稿待补」占位面板，不是破图、也不塌高度。
- 联系方式换成真实值；简历下载链接指向 `/resume.pdf`。

### 2026-09-30 第 3 版：首屏改为独立封面页（**当前生效**）

- 首屏从「页面第一屏」改为 `position: fixed` 的**独立全屏封面引导层**，点击「点击进入」
  后播放「封面淡出上移 + 主内容淡入上浮」过渡，播完才卸载封面。进入逻辑在 `src/App.tsx`。
- 背景模糊由「重度预烘」改为 **CSS `filter: blur(6px)`**：预烘的模糊量会随视口缩放失真，
  且站主明确要求「轻微模糊，能看清头像轮廓」。模糊半径写在 `site.ts` 的 `coverBackdrop.blur`。
- 背景资源改为 `public/hero/avatar.webp`（864px / q78 / 60 KB），不再预烘模糊。
- 拉丁展示字体由 Playfair Display 换成 **Cormorant Garamond**，字距由 −0.015em 拉开到 0.04em。
- 新增 `--text-on-photo` / `--text-on-photo-soft` 两个令牌，供叠在照片上的文字使用。
- 移除 `useScrollScale`（封面固定不动，无滚动可驱动）与 `src/components/Hero/`。
- 标题层级调整：封面卸载后「成长档案」为页面唯一 h1，年份分组为 h2。

### 2026-09-30 第 2 版：整站改为浅色极简

第 1 版的深色星空方向被站主否决（「太压抑、太宏大」），整站改为**浅色极简**。以本节为准，
下文凡涉及深色主题的描述均已失效：

- **配色**：深色改为米白/浅灰蓝浅色主题。`tokens.css` 全部色值已替换，并新增 `--grid-line` /
  `--grid-frame` / `--shadow-sm` / `--shadow-md`。
- **首屏完全重写**：去掉星尘粒子层；背景改为站主头像经**预模糊**后铺满的色晕（`public/hero/backdrop.webp`，
  480px、约 3 KB）；其上叠米白罩层与极细白色网格 + 取景框；排版为「上小字 / 大标题 / 下小字」三行。
- **动效**：鼠标视差改为「取景框 0.14 / 网格 0.30 / 文字 0.62」三层；新增滚动驱动的背景缩放
  （`useScrollScale`，1 → 1.14 并伴随 2% 漂移）。
- **移除**：`Starfield.tsx`、`lib/webgl.ts`、`useDeferredMount.ts`，以及 `three` / `@react-three/fiber`
  / `@types/three` 三个依赖。总 JS 从约 347 KB gzip 降至约 104 KB gzip。
- **字体**：Playfair Display 取代 Instrument Serif，改用 `@fontsource/playfair-display`（仅 latin-400 子集）
  自托管，不再依赖 Google Fonts。
- **不再有「向下滚动」提示**：首屏只保留规格要求的三行文字。

---

## 1. 目的与成功标准

**目的**：为一位扬州大学车辆工程专业大一新生建一个个人网站，用来长期存放自己的成长痕迹——日记手稿、阶段记录——并对外呈现一个可被访问的个人名片。

**使用者**：站主本人（长期更新内容）与其同学、老师、潜在合作方（浏览访问）。

**成功标准**：

1. 首页首屏在视觉上达到「文艺、清爽、深色为主」的调性，主标题具备 Awwwards 风格的悬浮动效。
2. 成长档案可用「时间轴 + 卡片翻转」两种方式浏览，手稿照片是视觉主角。
3. 「关于我」能一键切换中英双语，能直接下载简历 PDF。
4. 站主改内容（新增日记、换联系方式、换简历）时只需要改一个配置文件和往文件夹里丢素材，不需要碰组件代码。
5. 首页 Lighthouse 性能分 ≥ 90，移动端可用。

---

## 2. 技术选型与理由

| 项 | 选择 | 理由 |
|---|---|---|
| 构建 | Vite | 冷启动快，静态站点构建产物小 |
| 框架 | React 18 + TypeScript | 组件化便于后续扩展档案/关于我等区块；类型约束内容配置 |
| 3D | Three.js + `@react-three/fiber` | 用 JSX 声明式写三维场景，比裸 Three 好维护 |
| 动效 | GSAP + ScrollTrigger | 入场时间轴与滚动驱动动画的成熟方案 |
| 样式 | 原生 CSS Modules + CSS 变量主题层 | 本站质感来自字体、字距与留白，手写 CSS 对细节控制力更强；不必多一层 Tailwind 构建配置 |
| 测试 | Vitest + React Testing Library | 与 Vite 同生态，零额外配置负担 |
| 国际化 | 自建轻量字典对象 | 仅「关于我」一个区块需要双语，引入 i18next 属于过度设计（YAGNI） |

**明确不做（YAGNI）**：不做后端、不做 CMS、不做评论、不做多语言全站化、不做暗色/亮色主题切换开关（深色即为唯一主题）。

---

## 3. 工程目录结构

```
finishing/
  index.html
  package.json
  vite.config.ts            同时承载 Vitest 的 test 配置，不单独建 vitest.config.ts
  tsconfig.json
  tsconfig.node.json
  docs/superpowers/specs/2026-09-30-finishing-personal-site-design.md
  src/
    main.tsx
    App.tsx
    content/
      site.ts                 站点全部内容：导航、Hero 文案、日记条目、关于我、联系方式
    i18n/
      dict.ts                 关于我区块的中英字典
      useLang.ts              语言状态 hook
    styles/
      tokens.css              色板、字体栈、间距、圆角、缓动曲线
      global.css              reset、排版基线、选区样式、滚动条
    hooks/
      useParallax.ts          鼠标归一化 + lerp 缓动，输出分层偏移量
      usePrefersReducedMotion.ts
    components/
      Nav/
        Nav.tsx
        Nav.module.css
        LangToggle.tsx        导航右侧语言开关
      Hero/
        Hero.tsx
        Hero.module.css
        HeroTitle.tsx         标题分层重影
        Starfield.tsx         WebGL 星尘粒子层（懒加载）
      Archive/
        ArchivePreview.tsx    首页的档案预览区块
        Timeline.tsx          纵向时间轴
        DiaryCard.tsx         卡片翻转单元
      About/
        About.tsx
        About.module.css
      Footer/
        Footer.tsx
    test/
      DiaryCard.test.tsx
      LangToggle.test.tsx
      site.test.ts
  public/
    diary/                    手稿占位图
    resume.pdf                简历占位（站主替换为真实文件）
    favicon.svg
```

---

## 4. 设计令牌（青灰冷调 · 深色唯一主题）

### 4.1 颜色

| 令牌 | 值 | 用途 |
|---|---|---|
| `--bg-base` | `#0E1013` | 页面底色，近黑微冷 |
| `--bg-surface` | `#16181C` | 卡片、面板 |
| `--bg-elevated` | `#1C1F24` | 悬停态、浮起元素 |
| `--line` | `#25282E` | 分隔线、描边 |
| `--line-strong` | `#3A3F47` | 强调描边、聚焦环基色 |
| `--text-primary` | `#EEF0F3` | 正文与标题 |
| `--text-secondary` | `#9BA1AC` | 次级说明 |
| `--text-muted` | `#5C626D` | 弱化信息、时间戳 |
| `--accent` | `#9DBFD8` | 淡青强调色：细线、链接、悬停、聚焦环 |
| `--accent-dim` | `rgba(157,191,216,0.14)` | 强调色低透明填充 |

正文文字与 `--bg-base` 的对比度需 ≥ 4.5:1；`--text-muted` 仅用于非关键信息，不得承载正文。

### 4.2 字体

- **中文标题**：`"Source Han Serif SC", "Noto Serif SC", "Songti SC", "SimSun", serif` 回退栈。
  **不加载中文 webfont**：思源宋体全字重体积达数十 MB，首屏代价不可接受。
- **英文标题**：加载一款小体积衬线 webfont（如 Instrument Serif，拉丁字符集，体积小），仅用于 "Finishing" 等拉丁大写标题。
- **正文**：`-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif` 系统栈。

### 4.3 尺度与缓动

- 间距阶梯：`4 / 8 / 12 / 16 / 24 / 40 / 64 / 96 / 128` px
- 圆角：`--radius-md: 8px`、`--radius-lg: 14px`
- 缓动：`--ease-out-expo: cubic-bezier(0.16,1,0.3,1)`、`--ease-in-out-soft: cubic-bezier(0.65,0,0.35,1)`
- 时长：微交互 `180ms`，卡片翻转 `720ms`，入场 `900ms`

---

## 5. 页面结构

首页区块顺序：`Nav → Hero → 成长档案预览 → 关于我 → Footer`

### 5.1 Nav

左侧 "Finishing" 字标（点击回顶部）；右侧「档案 / 关于我」锚点导航 + 语言切换按钮。

### 5.2 Hero（首页主视觉）

四层深度分级，每层给定独立的视差系数：

| 层 | 内容 | 视差系数 | 备注 |
|---|---|---|---|
| L0 | 星尘粒子（WebGL Canvas，`position: absolute` 铺满） | 0.2 | 移动端数量减半 |
| L1 | 标题浅影重影 | 0.35 | 主标题的两个低透明度偏移副本 |
| L2 | 主标题 "Finishing" | 0.6 | HTML 文字，真实可选中 |
| L3 | 细分割线 + 副标题 + 滚动提示 | 1.0 | 位移最快，强化纵深 |

**交互**：`mousemove` 事件把指针位置归一化到 `[-1, 1]`，各层按系数得到 `translate3d` 偏移与 1–3 度 `rotateX/rotateY`，全部经 lerp（插值系数 0.08）缓动，产生"跟手但有重量"的悬浮感。

**入场**：GSAP 时间轴——主标题自下而上逐词浮现并伴随 `blur` 收敛，分割线横向展开，副标题与滚动提示延后淡入。

**降级**：`prefers-reduced-motion: reduce` 时关闭视差与粒子，仅保留一次性淡入。

**性能**：`Starfield` 组件通过 `React.lazy` + `Suspense` 动态加载，WebGL 初始化不阻塞首屏文字渲染；Canvas 的 `dpr` 上限锁 2。

### 5.3 成长档案（首页为预览版）

- 纵向时间轴：左侧年份刻度线与节点，右侧卡片纵向排列。
- **卡片正面**：日期 + 标题 + 摘要 + 手稿缩略图。
- **卡片背面**：手稿大图 + 正文段落。
- 点击卡片执行 3D 翻转：容器 `perspective`，内层 `rotateY(180deg)`，两面 `backface-visibility: hidden`。
- **同时只允许一张展开**：点击新卡片时旧卡片自动复位。
- 键盘可达：`Enter` / `Space` 翻转，`Esc` 复位；卡片带 `aria-expanded` 与 `aria-controls`，正面可聚焦。
- 首页仅渲染最近 3 条，底部给「查看全部」入口（后续版本接到完整档案页，本期先锚点占位）。

### 5.4 关于我

两栏布局：

- **左栏**：简短自我介绍（扬州大学 · 车辆工程 · 大一新生）。
- **右栏**：微信 / QQ 联系方式（点击复制到剪贴板，并给出「已复制」提示）、简历 PDF 下载按钮（`<a download>` 指向 `/resume.pdf`）。

**双语切换行为（已确认）**：语言切换按钮常驻导航栏右侧。点击后切换「关于我」区块的中英文案，并自动平滑滚动到「关于我」区块。这样用户点击后能立刻看到变化，不会误以为按钮失效。

语言状态通过 `useLang` hook 管理，仅作用于 About 区块与导航内的少量标签文案；Hero 与档案文案保持中文，不在本期双语范围内。

### 5.5 Footer

版权行 + 一句站点标语 + 回顶部链接。

---

## 6. 内容与配置

`src/content/site.ts` 是唯一的内容入口，导出结构化常量：

- `nav`：导航项（label / href）
- `hero`：主标题、副标题、滚动提示文案
- `diary`：日记条目数组 —— `id / date / year / title / excerpt / body / image / tags`
- `about`：个人基本信息（学校、专业、年级）
- `contacts`：`{ type: 'wechat' | 'qq', label, value }` 数组
- `resumeUrl`：简历 PDF 路径

新增一篇日记 = 在 `diary` 数组里加一个对象 + 往 `public/diary/` 丢一张图。改联系方式 = 改 `contacts` 数组。

占位素材：本期用程序生成风格统一的占位手稿图（浅纸色纸面 + 手写感线条 + 日期水印），简历 PDF 生成一份占位文件。站主替换真实素材时无需改代码。

---

## 7. 可访问性

- 语义化标签：`header` / `nav` / `main` / `section` / `article` / `footer`
- 所有交互元素可键盘聚焦，`:focus-visible` 使用 `--accent` 描边，不依赖颜色单独传达信息
- 装饰性 WebGL Canvas 标记 `aria-hidden="true"`
- 尊重 `prefers-reduced-motion`
- 图片均带 `alt`，占位图 alt 说明「日记手稿占位图」

---

## 8. 性能预算

| 指标 | 目标 |
|---|---|
| 首屏 JS（gzip） | ≤ 180 KB |
| Three.js 相关 chunk | 动态加载，不计入首屏关键路径 |
| 首页 Lighthouse 性能 | ≥ 90 |
| 图片 | `loading="lazy"`、`decoding="async"`、固定宽高比避免布局抖动 |

---

## 9. 测试策略

采用 TDD：先写失败测试，再写实现。

| 测试文件 | 覆盖行为 |
|---|---|
| `test/site.test.ts` | 内容配置的结构完整性：每条日记有 id/date/title/image；diary 按日期倒序；联系方式非空 |
| `test/DiaryCard.test.tsx` | 点击正面后 `aria-expanded` 变为 `true`；再次点击复位；`Escape` 键复位 |
| `test/LangToggle.test.tsx` | 点击切换后 About 文案由中文变英文再变回；点击会触发滚动到 About 区块 |

本期不写视觉回归测试与 E2E（无稳定需求，YAGNI）。

---

## 10. 后续阶段（本期不做）

1. 完整成长档案页（`/archive`，分页或年份筛选）
2. 亮色模式
3. 全站双语
4. 真实手稿素材入库与图片压缩管线
5. 部署上线并绑定自定义域名
