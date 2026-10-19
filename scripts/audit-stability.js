// 最终稳定性体检（针对生产产物）：只要保证「不白屏 + 图片能打开」。
// 白屏的本质是 React 崩了 → #root 空 → 页面没有任何可见文字。所以直接查这一点最可靠，
// 比看截图更不容易骗人（截图可能只是视口位置不对而显得白）。
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(600);

  const root = document.getElementById('root');
  const h1 = document.querySelector('h1');
  const imgs = [...document.querySelectorAll('img')];

  // 只统计真的进入过视口、浏览器确实尝试加载过的图
  const broken = imgs
    .filter((i) => i.complete && i.naturalWidth === 0)
    .map((i) => i.currentSrc || i.src);
  const pending = imgs.filter((i) => !i.complete).length;

  const h1box = h1?.getBoundingClientRect();
  const main = document.querySelector('main');
  const mainbox = main?.getBoundingClientRect();

  return {
    地址: location.pathname,
    '-- 白屏判定 --': '',
    'root 存在': !!root,
    'root 子节点数': root ? root.children.length : 0,
    '有 h1': !!h1,
    'h1 文字': h1 ? h1.textContent.trim().slice(0, 40) : '(无)',
    'h1 可见': !!h1box && h1box.width > 0 && h1box.height > 0,
    '正文有可见文字': document.body.innerText.trim().length > 50,
    '正文文字量': document.body.innerText.trim().length,
    'main 高度': mainbox ? Math.round(mainbox.height) : null,
    '-- 图片判定 --': '',
    '图片总数': imgs.length,
    '加载中断图数': broken.length,
    '断图清单': broken.slice(0, 5),
    '仍在加载数': pending,
    '样式已生效': getComputedStyle(document.body).fontFamily.slice(0, 30),
    '横向溢出': document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()
