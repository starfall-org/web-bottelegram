# Telegram Bot Web UI - Replit Project

## Overview

A modern, modular single-page Telegram bot client built with Vanilla JavaScript and Vite. This web application provides a complete interface for interacting with Telegram bots, featuring multi-chat support, media handling, group management, and real-time notifications.

**Current State:** Fully configured and running on Replit with development server on port 5000.

## Recent Changes

**November 11, 2025**
- Initial project import from GitHub
- Configured Vite dev server for Replit environment:
  - Server bound to `0.0.0.0:5000` for webview access
  - HMR configured with WSS protocol and clientPort 443 for Replit's proxy
- Set up development workflow (`npm run dev`)
- Updated .gitignore for Replit-specific files
- **UI/UX Improvements**:
  - Fixed chat list rendering to display immediately on page load
  - Updated chat name display to wrap long names (up to 2 lines) instead of truncating
  - Added close button (X) to sidebar header for mobile devices
  - Improved sidebar mobile experience with dedicated close action

## Project Architecture

### Technology Stack
- **Framework:** Vanilla JavaScript (ES6+ modules)
- **Build Tool:** Vite 5.0
- **Storage:** LocalStorage (bot token) + Cookies (chat history, bot info)
- **API:** Telegram Bot API with optional CORS proxy support

### File Structure
```
src/
├── main.js                    # Application entry point
├── index.html                 # HTML template
├── styles/
│   └── main.css              # Global styles
└── modules/
    ├── api/                  # Telegram Bot API integration
    │   └── bot.js
    ├── state/                # Application state management
    │   └── appState.js
    ├── storage/              # Cookie-based persistence
    │   └── cookieStorage.js
    ├── ui/                   # UI rendering & DOM management
    │   ├── dom.js
    │   └── render.js
    ├── admin/                # Group admin functions
    │   └── admin.js
    ├── notifications/        # Notification system
    │   └── notifications.js
    └── utils/                # Helper functions
        └── helpers.js
```

### Key Features
1. **Multi-chat Interface:** Sidebar with chat list and message history
2. **Real-time Messaging:** Telegram Bot API polling for updates
3. **Media Support:** Photos, videos, audio, documents, stickers (static, animated, video)
4. **Message Management:** Inline replies, message deletion
5. **Group Administration:** Member management, role assignment, permissions
6. **Notifications:** Visual toasts and browser push notifications
7. **Theme Support:** Light, dark, and system theme options
8. **Responsive Design:** Mobile-friendly interface

### Storage Architecture
- **LocalStorage:** Bot token and CORS proxy settings
- **Cookies (by bot profile):**
  - `tg_bot_chat_[profileId]`: Chat history
  - `tg_bot_info_[profileId]`: Bot information cache
  - `tg_last_update_id`: Last received update ID for polling

## Development

### Running the Project
The Vite development server is configured as a workflow and runs automatically:
```bash
npm run dev
```
Access the application through the Replit webview (automatically proxied).

### Building for Production
```bash
npm run build
```
Output: `dist/` directory

### Preview Production Build
```bash
npm run preview
```

## Usage Instructions

1. **Get Bot Token:** Create a bot via [@BotFather](https://t.me/botfather) on Telegram
2. **Configure:** Click Settings (⚙️) in the app
3. **Enter Token:** Paste your Bot Token
4. **Optional CORS Proxy:** Add prefix if needed for API access (e.g., `https://cors.isomorphic-git.org/`)
5. **Connect:** Click "Lưu & Kết nối" (Save & Connect)
6. **Start Chatting:** The bot will begin polling for messages

### Troubleshooting
- **409 Error (Conflict):** Delete webhook in settings
- **CORS Issues:** Add a CORS proxy prefix in settings
- **No Messages:** Ensure bot token is valid and bot has been messaged

## Configuration

### Vite Configuration
- Root directory: `src/`
- Build output: `dist/`
- Dev server: `0.0.0.0:5000` (Replit webview compatible)
- HMR: Configured for WSS over port 443 (Replit proxy)

## User Preferences

*No specific user preferences recorded yet. This section will be updated as preferences are established.*

## Notes

- This is a frontend-only application (no backend server required)
- All API calls are made directly to Telegram Bot API
- Uses cookie storage for persistence (chat history survives page refresh)
- Supports Vietnamese language interface by default
