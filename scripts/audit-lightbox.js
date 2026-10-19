// 灯箱回归（Round G 防复发）：必须先滚动再点开，否则「跳回顶部」根本测不出来。
// 用 awaitPromise 让脚本等我们自己编排的时序。
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 1) 先把页面滚离顶部，记下此刻的滚动位置。
  // 注意：不能只对 #moments 做 scrollIntoView —— 它是整页的唯一 section、
  // 顶边就在 y=0，滚了等于没滚，「跳回顶部」这个 bug 就压测不到。
  window.scrollTo(0, 1500);
  await sleep(1600);
  const beforeScroll = Math.round(window.scrollY);

  // 2) 点开第一张照片
  const card = document.querySelector('#moments button');
  if (!card) return { 致命: '找不到照片卡片' };
  card.click();
  await sleep(1200);

  const afterScroll = Math.round(window.scrollY);
  const overlay = document.querySelector('[role="dialog"]');
  const img = overlay?.querySelector('img');
  const r = img?.getBoundingClientRect();

  return {
    点击前scrollY: beforeScroll,
    点开后scrollY: afterScroll,
    滚动位置漂移: afterScroll - beforeScroll,
    '未跳回顶部(Δ<50)': Math.abs(afterScroll - beforeScroll) < 50,
    灯箱存在: !!overlay,
    遮罩父节点: overlay ? overlay.parentElement.tagName : null,
    '遮罩挂在body下(而非main内)': overlay ? overlay.parentElement === document.body : false,
    遮罩高: overlay ? Math.round(overlay.getBoundingClientRect().height) : null,
    视口高: window.innerHeight,
    '遮罩铺满视口': overlay
      ? Math.abs(overlay.getBoundingClientRect().height - window.innerHeight) < 2
      : false,
    图片: r
      ? {
          自然尺寸: `${img.naturalWidth}x${img.naturalHeight}`,
          渲染: { w: Math.round(r.width), h: Math.round(r.height) },
          顶: Math.round(r.top),
          底: Math.round(r.bottom),
          左: Math.round(r.left),
          右: Math.round(r.right),
        }
      : null,
    '图片完整在视口内': r
      ? r.top >= -1 &&
        r.left >= -1 &&
        r.bottom <= window.innerHeight + 1 &&
        r.right <= window.innerWidth + 1
      : false,
    '图片未被裁切(比例一致)': r
      ? Math.abs(r.width / r.height - img.naturalWidth / img.naturalHeight) < 0.02
      : false,
    图片实际可见: (() => {
      if (!r) return false;
      const cx = Math.round(r.left + r.width / 2);
      const cy = Math.round(r.top + r.height / 2);
      return document.elementsFromPoint(cx, cy).slice(0, 3).map((e) => e.tagName);
    })(),
    body已锁滚动: document.body.style.overflow,
    根元素底色标记: document.documentElement.getAttribute('data-lightbox-open') !== null,
    遮罩右侧缝检查: (() => {
      const x = window.innerWidth - 3;
      const mid = Math.round(window.innerHeight / 2);
      const hit = document.elementsFromPoint(x, mid);
      return { 命中元素数: hit.length, 首元素: hit[0]?.tagName ?? '(空)' };
    })(),
  };
})()
