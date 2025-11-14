# Test Checklist for Chat Loading, Persistence, Overflow, and Click Fixes

## Prerequisites
- Have a Telegram bot token ready
- Have at least 2-3 test chats to work with (private chats or groups)
- Use Chrome/Firefox/Safari for testing

---

## Test 1: Chat List Loading on Page Access ✅

### Steps:
1. Open the app in browser
2. Enter bot token and save settings
3. Start a conversation with the bot in Telegram
4. Wait for chat to appear in the web app
5. **Refresh the page** (F5 or Cmd+R)

### Expected Result:
- ✅ Chat list appears immediately after page refresh
- ✅ Previously loaded chats are visible in the sidebar
- ✅ No empty state message when chats exist
- ✅ Chat list is sorted by last message date

### Pass/Fail: ____

---

## Test 2: Message Persistence Across Sessions ✅

### Steps:
1. Open a chat
2. Send 3-5 messages to the bot
3. Wait for bot responses
4. Note down the last message text
5. **Close the browser completely**
6. Reopen the browser and navigate to the app
7. Look for the same chat

### Expected Result:
- ✅ All sent messages are still visible
- ✅ All received messages are still visible
- ✅ Message order is preserved
- ✅ Chat appears in the chat list with correct preview

### Pass/Fail: ____

---

## Test 3: Chat History Persistence with Multiple Bots ✅

### Steps:
1. Use Bot A: Send messages in Chat 1
2. Open settings, change to Bot B token
3. Send messages in Chat 2
4. Refresh page
5. Switch back to Bot A token
6. Check Chat 1 messages

### Expected Result:
- ✅ Bot A's chats are separate from Bot B's chats
- ✅ Each bot shows only its own conversation history
- ✅ Switching bots doesn't lose chat history
- ✅ Each bot's messages persist independently

### Pass/Fail: ____

---

## Test 4: Long Chat Name Wrapping ✅

### Steps:
1. Create a test case with a very long chat name:
   - Use a group chat with a name like: "This is an extremely long group chat name that should wrap to multiple lines without causing horizontal overflow issues"
   - Or test with a private chat with long first+last name
2. Look at the chat list in the sidebar
3. Resize browser window to narrow width

### Expected Result:
- ✅ Chat name wraps to maximum 2 lines
- ✅ No horizontal scrolling in chat list
- ✅ Text doesn't overflow outside the chat item box
- ✅ Ellipsis (...) appears if name exceeds 2 lines
- ✅ Other UI elements (avatar, badge, delete button) remain aligned

### Pass/Fail: ____

---

## Test 5: Chat Opening on Click ✅

### Steps:
1. Load app with 3+ chats in the list
2. Click on the first chat's name
3. Verify it opens
4. Click on the second chat's name
5. Verify it opens and first chat closes
6. Click on the third chat's avatar (not the name)
7. Verify it opens

### Expected Result:
- ✅ Clicking chat name opens that chat
- ✅ Chat messages display in main area
- ✅ Chat header shows correct chat title
- ✅ Input field is enabled and ready for typing
- ✅ Selected chat is highlighted in sidebar
- ✅ Previous chat is deselected
- ✅ Clicking anywhere in chat item (except delete button) opens chat

### Pass/Fail: ____

---

## Test 6: Chat Click on Different Areas ✅

### Steps:
1. In the chat list, try clicking on different parts of a chat item:
   - Click on the avatar circle
   - Click on the chat name text
   - Click on the last message preview
   - Click on empty space in the item
2. Verify each click opens the chat

### Expected Result:
- ✅ Clicking avatar opens chat
- ✅ Clicking chat name opens chat
- ✅ Clicking message preview opens chat
- ✅ Clicking any part of chat item opens chat (except delete button)
- ✅ Hovering shows hover effect

### Pass/Fail: ____

---

## Test 7: Delete Button Doesn't Interfere with Chat Click ✅

### Steps:
1. Hover over a chat item in the list
2. Observe the delete button (🗑️) appears
3. Click on the delete button
4. Cancel the confirmation dialog
5. Click on the chat item again (not the delete button)

### Expected Result:
- ✅ Delete button appears on hover
- ✅ Clicking delete button shows confirmation
- ✅ Clicking delete button does NOT open the chat
- ✅ Clicking elsewhere in chat item DOES open the chat
- ✅ Delete button is properly positioned and doesn't block text

### Pass/Fail: ____

---

## Test 8: Chat Messages Display Correctly ✅

### Steps:
1. Click on a chat with existing message history
2. Observe the messages area

### Expected Result:
- ✅ All messages are displayed
- ✅ Messages are in chronological order
- ✅ Sent messages appear on the right (blue)
- ✅ Received messages appear on the left (gray/light)
- ✅ Messages auto-scroll to bottom (if preference enabled)

### Pass/Fail: ____

---

## Test 9: New Message Persistence ✅

### Steps:
1. Open a chat
2. Send a new message: "Test message [timestamp]"
3. Immediately refresh the page (F5)
4. Open the same chat

### Expected Result:
- ✅ The new message is still visible after refresh
- ✅ Message appears in correct chronological position
- ✅ Chat preview in sidebar shows the new message

### Pass/Fail: ____

---

## Test 10: Mobile Responsive Behavior ✅

### Steps:
1. Resize browser to mobile width (< 768px)
2. Observe chat list (sidebar)
3. Click on a chat
4. Send a message

### Expected Result:
- ✅ Sidebar is hidden by default on mobile
- ✅ Menu toggle button is visible
- ✅ Clicking a chat hides the sidebar automatically
- ✅ Chat name still wraps properly on mobile
- ✅ All functionality works on mobile

### Pass/Fail: ____

---

## Test 11: No Console Errors ✅

### Steps:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform all the above tests
4. Monitor for any error messages

### Expected Result:
- ✅ No JavaScript errors in console
- ✅ No "undefined" errors
- ✅ No "Cannot read property" errors
- ✅ Only informational logs (if any)

### Pass/Fail: ____

---

## Test 12: Active Chat Restoration ✅

### Steps:
1. Open a specific chat (note which one)
2. Send a message to confirm it's active
3. Refresh the page
4. Observe which chat is selected

### Expected Result:
- ✅ The same chat is automatically opened after refresh
- ✅ Messages are displayed
- ✅ Input field is enabled and focused
- ✅ Chat is highlighted in sidebar

### Pass/Fail: ____

---

## Test 13: Edge Cases ✅

### Steps:
1. Test with chat name containing special characters: "Test 🚀 Chat & Co."
2. Test with empty message history (new chat)
3. Test with 50+ messages in a chat
4. Test with very long individual messages

### Expected Result:
- ✅ Special characters display correctly
- ✅ Empty chats don't cause errors
- ✅ Large message history loads correctly
- ✅ Long messages wrap properly (not tested here, but should work)

### Pass/Fail: ____

---

## Summary

Total Tests: 13  
Tests Passed: ____  
Tests Failed: ____  

### Critical Issues Found:
- None expected

### Minor Issues Found:
- None expected

### Notes:
- All fixes are CSS and JavaScript only
- No backend changes required
- No database migrations needed
- Works in all modern browsers

---

## Automated Testing Notes

For automated testing, consider:
1. Using Playwright or Cypress for E2E tests
2. Testing localStorage persistence with window.localStorage API
3. Mocking Telegram Bot API responses
4. Testing with various viewport sizes

---

## Sign-off

Tester Name: ________________  
Date: ________________  
Overall Result: PASS / FAIL  
Comments: ________________
