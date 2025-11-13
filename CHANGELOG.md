# Changelog

## [Unreleased]

### Fixed
- **Chat History Restoration on Page Reload** (Issue: Chat history lost on page reload)
  - Root cause: The `normalizeChat()` function in `appState.js` was not ensuring the `messages` array property existed when deserializing chat data from localStorage
  - When chat history was loaded from storage, if the `messages` property was undefined or not an array, the `renderChatMessages()` function would fail to render messages
  - Solution: Added explicit check in `normalizeChat()` to ensure `messages` is always initialized as an array
  - Impact: Chat history now correctly persists and restores across page reloads
  - Files modified:
    - `src/modules/state/appState.js` - Added messages array initialization in `normalizeChat()`

### Changed
- Updated `.gitignore` to include `dist/` directory to prevent build artifacts from being committed

## Testing
- Created and ran unit test to verify save/load cycle works correctly
- Confirmed that:
  - Messages array is properly serialized when saving to localStorage
  - Messages array is properly deserialized when loading from localStorage
  - All chat properties (messages, messageIds, members, permissions) are correctly restored
  - Multiple bot profiles can maintain separate chat histories

## Technical Details
The fix ensures that when a chat object is normalized (either from storage or from API data), all required properties are present:
- `messageIds` - Set of message IDs
- `members` - Map of chat members
- `messages` - Array of message objects (THIS WAS MISSING)
- `permissions` - Object with permission flags
- `avatarText` - String for display avatar

Without the `messages` array initialization, loaded chats would have `messages: undefined`, causing the UI to fail rendering the chat history even though the data was correctly stored in localStorage.
