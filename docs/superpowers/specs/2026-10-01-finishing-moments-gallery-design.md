# 光影（Moments）摄影墙 — 设计文档

日期：2026-10-01
状态：待用户审阅
范围：新增 `/moments` 独立整页（图片网格 + 灯箱），并把图片管线泛化给摄影墙与成长档案共用

前置文档：`2026-09-30-finishing-personal-site-design.md`（站点整体设计）

---

## 1. 目的与成功标准

**目的**：给站主的摄影作品一个独立展位。现有「成长档案」放的是手稿，语义是「记录」；摄影墙放的是照片，语义是「作品」。两者内容性质不同，混在一页会让两者都失焦，所以摄影墙单独成页。

**使用者**：站主本人（持续上传作品）与访客（浏览）。

**成功标准**：

1. 站主加照片的流程是「把文件丢进 `assets-source/photos/` → 跑一条命令」，全程不碰任何代码。
2. 网格呈现拍立得白框质感，与「关于我」页头像相框是同一套视觉语言。
3. 鼠标悬停时照片轻微浮起放大；点击弹出全屏大图，可左右翻页。
4. 时间倒序自动成立，不需要站主手动排序。
5. 页面无横向滚动（320px 起），读屏可用，尊重「减少动态效果」。

**明确不做（YAGNI）**：不做相册分组/专题页、不做标签筛选、不做 EXIF 参数展示（光圈/快门/ISO）、不做图片评论、不做灯箱内的缩放拖拽。

---

## 2. 已确认的用户决策

| 决策项 | 选择 |
|---|---|
| 板块位置 | 独立整页 `/moments` + 导航项 |
| 点击放大 | 悬停浮起微放大 + 点击弹出全屏大图 |
| 照片文字 | 纯图墙，**照片上不出现任何文字**（含标题/日期/地点/张数） |
| 网格形态 | 拍立得白框墙 |
| 白框留白 | 四边等宽 16px（无文字则不留「假标题区」） |
| 白框 + 原图比例 | **保留每张原图比例，不裁切** |
| 排序依据 | 按拍摄日期（EXIF），时间倒序 |
| alt 来源 | 从文件名生成 |
| 灯箱实现 | 抽出公共 FLIP 逻辑，两个灯箱组件各写各的 |
| 图片管线 | 合并成通用 `optimize-images.py`，两条内容线共用 |
| 清单来源 | 脚本自动生成，不手写 |

### 2.1 关于「纯图墙」与页面标题

「照片上不出现文字」不等于「页面不能有标题」。`/moments` 仍需要一个页面级标题（`光影`）用于站点定位与读屏导航——它不属于照片的附属文字。如果站主希望连页面标题也去掉，需要在实施前明确提出。

---

## 3. 图片命名与目录规范

**这是站主日常唯一需要接触的约定。**

### 3.1 目录

```
assets-source/photos/     ← 站主把原图丢这里（手机直出 3~5 MB 也无所谓）
public/photos/            ← 脚本产物，不要手动改，不要提交进版本库以外的地方
```

### 3.2 命名

```
<描述>.jpg
<描述>_NN.jpg            ← 同一天多张时用两位序号区分
```

**规则：**

1. **只用英文、数字、连字符、下划线。** 不要用中文文件名。
   原因：中文文件名在部分工具链（git 输出、URL 百分号编码、跨平台传输）会带来无谓的显示噪音与踩坑成本。
2. **描述要有意义。** 因为 alt 直接取自文件名，`photo_01.jpg` 会生成「photo 01」这种对读屏用户毫无信息量的描述。

   ```
   ✅  yangzhou-rain.jpg          → alt "yangzhou rain"
   ✅  dorm-window-cloud-02.jpg   → alt "dorm window cloud 02"
   ❌  photo_01.jpg               → alt "photo 01"
   ❌  2026-06-25.jpg             → alt 退化为「摄影作品」
   ```

3. **日期不写进文件名。** 拍摄日期由脚本从 EXIF 的 `DateTimeOriginal` 读取，比手写更准。文件名里写日期只在**图片没有 EXIF**（截图、二次导出）时才需要，此时以前缀 `YYYY-MM-DD` 的形式覆盖，例如 `2026-06-25_screenshot.jpg`。前缀后的分隔符 `_`、`-`、空格都认；前缀本身必须是一个真实存在的日期（见 §3.3）。

### 3.3 日期解析优先级

脚本按以下顺序确定 `date`，第一个命中的生效：

1. EXIF `DateTimeOriginal`（36867）→ 最准，手机/相机直出都有
2. EXIF `DateTimeDigitized`（36868）→ 没有上一条时的次选
3. EXIF `DateTime`（306）→ 部分导出工具只写这个
4. 文件名前缀 `YYYY-MM-DD` → 覆盖通道，用于无 EXIF 的图
5. 文件修改时间（mtime）→ 兜底

第 5 条命中时，`photos:check` 会打印警告，因为 mtime 在拷贝/解压后会失真。

#### ⚠️ 第 1、2 条必须去 Exif 子 IFD 里找

这是实现期踩到的一个**静默错误**，值得单独记一笔：

按 EXIF 规范，36867 / 36868 住在 **Exif 子 IFD（tag `0x8769`）** 里，
真实相机和手机都写在那儿。而 Pillow 的 `image.getexif().get(36867)`
**只查 0th IFD**，对着一张真照片会返回 `None`。

漏掉这一点不会报任何错 —— 脚本会安静地往下走到第 5 条，用文件 mtime 当日期。
后果是：页面照常渲染、照片照常出现，只有排序悄悄错成一团，
而且因为所有照片的 mtime 都一样（都是解压那一刻），
整个网格的顺序基本等于随机。

修法：`read_exif_datetime()` 同时查两张表，Exif 子 IFD 优先：

```python
try:
    candidates.append(exif.get_ifd(EXIF_IFD).get(tag))   # 真实相机走这条
except Exception:
    pass
candidates.append(exif.get(tag))                          # 展平式导出走这条
```

守卫：`scripts/test-optimize-images.py` 里有专门构造的相机式 EXIF 样本
（写入 `exif[0x8769] = {36867: ...}` 再存盘读回），断言必须解析出日期。

#### 关于文件名前缀的分隔符

文档示例写的是 `YYYY-MM-DD_描述.jpg`，但实际动手改名时
`-` 和空格同样常见。放宽成 `[_\-\s]` 或行尾都认，
避免「只是分隔符用错 → 日期静默退回 mtime」。

放宽之后**必须校验日期真实存在**：否则 `2019-2020-review.jpg`
会被当成「2019 年 20 月 20 日」。`match_date_prefix()` 用
`datetime(...)` 构造一次来挡掉这种情况。

### 3.4 alt 生成规则

1. 取文件名主干，去掉 `.jpg` 扩展名
2. 去掉开头的 `YYYY-MM-DD_`（若有）
3. 去掉紧跟的 `NN_` 两位序号（若有）
4. 把 `-` 和 `_` 替换成空格
5. 结果为空、或仅由数字组成、或只是 `photo` / `img` / `image` / `dsc` 这类无信息量词时 → 退化为 `摄影作品`，并由 `photos:check` 记一条警告

### 3.5 alt 覆盖通道（可选）

如果站主不想在文件名里塞描述，或者想要中文 alt，可以在源目录放一个可选的
`assets-source/photos/alt.json`：

```json
{
  "photo_01.jpg": "宿舍窗外的云",
  "photo_02.jpg": "瘦西湖的清晨"
}
```

规则：

- 文件**可选**。没有它时完全按 3.4 从文件名推导。
- 键是源文件名（含扩展名），值是 alt 字符串。
- 命中的条目优先于文件名推导。
- `alt.json` 里出现了源目录中不存在的文件名 → `photos:check` 警告（防止改名后残留）。
- 该文件不参与压缩，也不会被拷进 `public/`。

**为什么需要它**：站主明确说过打算用 `photo_01.jpg` 这类纯序号命名。而日期已经由 EXIF 接管，文件名是**唯一还能携带描述信息的免费通道**——全部让给序号的话，读屏用户听到的就只剩「photo 01」。这个覆盖文件是最低成本的回退方案，用不用由站主决定。

---

## 4. 工程改动清单

### 4.1 新增文件

```
scripts/optimize-images.py                 ← 由 optimize-diary.py 改名而来
scripts/check-photos.mjs                   ← 摄影墙的素材自检
src/components/Moments/
  Moments.tsx                              ← /moments 页面（页头 + 墙）
  Moments.module.css
  MomentsWall.tsx                          ← 列布局网格容器
  MomentsWall.module.css
  PhotoCard.tsx                            ← 单张：白框 + 悬停微放大 + 点击
  PhotoCard.module.css
  PhotoLightbox.tsx                        ← 全屏大图（无文字）
  PhotoLightbox.module.css
src/hooks/useFlipIn.ts                     ← 从 DiaryLightbox 抽出的 FLIP 入场
src/content/photos.generated.ts            ← 脚本生成，文件头注明「请勿手改」
src/test/Moments.test.tsx
src/test/PhotoLightbox.test.tsx
src/test/photos.test.ts
scripts/test-optimize-images.py            ← 图片管线的 Python 自检（见 §9.1）
scripts/check-photos.mjs                   ← 素材自检，只读，见 §6.6
assets-source/photos/README.txt            ← 命名规范速查，放在照片目录里最容易被看到
```

### 4.2 修改文件

| 文件 | 改动 |
|---|---|
| `src/router/route.tsx` | `Route` 联合类型加 `/moments`；`normalizeRoute` 识别它 |
| `src/components/Nav/Nav.tsx` | **修 bug**：`goNav` 的 else 分支硬编码了 `navigate('/about')`，加第三项后会把 `/moments` 也跳到关于我。改为 `navigate(itemRoute(href))`；同时把 `active` 判断从 `item.id === 'about'` 的两项硬编码改为按 `href` 推导 |
| `src/content/site.ts` | `NavItem['id']` 加 `'moments'`；`nav` 数组插入 `{ id: 'moments', href: '/moments' }` |
| `src/i18n/dict.ts` | `navDict` 加 `moments` 中英文案 |
| `src/App.tsx` | `main` 里的二元分支改为三分支 |
| `src/components/Archive/DiaryLightbox.tsx` | 改用 `useFlipIn`，行为与外部契约（`[data-thumb]`）保持不变 |
| `scripts/optimize-images.py` | 由 `optimize-diary.py` 泛化而来；**实现期修了一个 EXIF 静默 bug**，见 §3.3 |
| `scripts/shoot.mjs` | **修 bug**：`HOVER` 原先跑在 `CLICK_SELECTOR` 之前，导致「先点进封面再悬停内页元素」的组合里鼠标坐标完全对不上、截出来和未悬停一样且不报错。现调整为 点击 → 滚动 → 悬停 |
| `package.json` | `diary:build` 指向新脚本路径；新增 `photos:build`、`photos:check`、`photos:selftest`；`photos:check` 串上 Python 自检 |
| `docs/superpowers/specs/2026-09-30-*.md` | 补一条变更记录，说明图片管线已泛化 |

关于 `goNav` 那个 bug：现在的代码是

```ts
if (href.startsWith('/#')) { navigate('/', href.slice(2)); return }
navigate('/about')            // ← 写死的
```

它现在能工作只是因为导航恰好只有「关于我」和「成长档案」两项，而后者走的是 `/#archive` 分支。加第三项时这个写死值会把 `/moments` 错误地跳到关于我。有测试守护这一点。

---

## 5. 数据模型

`src/content/photos.generated.ts`（脚本生成）：

```ts
export interface Photo {
  /** 全尺寸图 URL，长边 2000，灯箱用 */
  src: string
  /** 缩略图 URL，长边 640，网格用 */
  thumb: string
  /** 缩略图宽高比 = 宽 / 高，用于占位、避免布局抖动 */
  aspect: number
  /** 拍摄日期 YYYY-MM-DD */
  date: string
  /** 读屏描述，由文件名推导 */
  alt: string
  /** 源文件名，排查问题时用 */
  file: string
  /** 日期是从哪来的：exif / filename / mtime，mtime 说明需要人工确认 */
  dateSource: 'exif' | 'filename' | 'mtime'
}

/** 已按 date 倒序排好，组件直接消费 */
export const photos: Photo[] = [ /* ... */ ]
```

**为什么需要 `aspect`**：网格必须在图片加载前就占好位，否则每加载一张整堵墙就往下跳一次。`aspect` 由脚本在压缩时顺手记录（脚本本来就知道图片的真实尺寸），运行时不产生任何测量成本。

**为什么需要 `dateSource`**：让「靠 mtime 兜底」这件事在开发期可见，而不是等到某天照片顺序莫名其妙乱了才发现。

---

## 6. 图片管线：`optimize-images.py`

由 `scripts/optimize-diary.py` **改名**（`git mv`）而来，能力扩展但**默认行为完全不变**。

### 6.1 命令行

```bash
# 老行为，一字不改：单档 1600px，给成长档案用
python scripts/optimize-images.py

# 摄影墙：双档 + 生成清单
python scripts/optimize-images.py assets-source/photos public/photos \
  --thumb --manifest src/content/photos.generated.ts

# 就地重压已有产物
python scripts/optimize-images.py --in-place
```

### 6.2 参数

| 参数 | 作用 |
|---|---|
| `[源目录] [目标目录]` | 位置参数，不给则沿用 `assets-source/diary → public/diary` |
| `--in-place` | 就地优化目标目录里的图 |
| `--max-edge N` | 长边上限，默认 1600（摄影墙传 2000） |
| `--thumb` | 额外输出一份 `<stem>_thumb.jpg` |
| `--thumb-edge N` | 缩略图长边上限，默认 640 |
| `--manifest <path>` | 生成 TS 清单到指定路径 |
| `--quality N` | JPEG 质量，默认 82 |

**参数组合约束**：`--in-place` 与 `--thumb` / `--manifest` 互斥（就地重压时源目录即产物目录，再生成缩略图会污染 `public/diary/`，而 `--manifest` 也读不出有意义的源文件名）。同时给出时脚本报错退出，不静默取其一。

### 6.3 保持不变的部分

EXIF 摆正、渐进式 JPEG、`SKIP_BELOW_KB` 跳过已压缩文件的逻辑、以及 `--in-place` 时跳过小文件的行为全部保留。成长档案的 `diary:build` 只是换了个脚本路径，产物与现在逐字节一致。

### 6.4 为什么两档

网格里一张缩略图显示宽度约 240px（2 倍屏即 480px），640px 的长边足够。若共用 2000px 的图，一页 30 张就是 60 MB 的下载量——这是把摄影墙判死刑的做法。

### 6.5 npm 脚本

```json
"diary:build":    "python scripts/optimize-images.py",
"photos:build":   "python scripts/optimize-images.py assets-source/photos public/photos --max-edge 2000 --thumb --manifest src/content/photos.generated.ts",
"photos:check":   "python scripts/test-optimize-images.py && node scripts/check-photos.mjs",
"photos:selftest": "python scripts/test-optimize-images.py"
```

`diary:build` 的定义与现在完全一致，只是脚本文件换了名字，因此成长档案的产物逐字节不变。

`photos:check` 串上了 Python 自检，所以日常那一条自检命令会连带把解析逻辑也验一遍 ——
不然 `test-optimize-images.py` 很容易被忘在角落里。

### 6.6 `check-photos.mjs`

只读自检，不做修改。逐条检查并打印结果：

| # | 检查 | 失败时的表现 |
|---|---|---|
| 1 | 清单里每条指向的文件都真实存在 | 报错，退出码 1 |
| 2 | `public/photos/` 里每张全尺寸图都有配对的 `_thumb.jpg` | 报错，退出码 1 |
| 3 | 同名文件（不同扩展名，会互相覆盖） | 报错，退出码 1 |
| 4 | 清单是否与源目录同步（有没有新图忘了跑 build） | 警告 |
| 5 | 有没有条目的 `dateSource` 是 `mtime` | 警告，列出文件名 + 改法 |
| 6 | 有没有文件名推导出的 alt 过于敷衍（纯数字、或只有 photo/img/image/dsc） | 警告，列出文件名 + 改法 |
| 7 | `alt.json` 里有没有对应不上任何源文件的残留键 | 警告 |

报错与警告的分界是刻意的：**能自动修好的东西才报错，需要站主判断的东西只警告。**
缺图、缺缩略图、同名覆盖都是「跑一次 build 就能对」的机械问题；而日期靠兜底、
文件名起得敷衍是内容决策，脚本不该替站主拍板，但必须把话说清楚。

警告不阻断退出码，报错才阻断——这样它既能进 CI，也能当日常顺手一跑的工具。

### 6.7 源目录为空时的行为

不带 `--manifest` 时（成长档案的 `diary:build`）：报「没找到任何图片」并返回 1。

带 `--manifest` 时（摄影墙）：**写出空清单并返回 0**。理由是「照片被清空」是一个合法状态，
此时必须刷新清单——否则清单会残留一批指向已删文件的死条目，页面就去加载不存在的图。
这是实现期补的一条：原设计只考虑了「报错」，会让清空照片后清单变成脏数据。

---

## 7. 组件设计

### 7.1 `useFlipIn`（从 `DiaryLightbox` 抽出）

```ts
function useFlipIn(options: {
  targetRef: RefObject<HTMLElement | null>
  /** 缩略图选择器；量出它的位置与尺寸作为 FLIP 起点 */
  thumbSelector: string
  /** 变化时重播入场（如灯箱当前展示的是哪一张） */
  replayKey?: string
}): void
```

把「量缩略图 → 算位移与缩放 → 从原位推近到终位」这段原样搬出来。它包含两个必须保留的健壮性处理：

- **量不到缩略图时降级**为标准缩放淡入，不崩
- **`prefers-reduced-motion` 时整个跳过**，不注册任何动画

之所以只抽这一段而不抽整个灯箱：档案灯箱的「主题标题 / 日期 / 张数计数器」是成长档案的业务特性，摄影灯箱完全没有这些。硬抽会得到一个塞满可选 prop 的万能组件，比现在更难看懂。

### 7.2 `Moments`（页面）

```
section#moments
  header            光影 / Moments 标题与一句引言（data-reveal）
  MomentsWall       图片墙
```

沿用 `src/styles/section.module.css` 的页头样式，与成长档案的标题层级一致。封面退场后本页的标题为 `h1`。

### 7.3 `MomentsWall`（网格）

**用 CSS 多列实现，不用 JS 计算布局。**

```css
.wall {
  /* column-width 决定「窄到多少就减一列」，column-count 只是上限。
     浏览器按可用宽度自动取列数，不需要为每一档写媒体查询。 */
  column-width: 240px;
  column-count: 4;          /* 上限：再宽也不超过 4 列，避免大屏上每列太窄 */
  column-gap: var(--sp-5);
}
.card {
  break-inside: avoid;      /* 关键：不许把一张照片切到两列 */
  margin-bottom: var(--sp-5);
}
```

只有两处需要媒体查询收口，都是为了让小屏更好看：

- `max-width: 860px` → `column-count: 3`
- `max-width: 520px` → `column-count: 2`，白框内边距由 16px 降到 12px

**为什么列布局是对的**：照片保留各自的原图比例，高度天然参差，这正是拍立得墙该有的样子。而且——

**因为墙上没有任何文字，视觉阅读顺序不可见。** DOM 顺序仍然是严格的时间倒序（读屏用户拿到的就是时间线），而多列的视觉流动只是排布方式。Pinterest 式浏览对图片墙是自然预期，不会有人「读错顺序」。

### 7.4 `PhotoCard`（单张）

三层结构：

```
button（可键盘聚焦）
  span.polaroid             白框：padding 16px + 白底 + 圆角 + 柔影
    img.thumb               保留原图比例（aspect-ratio 来自数据），圆角内缘
```

**为什么是 `span` 而不是 `figure`**：外层是 `<button>`，而 button 的内容模型只允许**短语内容**，`<figure>` / `<div>` 在 button 里是非法嵌套，浏览器会把它们踢出按钮。`span` + `display: block` 视觉上完全等价，且合法。

**可访问名不加 `aria-label`**：按钮的可访问名来自内部 `<img>` 的 `alt`。若再在按钮上加 `aria-label`，两者同时存在会让读屏把同一句话念两遍。

- **白框参数与「关于我」头像一致**：`--mat: var(--sp-4)`、外框圆角 24px、内缘圆角 `calc(24px - 16px)` = 8px 同心圆角、`box-shadow: var(--shadow-photo)`。这是刻意的——同一套相纸语言。
- **`aspect-ratio: var(--photo-aspect)`** 内联设置，图片未加载时也占好位。
- **悬停微放大**：`translateY(-6px) scale(1.03)` + 阴影加深，**与成长档案卡片完全一致的参数**，两处的手感统一。
- **移动端不做悬停**（无 hover 概念），改为点击时 `:active` 的轻微下沉反馈。

### 7.5 `PhotoLightbox`（全屏大图）

- `role="dialog"` + `aria-modal="true"`，`aria-label` 取当前照片的 alt
- 入场：`useFlipIn` 从缩略图推近
- 遮罩点击、关闭按钮、`Esc` 均可关闭
- 左右按钮与方向键翻页；到头时按钮 `disabled`
- **不显示任何文字**——没有标题、没有日期、没有 `3 / 24` 计数器
- 打开时锁背景滚动，焦点移到关闭按钮，关闭后焦点还回触发的缩略图
- 预加载相邻两张，保证翻页不空白

---

## 8. 可访问性

- 每张照片的 `alt` 来自数据，不使用空 alt（照片是内容，不是装饰）
- 缩略图是真正的 `button`，可 `Tab` 聚焦，`:focus-visible` 用 `--accent` 描边
- 灯箱打开后焦点进入对话框，`Esc` 关闭并归还焦点
- `prefers-reduced-motion: reduce` 时：关闭 FLIP 入场（直接显示）、关闭悬停位移，仅保留不影响可读性的透明度变化
- 关闭灯箱后焦点必须回到触发它的那张缩略图，否则键盘用户会被扔回页面顶部

---

## 9. 测试策略

沿用现有的 Vitest + React Testing Library，先写失败测试。

| 测试文件 | 覆盖行为 |
|---|---|
| `photos.test.ts` | 每条字段集合恰好是约定的 7 个键；`src`/`thumb` 为站内绝对路径；`alt`/`file` 非空；`aspect` 为正有限数；`date` 匹配 `YYYY-MM-DD`；`dateSource` 在允许集合内；数组按 `date` 倒序；无重复 `src`；`thumb` 是 `_thumb.jpg` 配对文件而非 `src` 本身 |
| `Moments.test.tsx` | 渲染的张数与入参一致；每张的可访问名等于其 `alt`；网格加载的是 `thumb` 而非 `src`；带 `loading="lazy"`；有 `aspect-ratio` 占位；带 `data-thumb`；空数组不报错；空态文案与命令提示 |
| `PhotoLightbox.test.tsx` | 点击缩略图打开且展示全尺寸图；`Esc`／遮罩／关闭按钮三条关闭路径；左右方向键翻页且到头不禁用不越界；打开后焦点落在关闭按钮、关闭后回到触发的缩略图；对话框可访问名取当前照片 `alt`；灯箱内无任何说明文字 |
| `route.test.tsx`（扩展） | `/moments` 归一化正确；未知路径仍回落到首页；导航顺序为 关于我 → 成长档案 → 光影；点「光影」跳 `/moments`；**从光影页点导航项不会错误落到关于我**（守护 `goNav` 那个写死 `/about` 的 bug）；导航高亮跟随路由 |
| `App.test.tsx`（扩展） | 路由为 `/moments` 时渲染摄影墙而非档案；一级标题唯一；深链直接访问 `/moments` 可渲染 |

**刻意不断言「清单非空」**：照片是逐步补进去的，做成测试会让 `npm test` 在内容填充期间一直红着 —— 这也是 `check-diary.mjs` 当初做成脚本而不是测试的原因。「有没有照片」交给 `npm run photos:check` 报。

### 9.1 三类断言的职责边界（实现期修订）

初版把「alt 退化为摄影作品」和「dateSource 为 mtime」也写进了测试。实现期末尾发现
这条设计站不住：**它让 `npm test` 在站主文件名起得不够用心时变红**，
而这既不可操作（测试红了该怎么改？），又把真正的红信号稀释掉了。

现在的分工：

| 断言类型 | 放哪儿 | 命中时 |
|---|---|---|
| 结构不变量（排序、路径形状、字段、宽高比、去重） | `photos.test.ts` | `npm test` 失败 |
| 内容质量（alt 敷衍、日期靠 mtime 兜底） | `check-photos.mjs` 第 5、6 项检查 | 打印警告 + 具体改法，不阻断退出码 |
| 解析逻辑本身（EXIF 各种写法、文件名前缀、alt 推导） | `scripts/test-optimize-images.py` | 非零退出码，22 项断言跑在合成样本上 |

内容质量之所以归 `check-photos.mjs`，是因为那里的警告**会直接把修法写出来**
（「改成 YYYY-MM-DD_描述.jpg」/「在 alt.json 里补一条中文描述」），
这是测试断言给不了的。

`scripts/test-optimize-images.py` 不依赖 pytest —— 这个仓库的 Python 侧只依赖
Pillow，为二十来行断言引入一套测试框架不划算。它被 `npm run photos:check`
串在最前面，所以日常跑自检时会连带跑掉。

`useFlipIn` 的动画本身不做断言（GSAP 时序在 jsdom 里不可靠），只断言「减少动态效果时不抛错」。

不写视觉回归（无稳定需求，YAGNI）。

---

## 10. 边界与失败处理

| 场景 | 期望行为 |
|---|---|
| `photos.generated.ts` 是空数组（还没放照片） | 页面正常渲染，显示一句「还没有照片」的空态提示，不是白屏也不是报错 |
| 图片文件缺失（清单指向的文件不存在） | 白框保留占位底色，不出现破图图标，不塌高度 |
| 源目录不存在 | 脚本打印「请把照片放进 <路径>」并返回非零退出码，与现有 diary 脚本一致 |
| 文件名重复（同名不同扩展名） | 脚本报错退出，不静默覆盖 |
| 无 EXIF 且文件名无日期 | 用 mtime，并在 `photos:check` 里警告 |
| 极端窄视口 320px | 2 列仍不横向溢出；白框内边距可降到 12px |
| 超长文件名 / 描述 | alt 过长时截断到 120 字符，避免读屏念一长串 |

---

## 11. 性能预算

| 指标 | 目标 |
|---|---|
| 首屏新增 JS（gzip） | ≤ 15 KB（本板块无新依赖，GSAP 已在包里） |
| 单张缩略图 | ≤ 120 KB |
| 首屏图片总下载 | ≤ 1.2 MB（约 10 张缩略图，其余 `loading="lazy"`） |
| 布局抖动（CLS） | 0 —— 全部靠 `aspect-ratio` 预占位 |
| 长任务 | 无 —— 布局交给 CSS 多列，浏览器自行处理 |

缩略图统一 `loading="lazy"` + `decoding="async"`，第一屏内的前若干张可 `loading="eager"`。

---

## 12. 站主日常操作（交付后写进 README 或脚本头部注释）

```bash
# 1. 把照片丢进 assets-source/photos/，文件名用有意义的英文短词
#    例：yangzhou-rain.jpg、dorm-window-cloud-02.jpg

# 2. 一条命令搞定压缩 + 生成清单
npm run photos:build

# 3. 检查有没有问题（缺图、日期兜底、文件名太敷衍）
npm run photos:check

# 4. 本地预览
npm run dev
```

加照片的完整流程就是这四步，不需要改任何代码。

---

## 13. 变更记录

### 2026-10-01 第 3 版：端到端联调期修订

这一版全部来自「拿 6 张合成照片真跑一遍管线」时才暴露的问题 ——
单元测试和类型检查都发现不了它们，因为它们**不报错**。

1. **修 EXIF 日期读取的静默 bug（§3.3）。**
   `read_exif_datetime` 只用 `exif.get(36867)` 查 0th IFD，而真实相机把
   `DateTimeOriginal` 写在 Exif 子 IFD（`0x8769`）里，于是对真照片一律返回 `None`，
   静默退回文件 mtime。6 张测试图里 5 张中招 —— 而它们本该有准确日期。
   现在两张表都查，子 IFD 优先，并补上 `DateTimeDigitized`（36868）。

2. **文件名日期前缀放宽分隔符（§3.2 / §3.3）。**
   原来只认 `YYYY-MM-DD_`，用 `-` 或空格就会静默退回 mtime。
   现在 `[_\-\s]` 或行尾都认；同时**新增日期合法性校验**，
   否则 `2019-2020-review.jpg` 会被读成「2019 年 20 月 20 日」。

3. **新增 `scripts/test-optimize-images.py`**（22 项断言，§4.1 / §9.1）。
   上面两个 bug 都属于「读不到不报错」的类型，必须有一把显式的锁。
   第一条断言就是构造相机式 EXIF（写 `exif[0x8769] = {36867: ...}` 存盘再读回）并断言能解析出日期。

4. **测试与检查脚本的职责重新划清（§9.1）。**
   第 2 版把「alt 敷衍」和「日期靠 mtime」写进了 `photos.test.ts`。
   真往目录里放照片时才发现：**站主文件名起得不够用心，整个测试套件就红**。
   这两项现在只由 `check-photos.mjs` 以警告形式报出（它还会打印具体改法），
   `photos.test.ts` 退回只守护结构不变量。

5. **修 `scripts/shoot.mjs` 的操作顺序（§4.2）。**
   `HOVER` 原先跑在 `CLICK_SELECTOR` 之前，于是「先点进封面、再悬停内页卡片」
   这种组合里，鼠标停在封面上、坐标完全对不上，截出来的图和未悬停的一模一样，
   而且不报错 —— 差点把「悬停浮起没实现」当成 bug 去改 CSS。
   现调整为 点击 → 滚动 → 悬停，并在注释里写明「默认模拟的
   `prefers-reduced-motion` 会关掉这些位移，想看浮起效果要同时传 `MOTION=normal`」。

验证结果：100 个测试通过（12 个文件）。`npm run photos:selftest` 22 项断言通过。
`tsc --noEmit` 无错，构建成功，首屏 JS gzip 123.6 KB（预算 180 KB）。
端到端用 6 张合成照片（含相机式 EXIF、文件名日期、无 EXIF 三种情况）验证：
双档输出、日期与排序、缩略图配对、`photos:check` 全部符合预期。
验收截图见 `.shots/`（网格 / 悬停 / 灯箱 / 手机端 / 空态）。

### 2026-10-01 第 2 版：实现期修订

实现过程中与第 1 版有以下出入，均已按实际落地的方案更新到上文：

1. **卡片内层由 `figure` 改为 `span`** —— `<button>` 只允许短语内容，`figure` 是非法嵌套（§7.4）。
2. **可访问名不再加 `aria-label`**，改由内部 `img` 的 `alt` 提供，避免读屏重复播报（§7.4）。
3. **`photos.test.ts` 不再断言「清单非空」**，改为只守护结构与质量退化（§9）——
   与 `check-diary.mjs` 当初的判断一致：内容填充期不该让测试常红。
4. **新增 §6.7**：源目录为空且带 `--manifest` 时写出空清单，避免死条目。
5. **新增 §3.5**：可选的 `alt.json` 覆盖通道，应对「站主用纯序号命名」的情况。
6. **`--in-place` 与 `--thumb` / `--manifest` 互斥**（§6.2）。

验证结果：101 个测试通过（原 68，新增 33）；`tsc --noEmit` 无错；构建成功，
首屏 JS gzip 由 122.7 KB 增至 123.6 KB（本板块新增约 1 KB，预算为 15 KB）。

### 2026-10-01 第 1 版

首版。确立摄影墙独立成页、拍立得白框 + 保留原图比例、纯图墙（照片上无文字）、
日期取自 EXIF、alt 取自文件名、图片管线由 `optimize-diary.py` 泛化为 `optimize-images.py`。

同时记录一个既有 bug：`Nav.tsx` 的 `goNav` 在 else 分支硬编码 `navigate('/about')`，
加第三个导航项后会错误跳转，本次一并修复并有测试守护。
