import styles from './Epigraph.module.css'

/** 需要在其后断句的标点：中英都覆盖，做到「一句话一行」 */
const BREAK_CHARS = ['，', '。', '、', '；', '：', '！', '？', ',', '.', ';', ':', '!', '?']

/**
 * 按标点把一句话切成若干行 —— 每行就是一句，读起来有节奏。
 *
 * 不用正则 lookbehind（旧 Safari 不支持），直接逐字扫描，稳妥且行为一致。
 */
function splitLines(text: string): string[] {
  const lines: string[] = []
  let current = ''
  for (const ch of text) {
    current += ch
    if (BREAK_CHARS.includes(ch)) {
      lines.push(current.trim())
      current = ''
    }
  }
  if (current.trim() !== '') lines.push(current.trim())
  return lines.length > 0 ? lines : [text]
}

interface EpigraphProps {
  /** 寄语原文（dict 里维护，中英各一份） */
  text: string
  /** lg = 更醒目的大一句（如留言板那句诗词）；默认 base */
  size?: 'base' | 'lg'
}

/**
 * 板块寄语 / 金句 —— 放在页面**最下方**（照片、作品、表单都展示完之后）。
 *
 * 排版要点：
 * - 按标点断句，一句话一行，短句绝不会被挤进别的段落；
 * - 限宽 600–800px + margin: 0 auto 水平居中，绝不横跨宽屏；
 * - 中英合一的衬线字体（思源宋体 / Cormorant Garamond），字距微开、行高 1.8，有呼吸感；
 * - 上方一条细分隔线，像书签一样把寄语和内容区分开。
 *
 * 以后新增板块，直接在页面末尾放一行即可：
 *   <Epigraph text={t.epigraph} />
 */
export default function Epigraph({ text, size = 'base' }: EpigraphProps) {
  const lines = splitLines(text)

  return (
    <p className={`${styles.wrap} ${size === 'lg' ? styles.lg : ''}`} data-reveal>
      {lines.map((line, index) => (
        // 行内容本身是静态文案，用下标做 key 是安全的
        <span key={index} className={styles.line}>
          {line}
        </span>
      ))}
    </p>
  )
}
