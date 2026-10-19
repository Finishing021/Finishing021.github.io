import '@testing-library/jest-dom/vitest'

/*
 * jsdom 没有实现 Element.prototype.scrollIntoView，
 * 凡是点击「语言切换」按钮的测试都会因为缺这个方法而抛出未捕获异常。
 * 浏览器里这个 API 一直存在，所以在共享环境里补一个空实现。
 * 需要断言调用参数的测试，自行用 vi.spyOn 覆盖这一个。
 */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

/*
 * jsdom 的 window.scrollTo 是「占位但没实现」：调用时会往虚拟控制台打一条
 * "Not implemented" 并且不抛异常。路由换页后要回顶部，于是每个用例都被这条
 * 噪音刷屏。补一个空实现，需要断言调用参数的测试自行 vi.spyOn 覆盖。
 */
if (typeof window !== 'undefined') {
  window.scrollTo = (() => {}) as typeof window.scrollTo
}

/*
 * jsdom 也没有 window.matchMedia。
 * gsap 的 ScrollTrigger 在 registerPlugin() 时就会调用它，而这个调用发生在
 * 模块加载阶段 —— 缺了它，任何 import 到 ScrollTrigger 的测试文件都会直接崩掉
 * （不是断言失败，是整个套件加载失败）。
 * 补一个默认返回 matches:false 的实现；具体测试里再自行覆盖。
 */
/*
 * jsdom 没有 ResizeObserver。补一个空实现（浏览器里由原生提供），
 * 免得以后哪个组件订阅容器尺寸时在挂载阶段直接抛异常。
 */
if (typeof globalThis !== 'undefined' && typeof globalThis.ResizeObserver !== 'function') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof globalThis.ResizeObserver
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
