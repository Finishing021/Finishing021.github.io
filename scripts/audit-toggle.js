// 语言开关回归：默认中文 → 点一下变英文 → 再点回中文。
// 同时记录三态的几何，确认切换时导航不抖动。
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sw = () => document.querySelector('[role="switch"]');
  const nav = () => document.querySelector('header nav');
  const snap = (tag) => {
    const s = sw();
    const t = s.querySelector('span[aria-hidden="true"]');
    const knob = t.querySelector('span');
    const r = s.getBoundingClientRect();
    return {
      阶段: tag,
      'aria-checked': s.getAttribute('aria-checked'),
      可访问名: s.getAttribute('aria-label'),
      导航项: [...document.querySelectorAll('header nav a')].map((a) => a.textContent.trim()),
      导航宽: Math.round(nav().getBoundingClientRect().width * 100) / 100,
      开关: `${Math.round(r.width)}x${Math.round(r.height)}`,
      开关左: Math.round(r.left * 100) / 100,
      圆点位移: getComputedStyle(knob).transform,
    };
  };

  await sleep(400);
  const a = snap('① 初始');

  sw().click();
  await sleep(700);
  const b = snap('② 点一下');

  sw().click();
  await sleep(700);
  const c = snap('③ 再点一下');

  return {
    三态: [a, b, c],
    '首次进入是中文': a['aria-checked'] === 'false',
    '点击后变英文': b['aria-checked'] === 'true',
    '可切回中文': c['aria-checked'] === 'false',
    '开关宽度稳定': a.开关 === b.开关 && b.开关 === c.开关,
    '开关位置稳定': a.开关左 === b.开关左 && b.开关左 === c.开关左,
  };
})()
