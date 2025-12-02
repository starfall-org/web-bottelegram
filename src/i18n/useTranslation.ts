import { useBotStore, type BotState } from '@/store/botStore'
import { translations, type Language, type Translation } from './translations'

export function useTranslation() {
  const language = useBotStore((state: BotState) => state.language)
  
  const translationObj: Translation = translations[language as Language] || translations.vi
  
  const t = (path: string): string => {
    return getNestedTranslation(translationObj, path)
  }
  
  const changeLanguage = (newLanguage: Language) => {
    useBotStore.getState().setLanguage(newLanguage)
  }
  
  return {
    t,
    language,
    changeLanguage
  }
}

// Helper function for nested translation keys
export function getNestedTranslation(obj: any, path: string): string {
  return path.split('.').reduce((curr, key) => curr?.[key], obj) || path
}

// Format function with placeholders
export function formatMessage(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key]?.toString() || match
  })
}