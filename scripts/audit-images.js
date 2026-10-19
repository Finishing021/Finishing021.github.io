// 「图片能不能打开」的硬核检查：逐屏滚到底，逼出所有 loading="lazy" 的图，
// 等它们全部加载完之后再数断图。不滚动的话视口外的图压根没开始加载，
// 会把「还没加载」误当成「加载成功」。
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const H = () => document.documentElement.scrollHeight;

  // 逐屏往下滚，每屏停一下让懒加载触发
  let guard = 0;
  for (let y = 0; y < H() && guard < 40; y += Math.round(window.innerHeight * 0.8)) {
    window.scrollTo(0, y);
    await sleep(320);
    guard += 1;
  }
  window.scrollTo(0, H());
  await sleep(600);

  // 再给「已发起但没完成」的图 3 秒收尾
  for (let i = 0; i < 15; i += 1) {
    const imgs = [...document.querySelectorAll('img')];
    if (imgs.every((im) => im.complete)) break;
    await sleep(200);
  }

  window.scrollTo(0, 0);
  await sleep(300);

  const imgs = [...document.querySelectorAll('img')];
  const broken = imgs
    .filter((i) => i.complete && i.naturalWidth === 0)
    .map((i) => i.currentSrc || i.src);
  const neverLoaded = imgs
    .filter((i) => !i.complete)
    .map((i) => i.currentSrc || i.src);

  return {
    地址: location.pathname,
    页面高: H(),
    滚动次数: guard,
    图片总数: imgs.length,
    '✅ 加载成功': imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
    '❌ 断图': broken.length,
    断图清单: broken.slice(0, 8),
    '⚠️ 始终没加载': neverLoaded.length,
    未加载清单: neverLoaded.slice(0, 8),
    全部通过: broken.length === 0 && neverLoaded.length === 0,
  };
})()
