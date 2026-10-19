import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Cormorant Garamond 走 @fontsource 自托管打包（只取 latin 子集），
// 不依赖 Google Fonts，离线与国内网络都能正常显示。
import '@fontsource/cormorant-garamond/latin-400.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import './styles/tokens.css'
import './styles/global.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('找不到挂载节点 #root')
}

/**
 * 移除 index.html 里内联的首屏骨架（性能优化：消除白屏）。
 *
 * 那段骨架是随 HTML 一起到的，第一帧就有东西可画，填上了「JS 下载解析期间」
 * 那段真空期。React 一旦挂载就必须把它收掉 —— 它是 position: fixed，
 * 留着会盖住整个页面。
 *
 * 放在 render() 之前同步执行：render() 是异步提交的，等它返回时骨架往往还挂着，
 * 用户会看到真实内容「闪」出来又被盖回去。
 */
const boot = document.getElementById('boot')
if (boot) {
  boot.hidden = true
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
