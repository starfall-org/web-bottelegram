# Web client for Telegram bots

A modern, modular single-page Telegram bot client built with Vanilla JavaScript and Vite.

## Features

- **Multi-chat interface** with sidebar and message history
- **Real-time messaging** via Telegram Bot API polling
- **Media support** for photos, videos, audio, documents, and stickers (regular, animated, and video formats)
- **Inline message replies** and message deletion
- **Group management** with admin actions (kick members, promote/demote admins)
- **Bot profile-based storage** using cookies for maintaining separate chat history per bot
- **Local notifications** with visual toasts and browser notifications
- **Responsive design** with mobile support
- **CORS proxy support** for API access

## Project Structure

```
src/
├── main.js                    # Application entry point
├── index.html                 # HTML template
├── styles/
│   └── main.css              # Global styles
└── modules/
    ├── api/                  # Telegram Bot API module
    │   └── bot.js
    ├── state/                # Application state management
    │   └── appState.js
    ├── storage/              # Cookie-based persistence
    │   └── cookieStorage.js
    ├── ui/                   # UI rendering
    │   ├── dom.js
    │   └── render.js
    ├── admin/                # Group admin functions
    │   └── admin.js
    ├── notifications/        # Notification system
    │   └── notifications.js
    └── utils/                # Helper functions
        └── helpers.js
```

## Getting Started

### Development

```bash
npm install
npm run dev
```

This will start a development server with hot module reloading.

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
2. Open the application and click "Cài đặt" (Settings)
3. Enter your Bot Token
4. Optionally add a CORS proxy prefix if needed for API access
5. Click "Lưu & Kết nối" (Save & Connect)
6. The bot will start polling for updates and display incoming messages

## Storage

- **Bot Token**: Stored in localStorage for persistence
- **Chat History**: Stored in cookies, organized by bot profile
- **Update IDs**: Stored in cookies for polling continuity
- **Bot Info**: Cached in cookies for quick access

### Cookie Storage Keys

- `tg_bot_chat_[profileId]`: Chat history for a bot profile
- `tg_bot_info_[profileId]`: Bot information cache
- `tg_last_update_id`: Last received update ID for polling

## Sticker Support

The application supports multiple sticker formats:

- **Static stickers** (.webp): Regular PNG stickers displayed as images
- **Animated stickers** (.tgs): Displayed with emoji placeholder (no native browser support for TGS)
- **Video stickers** (.webm): Animated stickers with autoplay

## License

This project is released under the [GNU General Public License v3.0](LICENSE).

[![License: GNU GPL v3](https://img.shields.io/badge/License-GNU%20GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
