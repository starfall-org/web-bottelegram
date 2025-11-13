/**
 * Internationalization (i18n) module
 */

import { translations } from './translations.js';

const LANGUAGE_KEY = 'tg_language';
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'vi'];

let currentLanguage = DEFAULT_LANGUAGE;

/**
 * Detect browser language
 */
export function detectBrowserLanguage() {
  const browserLang = navigator.language || navigator.userLanguage || '';
  const lang = browserLang.toLowerCase();
  
  // Check if it's Vietnamese
  if (lang.startsWith('vi')) {
    return 'vi';
  }
  
  // Default to English for everything else
  return 'en';
}

/**
 * Get saved language preference or detect from browser
 */
export function getInitialLanguage() {
  // Check if user has a saved preference
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
    return saved;
  }
  
  // First visit - detect from browser
  const detected = detectBrowserLanguage();
  return detected;
}

/**
 * Initialize i18n system
 */
export function initI18n() {
  currentLanguage = getInitialLanguage();
  // Save detected language for future visits
  saveLanguage(currentLanguage);
  return currentLanguage;
}

/**
 * Get current language
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Set language
 */
export function setLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    console.warn(`Language ${lang} not supported, falling back to ${DEFAULT_LANGUAGE}`);
    lang = DEFAULT_LANGUAGE;
  }
  currentLanguage = lang;
  saveLanguage(lang);
  return lang;
}

/**
 * Save language preference
 */
export function saveLanguage(lang) {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch (e) {
    console.warn('Failed to save language preference:', e);
  }
}

/**
 * Get translation for a key
 * Supports placeholder replacement: t('hello', { name: 'World' }) -> "Hello, World!"
 */
export function t(key, params = {}) {
  const langData = translations[currentLanguage] || translations[DEFAULT_LANGUAGE];
  let text = langData[key] || translations[DEFAULT_LANGUAGE][key] || key;
  
  // Replace placeholders like {name}, {error}, etc.
  Object.keys(params).forEach(param => {
    const placeholder = `{${param}}`;
    text = text.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), params[param]);
  });
  
  return text;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Get language name
 */
export function getLanguageName(lang) {
  const names = {
    'en': 'English',
    'vi': 'Tiếng Việt'
  };
  return names[lang] || lang;
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(lang) {
  return SUPPORTED_LANGUAGES.includes(lang);
}
