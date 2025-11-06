# Phase 1 Testing Guide

## Setup

1. **Load the Extension**
   ```
   Chrome: chrome://extensions/ → Enable Developer Mode → Load Unpacked → Select octogpt folder
   Firefox: about:debugging → This Firefox → Load Temporary Add-on → Select manifest.json
   ```

2. **Open Developer Console**
   - Chrome/Firefox: Press F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows/Linux)
   - Switch to the "Console" tab

3. **Navigate to ChatGPT**
   - Go to https://chat.openai.com/ or https://chatgpt.com/
   - Open an existing conversation or start a new one

## Expected Behavior

### On Page Load
You should see console messages like:
```
[OctoGPT] Content script loaded
[OctoGPT] Initializing...
[OctoGPT] Setting up...
[OctoGPT] Setting up MutationObserver...
[OctoGPT] MutationObserver active
[OctoGPT] Extracting prompts...
[OctoGPT] Found X prompts
```

### For Each Prompt
The console will display:
```
[OctoGPT] Extracted Prompts:
  1. Explain quan... 
     Full text: "Explain quantum computing in simple terms"
  2. Write a func... 
     Full text: "Write a function to calculate fibonacci"
```

### When Sending a New Message
1. Type a message in ChatGPT
2. Send it
3. Within ~300ms, you should see:
```
[OctoGPT] Detected changes, updating...
[OctoGPT] Extracting prompts...
[OctoGPT] Found X prompts
```

### When Editing a Prompt
1. Click the edit button on any prompt
2. Modify the text and submit
3. The console should show:
```
[OctoGPT] Detected changes, updating...
[OctoGPT] Found X prompts
[OctoGPT] Extracted Prompts:
  1. Original pro... 
  2. < Edited prom... > [EDITED/BRANCH]
     Full text: "Edited prompt text..."
     -> This is a branch point (edited prompt)
  3. Next prompt... [IN BRANCH]
```

### Branch Structure Detection
When branches exist:
```
[OctoGPT] Branch structure detected:
  - Branch points: 1
  - Prompts in active branch: 3
```

## Test Cases

### Test 1: Basic Extraction
- [ ] Open a conversation with 3-5 prompts
- [ ] Verify all prompts appear in console
- [ ] Verify previews are truncated to ~12 chars
- [ ] Verify full text is shown in logs

### Test 2: Real-time Detection
- [ ] Send a new message
- [ ] Verify console updates automatically
- [ ] Verify new prompt appears in the list

### Test 3: Multiple Messages
- [ ] Send 3-4 messages in quick succession
- [ ] Verify debouncing works (not updating after every keystroke)
- [ ] Verify all messages appear after sending

### Test 4: Branch Detection (if available)
- [ ] Edit an existing prompt
- [ ] Verify the edited prompt shows `[EDITED/BRANCH]`
- [ ] Verify subsequent prompts show `[IN BRANCH]`
- [ ] Verify branch structure is logged

### Test 5: Navigation Between Chats
- [ ] Switch to a different conversation
- [ ] Verify console shows "Navigation detected, re-initializing..."
- [ ] Verify old prompts are cleared
- [ ] Verify new conversation's prompts are extracted

### Test 6: Edge Cases
- [ ] Open an empty conversation (no messages yet)
- [ ] Send the first message
- [ ] Verify it's detected
- [ ] Try a conversation with very long prompts (100+ words)
- [ ] Verify truncation works correctly

## Debugging

### If no prompts are found:

1. **Check DOM selectors**
   ```javascript
   // In console:
   window.octogpt.parser.extractAllPrompts()
   ```

2. **Inspect message elements**
   ```javascript
   // Check what selector ChatGPT is using:
   document.querySelectorAll('[data-message-author-role="user"]')
   document.querySelectorAll('[data-testid^="conversation-turn-"]')
   ```

3. **Manual extraction**
   ```javascript
   // Force re-extraction:
   window.octogpt.extractAndLog()
   ```

### If MutationObserver isn't working:

1. Check if observer is active:
   ```javascript
   window.octogpt.observer
   ```

2. Manually trigger after sending a message:
   ```javascript
   window.octogpt.debouncedUpdate()
   ```

### Common Issues

**Issue**: "No conversation detected"
- **Cause**: Not on a conversation page
- **Fix**: Navigate to an actual chat (URL should have `/c/[conversation-id]`)

**Issue**: Prompts found but text is empty
- **Cause**: DOM selectors don't match ChatGPT's current structure
- **Fix**: Inspect elements and update selectors in `parser.js`

**Issue**: Updates not happening in real-time
- **Cause**: MutationObserver not detecting changes
- **Fix**: Check that you're on a conversation page, try refreshing

## Success Criteria

Phase 1 is successful if:
- ✓ Extension loads without errors
- ✓ Prompts are extracted and logged to console
- ✓ Preview text is properly truncated
- ✓ New messages are detected in real-time
- ✓ Navigation between conversations works
- ✓ Branch detection marks edited prompts
- ✓ No interference with ChatGPT's normal functionality

## Known Limitations

- DOM selectors are based on current ChatGPT structure (may break with updates)
- Branch detection is heuristic-based and may not work perfectly
- Some edge cases with deleted/regenerated messages may not be handled
- No UI yet - Phase 2 will add the sidebar

## Next Steps After Testing

Once Phase 1 is validated:
1. Document any issues found
2. Update selectors if needed
3. Proceed to Phase 2: Building the sidebar UI

