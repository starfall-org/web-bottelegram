# Bottlegram - Modern Telegram Bot Client

A modern, React-based Telegram bot client built with TypeScript, shadcn/ui, and Vite. Previously converted from Vanilla JavaScript to provide better developer experience and maintainability.

## Features

- **Modern React Architecture** with TypeScript and hooks
- **Multi-language Support** (Vietnamese & English)
- **Multi-chat interface** with sidebar and message history
- **Real-time messaging** via Telegram Bot API polling with Grammy.js
- **Media support** for photos, videos, audio, documents, and stickers
- **Markdown & Code Highlighting** with syntax highlighting for code blocks
- **Inline message replies** and message deletion
- **Bot profile-based storage** using localStorage with Zustand persistence
- **Local notifications** with visual toasts and browser notifications
- **Responsive design** with Tailwind CSS
- **Modern UI Components** powered by shadcn/ui and Radix UI
- **CORS proxy support** for API access
- **Comprehensive Settings** with tabbed configuration interface

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **shadcn/ui** components built on Radix UI
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Grammy.js** for Telegram Bot API
- **Lucide React** for icons
- **React Syntax Highlighter** for code block highlighting

## Project Structure

```
src/
├── main.tsx                   # Application entry point
├── index.html                 # HTML template
├── components/
│   ├── App.tsx               # Main application component
│   ├── Sidebar.tsx           # Chat list sidebar
│   ├── ChatArea.tsx          # Main chat interface
│   ├── ChatList.tsx          # Chat list with search
│   ├── InputArea.tsx         # Message input area
│   ├── MessageList.tsx       # Message display area
│   ├── SettingsDialog.tsx    # Comprehensive settings
│   ├── ThemeProvider.tsx     # Theme context provider
│   └── ui/                   # shadcn/ui components
├── hooks/
│   └── useBotConnection.ts   # Bot connection & polling
├── services/
│   └── botService.ts         # Grammy.js bot service
├── store/
│   └── botStore.ts           # Zustand state management
├── i18n/
│   ├── translations.ts       # Translation definitions
│   └── useTranslation.ts     # Translation hook
├── lib/
│   └── utils.ts              # Utility functions
└── styles/
    └── globals.css           # Global styles & Tailwind
```

## Getting Started

### Development

```bash
npm install
npm run dev
```

This will start a development server with hot module reloading at `http://localhost:5173`.

### Building

```bash
npm run build
```

The built application will be in the `dist/` directory.

### Preview

```bash
npm run preview
```

Preview the production build locally.

## Usage

1. Get a Telegram Bot Token from [BotFather](https://t.me/botfather)
2. Open the application and click the Settings icon in the sidebar
3. Go to the "Connection" tab and enter your Bot Token
4. Optionally add a CORS proxy prefix if needed for API access
5. Click "Save & Connect" or "Test Connection"
6. The bot will start polling for updates and display incoming messages
7. Use the "Appearance" tab to switch themes (Light/Dark/System) and languages (Vietnamese/English)

### Markdown Support

The application supports Telegram's markdown formats:

- **HTML Mode**: `<b>bold</b>`, `<i>italic</i>`, `<code>code</code>`, `<pre>code block</pre>`
- **MarkdownV2**: `**bold**`, `__italic__`, `` `code` ``, ` ```language\ncode\n``` `
- **Markdown (legacy)**: `*bold*`, `_italic_`, `` `code` ``

#### Code Blocks with Syntax Highlighting

Send code blocks with language specification for automatic syntax highlighting:

```
```python
def hello():
    print("Hello, World!")
```
```

Supported languages include: python, javascript, typescript, java, c, cpp, go, rust, php, ruby, and many more.

The syntax highlighting automatically adapts to your selected theme (light/dark).

## Storage

- **Bot Token**: Stored in localStorage with Zustand persistence
- **Chat History**: Stored in localStorage, organized by chat ID
- **Settings**: Theme, language, and preferences persisted
- **Update IDs**: Tracked for polling continuity
- **Bot Info**: Cached for quick access

## Internationalization

The application supports multiple languages:

- **Vietnamese (vi)**: Default language with comprehensive translations
- **English (en)**: Full English translation support

Language can be switched in Settings > Appearance > Language.

## Settings Features

### Connection Tab

- Bot token configuration
- CORS proxy setup
- Connection testing
- Current bot information display
- Webhook deletion
- Data clearing

### Appearance Tab

- Theme selection (Light/Dark/System)
- Language switching
- Real-time theme preview

### Preferences Tab

- Auto-scroll behavior
- Notification sounds
- Push notifications
- Application preferences

### About Tab

- Version information
- Framework details
- Polling status
- Copyright information

## State Management

The application uses Zustand for state management with the following features:

- **Persistent Storage**: Automatic localStorage persistence
- **Type Safety**: Full TypeScript support
- **Chat Management**: Efficient chat and message handling
- **Settings Sync**: Synchronized theme and language settings
- **Connection State**: Real-time connection status tracking

## Bot Integration

Built with Grammy.js for robust Telegram Bot API integration:

- **Real-time Polling**: Automatic message polling and processing
- **File Handling**: Support for all Telegram media types
- **Error Handling**: Comprehensive error management
- **API Methods**: Full support for Telegram Bot API methods

## Development Notes

This project was migrated from Vanilla JavaScript to React while maintaining all original functionality. The migration includes:

- Modern component architecture
- Type safety with TypeScript
- Improved developer experience
- Better code organization
- Enhanced UI with shadcn/ui
- Comprehensive internationalization

## License

This project is released under the [GNU General Public License v3.0](LICENSE).

[![License: GNU GPL v3](https://img.shields.io/badge/License-GNU%20GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
