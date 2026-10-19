# previews — 预览截图归档

这里放的是各个轮次**交付给站主看**的实拍截图。用无头 Edge + CDP 真实渲染后截的，
不是设计稿，所以可以直接当作「页面到底长什么样」的依据。

| 文件 | 内容 |
| --- | --- |
| `rh-toggle-zh.png` | 桌面 1440 顶部导航，语言开关停在「中」 |
| `rh-toggle-en.png` | 同上，开关滑到「EN」 |
| `rh-zoom-zh.png` | 开关「中」档 6 倍特写 |
| `rh-zoom-en.png` | 开关「EN」档 6 倍特写 |
| `rh-mobile-nav.png` | 移动端 390 宽整条导航（3 倍放大） |
| `rh-toggle-mobile.png` | 移动端 390 原尺寸 |
| `rh-lightbox-desktop.png` | 照片灯箱打开态，遮罩铺满视口 |
| `rh-moments-plain.png` | 光影页未开灯箱的对照图（用于像素比对遮罩不透明度） |
| `about-facts-zh.png` | 关于我 · 中文模式的学校/专业/年级 |
| `about-facts-en.png` | 关于我 · 英文模式的同一区块 |
| `about-facts-compare.png` | 上面两张的对照拼图（已放大 2 倍） |

> `about-facts-compare.png` 是按两种语言**各自的坐标**分别裁剪再拼的。
> 不能共用一个裁剪框：英文正文行数多，会把列表往下推，而且
> `Yangzhou University` / `Vehicle Engineering` 会折成两行、区块更高。

截图脚本在 `scripts/shoot.mjs`，用法：

```bash
node scripts/shoot.mjs <url> <out.png> [宽] [高] [viewport|full]
```

两个容易踩的坑（脚本头部也有注释）：

1. **不要并行跑两个实例** —— 它们会抢同一个标签页，静默量错尺寸而不报错。
2. **默认模拟 `prefers-reduced-motion`**，会把「只在动效下才出现」的 bug 藏起来。
   怀疑和动画 / GSAP / transform 有关时，加 `MOTION=normal` 再测一遍。

配套的验收表达式在同目录的 `scripts/audit-*.js`，可直接喂给 `EVAL_EXPR`。
