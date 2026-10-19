/**
 * 英文图注映射表（人工翻译）。
 *
 * 为什么不直接写进 `*.generated.ts`：
 * `photos.generated.ts` / `projects.generated.ts` 由 `scripts/optimize-images.py`
 * 自动生成，重跑 `photos:build` / `projects:build` 会整体覆盖。
 * 英文翻译属于人工内容，放在这里按「源文件名」索引，生成文件重跑也不会丢。
 *
 * 键名：
 * - 照片用 `file`（如 `xiyang.jpg`）
 * - 课件页用 `file`（如 `slide-01.png`）
 */

/** 光影摄影墙：中文图注 → 英文图注 */
export const photoCaptionEn: Record<string, string> = {
  'yundonghui-ganrui.jpg': 'A boy at the track',
  'yundonghui-fei.jpg': 'A cheer at the sports meet',
  'yueying.jpg': 'Moonlight on a white wall',
  'yuandan.jpg': "Laughter on New Year's Day",
  'yishujiushiboom.jpg': 'Fireworks on a winter night',
  'yishujie.jpg': 'A beam of light at the arts festival',
  'yehua.jpg': 'Little yellow flowers by the road',
  'xiyang.jpg': 'Sunset through the treetops',
  'wanxia.jpg': 'Afterglow in a puddle',
  'tongzhen.jpg': 'Childhood on a tractor',
  'tiankong.jpg': "The sky's brushstrokes",
  'taohua.jpg': 'Peach blossoms by the road',
  'springfestival.jpg': 'New Year at the doorstep',
  'sky.jpg': 'Summer clouds',
  'shengridangao.jpg': 'Cake in the classroom',
  'renwu-xu.jpg': 'Him, through the lens',
  'peixianzhongxue-playground.jpg': 'The red track',
  'peixianzhongxue-hua.jpg': 'Spring outside the classroom window',
  'peixianzhongxue-dormitory.jpg': 'Spring on campus',
  'nanjingtower.jpg': 'Beneath the Nanjing tower',
  'laojushengtaiputaoyuan.jpg': 'A stream in the countryside',
  'hurry.jpg': 'A tricycle on the country road',
  'hua.jpg': 'A tree in peach blossom',
  'happybirthday.jpg': 'A handwritten wish',
  'hanchenggongyuan.jpg': 'Blue sky over Pei Palace',
  'hanchenggongyuan-tree.jpg': 'A nest in the tree',
  'hanchenggongyuan-lake.jpg': 'The city mirrored in the lake',
  'dog.jpg': 'A fluffy gaze',
  'cat-coffee.jpg': 'The cat and its afternoon',
  'buzhiming-flower.jpg': 'An unnamed tree in white',
  'bangwan-xiwang.jpg': 'Afterglow at the horizon',
  'AIdoubao.jpg': 'Spring couplets in the wind',
}

/** 作品集 PPT 课件：逐页英文图注 */
export const projectCaptionEn: Record<string, string> = {
  'slide-01.png': 'Cover: AI Is Already Here',
  'slide-02.png': 'First, guess: AI or human?',
  'slide-03.png': 'AI starts to take action',
  'slide-04.png': 'AI you can use on your phone',
  'slide-05.png': 'One person + AI: creation begins',
  'slide-06.png': 'Write a song without music theory',
  'slide-07.png': 'A short film in 48 hours',
  'slide-08.png': 'Competitions you can join now',
  'slide-09.png': 'What AI means for us',
  'slide-10.png': 'Nine things AI cannot take away',
  'slide-11.png': 'Tech for good: people matter most',
  'slide-12.png': 'From watching to steering',
  'slide-13.png': 'Remember the opening question?',
  'slide-14.png': 'The evolution of AI',
  'slide-15.png': 'Thank you',
}
