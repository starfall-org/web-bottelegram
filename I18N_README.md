# Internationalization (i18n) Feature

## Overview

The application now supports multiple languages with English and Vietnamese translations. The language system automatically detects the user's browser language on first visit and allows manual switching via the Settings panel.

## Supported Languages

- **English (en)**: Default language for all non-Vietnamese users
- **Vietnamese (vi)**: For users with Vietnamese browser settings

## Features

### 1. Automatic Language Detection
- On first visit, the app detects the browser's language setting
- If browser language is Vietnamese (`vi` or `vi-VN`), Vietnamese is used
- All other languages default to English
- Language preference is saved in localStorage for subsequent visits

### 2. Manual Language Switching
- Language can be changed in the Settings panel (gear icon)
- Two language options available: English and Vietnamese
- Language choice is immediately applied to all UI elements
- Setting is persisted across browser sessions

### 3. Complete Translation Coverage
All user-facing text is translated, including:
- Navigation and menu items
- Button labels and tooltips
- Dialog headers and content
- Status messages and notifications
- Error messages and alerts
- Form placeholders
- Settings options
- Member management interface
- Toast notifications

## Technical Implementation

### Module Structure

```
src/modules/i18n/
├── i18n.js          # i18n manager with language detection and switching
└── translations.js  # Translation dictionaries for all languages
```

### Key Functions

**i18n.js**
- `initI18n()` - Initialize i18n system with auto-detection
- `getCurrentLanguage()` - Get current active language
- `setLanguage(lang)` - Switch to a specific language
- `t(key, params)` - Translate a key with optional parameter replacement
- `detectBrowserLanguage()` - Detect browser's preferred language

**translations.js**
- Exports `translations` object with language dictionaries
- Supports parameter placeholders like `{name}`, `{error}`, `{count}`

### Usage Example

```javascript
import * as i18n from './modules/i18n/i18n.js';

// Initialize
i18n.initI18n();

// Get translated text
const message = i18n.t('welcome');

// With parameters
const error = i18n.t('networkError', { error: 'Connection timeout' });
```

### HTML Integration

Use `data-i18n` attribute for static elements:
```html
<h3 data-i18n="settingsTitle">Settings</h3>
<button data-i18n="save">Save</button>
```

The `updateAllUIText()` function automatically updates all elements with `data-i18n` attributes when the language changes.

## Adding New Translations

To add a new translation key:

1. Add the key to both `en` and `vi` objects in `translations.js`:

```javascript
export const translations = {
  en: {
    myNewKey: 'My English text',
    // ...
  },
  vi: {
    myNewKey: 'Văn bản tiếng Việt của tôi',
    // ...
  }
};
```

2. Use in code:
```javascript
const text = i18n.t('myNewKey');
```

3. Or add to HTML:
```html
<span data-i18n="myNewKey">Default text</span>
```

## Parameter Replacement

Translations support parameter replacement for dynamic content:

```javascript
// Translation definition
{
  greeting: 'Hello, {name}!',
  itemCount: 'You have {count} items'
}

// Usage
i18n.t('greeting', { name: 'John' });  // "Hello, John!"
i18n.t('itemCount', { count: 5 });     // "You have 5 items"
```

## Storage

- **Key**: `tg_language`
- **Storage**: localStorage
- **Values**: `'en'` or `'vi'`

## Browser Compatibility

The i18n system uses standard browser APIs and is compatible with all modern browsers:
- Uses `navigator.language` for detection
- Falls back gracefully if language preference can't be saved

## Future Enhancements

Potential improvements for the i18n system:
- Add more languages (Spanish, French, etc.)
- RTL (Right-to-Left) support for Arabic, Hebrew, etc.
- Date/time localization
- Number formatting localization
- Pluralization rules
- Translation loading from external files
