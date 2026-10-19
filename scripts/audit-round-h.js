// 四页回归：给 shoot.mjs 当 EVAL_EXPR 用的自执行表达式。
// 每页都断言：无横向溢出、导航项齐全、开关存在且语义正确、无灯箱残留、main 无内联 transform。
(() => {
  const de = document.documentElement;
  const main = document.querySelector('main');
  const sw = document.querySelector('[role="switch"]');
  const row = (el) => (el ? el.getBoundingClientRect() : null);

  const navLinks = [...document.querySelectorAll('header nav a')].map((a) => a.textContent.trim());
  const headings = [...document.querySelectorAll('h1, h2')].map((h) => h.textContent.trim()).slice(0, 4);

  return {
    path: location.pathname,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    横向溢出: de.scrollWidth - de.clientWidth,
    页面高: de.scrollHeight,
    scrollY: Math.round(window.scrollY),
    导航项: navLinks,
    主导航数: navLinks.length,
    标题: headings,
    图片数: document.querySelectorAll('img').length,
    断图: [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length,
    灯箱残留: document.querySelectorAll('[role="dialog"]').length,
    body锁定: document.body.style.overflow || '(空)',
    main内联transform: main ? main.style.transform || '(无)' : '无main',
    开关: sw
      ? {
          存在: true,
          角色: sw.getAttribute('role'),
          ariaChecked: sw.getAttribute('aria-checked'),
          可访问名: sw.getAttribute('aria-label'),
          轨道: (() => {
            const t = sw.querySelector('span[aria-hidden="true"]');
            const r = row(t);
            return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
          })(),
          尺寸: (() => {
            const r = row(sw);
            return { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) };
          })(),
        }
      : { 存在: false },
    语言样本: (document.body.innerText.match(/写下来的那些时候|Things I Wrote Down/) || [
      '(未匹配)',
    ])[0],
  };
})()
