/**
 * 光影照片分类配置（AI 按文件名自动分类 + 手动微调）。
 *
 * 设计目标：
 * - **自动分类**：根据 `assets-source/photos/` 里的文件名关键词，把每张照片分到
 *   风景 / 人像 / 日常 之一。加新照片只要文件名带关键词，不用改这里。
 * - **手动微调**：猜不准或想纠偏时，往 `MANUAL_OVERRIDES` 写一行
 *   `文件名(去扩展名小写): '分类'` 即可，优先级高于关键词规则。
 * - 真正在用的分类入口是 `categoryOf(fileName)`，组件只调它。
 *
 * 分类口径（与需求一致）：
 *   风景  —— 风景 / 建筑 / 植物 / 天空
 *   人像  —— 人物 / 背影 / 活动照片
 *   日常  —— 动物 / 静物 / 随手拍
 *   实在猜不出来的 → 日常（最安全，不会误进「人像」这种强语义类）。
 */

export type PhotoCategory = 'all' | 'scenery' | 'portraits' | 'daily'

/** 除「全部」外的实际分类顺序，用于渲染胶囊按钮。 */
export const CATEGORY_ORDER: Exclude<PhotoCategory, 'all'>[] = ['scenery', 'portraits', 'daily']

/*
 * 关键词 → 分类。命中任意一个子串即归该类（文件名已转小写，子串匹配）。
 * 顺序即优先级：风景在前，日常兜底关键词在后；具体纠偏交给 MANUAL_OVERRIDES。
 */
const KEYWORD_RULES: Array<[Exclude<PhotoCategory, 'all'>, string[]]> = [
  [
    'scenery',
    [
      'xiyang', // 夕阳
      'taohua', // 桃花
      'lake', // 湖
      'yuan', // 园（公园 / 葡萄园）
      'tiankong', // 天空
      'sky',
      'hua', // 花
      'tree', // 树
      'wanxia', // 晚霞
      'yueying', // 月影
      'yehua', // 叶 / 花
      'bangwan', // 傍晚
      'tower', // 塔 / 建筑
      'hanchnegongyuan',
      'putaoyuan',
      'gongyuan',
      'flower', // 英文花名
    ],
  ],
  [
    'portraits',
    [
      'renwu', // 人物
      'yundonghui', // 运动会（活动）
      'happybirthday',
      'yishujie', // 艺术节（活动）
      'shengri', // 生日
    ],
  ],
  [
    'daily',
    [
      'dog', // 狗
      'buddha',
      'cat', // 猫
      'coffee',
      'doubao', // 豆包（食物 / 随手拍）
    ],
  ],
]

/*
 * 手动覆盖：文件名(去扩展名、小写) → 分类。
 * 用于关键词命中了但不想让它进那一类的情况（例如 yuandan 含 "yuan" 会被归风景，
 * 但元旦是节日随手拍，显式拉回日常），或纯靠关键词猜不准的。
 * 以后你改分类，基本只动这块。
 */
const MANUAL_OVERRIDES: Record<string, Exclude<PhotoCategory, 'all'>> = {
  yuandan: 'daily',
  springfestival: 'daily',
  yishujiushiboom: 'daily',
  hurry: 'daily',
  tongzhen: 'daily',
  'peixianzhongxue-playground': 'daily',
  'peixianzhongxue-dormitory': 'daily',
  aidoubao: 'daily',
}

/**
 * 由文件名推断分类。
 * @param fileName 照片源文件名（含或不含扩展名均可；取 `file` 字段即可）
 */
export function categoryOf(fileName: string): Exclude<PhotoCategory, 'all'> {
  const base = fileName.replace(/\.[^.]+$/, '').toLowerCase()

  const override = MANUAL_OVERRIDES[base]
  if (override) return override

  for (const [category, keys] of KEYWORD_RULES) {
    if (keys.some((key) => base.includes(key))) return category
  }

  // 兜底：猜不出归日常
  return 'daily'
}
