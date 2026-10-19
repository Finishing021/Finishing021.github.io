import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { aboutDict, type AboutCopy, type Lang } from './dict'

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  /** 当前语言的「关于我」文案 */
  t: AboutCopy
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({
  children,
  /* 全站默认中文；右上角开关一拨即切。切换只存在内存里，刷新回到中文。 */
  initial = 'zh',
}: {
  children: ReactNode
  initial?: Lang
}) {
  const [lang, setLang] = useState<Lang>(initial)

  const toggle = useCallback(() => {
    setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))
  }, [])

  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, toggle, t: aboutDict[lang] }),
    [lang, toggle],
  )

  /*
   * 把当前语言同步到 <html lang>：
   * 读屏器据此选择发音，浏览器据此优化字体回退，也方便 CSS 用 :lang() 做英文微调。
   */
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) {
    throw new Error('useLang 必须在 <LangProvider> 内部使用')
  }
  return ctx
}
