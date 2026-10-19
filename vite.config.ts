import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    /*
     * 性能优化：把体积大且几乎不变的第三方库拆成独立 chunk（性能优化：分包）
     *
     * 之前 React、react-dom、GSAP 全都和业务代码挤在同一个 index chunk 里
     * （约 375KB / gzip 130KB）。带来的两个问题：
     *   1. 首屏必须等这整个包下载 + 解析 + 执行完，React 才能挂载 ——
     *      这段真空期就是「白屏」的来源；
     *   2. 业务代码一改，整包缓存全失效，用户被迫重下 130KB。
     *
     * 拆开后：
     *   - vendor chunk 内容稳定，带 hash 但内容不变，第二次访问直接命中强缓存；
     *   - 浏览器可以并行下载 vendor 与业务 chunk，不必串行等一个大包；
     *   - 业务代码改动不再让 React/GSAP 的缓存失效。
     *
     * ⚠️ 只做代码分包，不改变任何运行逻辑与视觉表现。
     */
    rollupOptions: {
      output: {
        /*
         * 手动分包。注意 id 匹配的是**模块 id**：
         * react-dom 的产物在 node_modules 里叫 'react-dom'，
         * 其 client 入口是 'react-dom/client'，用前缀匹配一并纳入。
         */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined

          // React 运行时：最核心、几乎不变，优先单独缓存
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react'
          }

          /*
           * GSAP：封面入场动画与滚动揭示都在用，也是首屏就要执行的。
           * 单独拆出来，既能和业务代码分别缓存，也方便未来若要改成动态加载。
           */
          if (id.includes('node_modules/gsap') || id.includes('node_modules\\gsap')) {
            return 'vendor-gsap'
          }

          /*
           * ⚠️ 刻意**不**单独拆 framer-motion。
           *
           * 它只有「光影」整页的图墙在用，而该页已经是 React.lazy 的独立 chunk，
           * 所以它本来就被关在懒加载的 Moments chunk 里（135KB），只有点进 /moments
           * 才会下载 —— 这已经是正确的状态。
           *
           * 一旦手动把它提成 vendor-motion，Rolldown 反而会把这条依赖**提到入口的
           * 静态导入里**（实测产物里 index chunk 直接 `import ... from
           * "./vendor-motion"`，HTML 里还多了一条 modulepreload）。
           * 结果是 43KB gzip 的动效库被塞进首屏关键路径，每一页都要先下载它 ——
           * 比优化前更糟。这里交给 Rolldown 自行决定：它会把 motion 并进懒加载的
           * Moments chunk，那才是对的。
           */
          return undefined
        },
      },
    },
    /*
     * 报告 gzip 体积 —— 便于每次构建后核对首屏实际下载量。
     * 只影响构建输出信息，不影响产物。
     */
    reportCompressedSize: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    css: true,
  },
})