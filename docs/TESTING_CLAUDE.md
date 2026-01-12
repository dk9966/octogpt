# Claude Testing Guide

## Setup

1. **Load the Extension**
   ```
   Chrome: chrome://extensions/ -> Enable Developer Mode -> Load Unpacked -> Select octogpt folder
   Firefox: about:debugging -> This Firefox -> Load Temporary Add-on -> Select manifest.json
   ```

2. **Open Developer Console**
   - Chrome/Firefox: Press F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows/Linux)
   - Switch to the "Console" tab

3. **Navigate to Claude**
   - Go to https://claude.ai/
   - Sign in if needed
   - Open an existing conversation or start a new one

## Expected Behavior

### On Page Load
You should see console messages like:
```
[OctoGPT] Content script loaded
[OctoGPT] Detected Claude, initializing Claude parser...
[OctoGPT] Waiting for claude to be ready...
[OctoGPT] claude ready, initializing...
[OctoGPT] Setting up...
[OctoGPT] MutationObserver active
[OctoGPT] Initialized successfully
```

### For Each Prompt
The console will display (when DEBUG is enabled):
```
[OctoGPT] Extracting prompts...
[OctoGPT] Found X prompts
[OctoGPT] Extracted Prompts:
  1. First few c... 
     Full text: "First few characters of the prompt..."
```

### Sidebar Behavior
- **Slab appears**: A small tab should appear on the right edge of the screen
- **Hover to open**: Hovering over the slab should reveal the sidebar
- **Pin button**: Clicking the pin icon keeps the sidebar visible
- **Keyboard shortcut**: Cmd/Ctrl+H should toggle sidebar visibility

## Test Cases

### Test 1: Basic Extraction
- [ ] Open a Claude conversation with 3-5 prompts
- [ ] Verify the sidebar slab appears on the right
- [ ] Hover over the slab to open the sidebar
- [ ] Verify all prompts appear in the sidebar
- [ ] Verify prompt previews are truncated appropriately

### Test 2: Real-time Detection
- [ ] Send a new message to Claude
- [ ] Verify the sidebar updates automatically with the new prompt
- [ ] Verify the prompt appears within a few seconds

### Test 3: Click Navigation
- [ ] Click on a prompt in the sidebar
- [ ] Verify the conversation scrolls to that message
- [ ] Verify the clicked prompt is highlighted in the sidebar

### Test 4: Heading Extraction
- [ ] Ask Claude to respond with headings (e.g., "Explain X with sections")
- [ ] Verify headings appear under the prompt in the sidebar
- [ ] Click a heading to navigate to it
- [ ] Use the collapse button to hide/show headings

### Test 5: Navigation Between Chats
- [ ] Start from an existing conversation
- [ ] Click to open a different conversation
- [ ] Verify the sidebar clears and shows loading state
- [ ] Verify new conversation's prompts appear

### Test 6: New Chat Detection
- [ ] Click "New Chat" or navigate to claude.ai/new
- [ ] Verify sidebar shows "Start a conversation to see prompts here"
- [ ] Send a message
- [ ] Verify the prompt appears in the sidebar

### Test 7: Dark Mode
- [ ] Switch Claude to dark mode (if available in settings)
- [ ] Verify the sidebar and slab adapt to dark theme
- [ ] Verify all text is readable

### Test 8: Keyboard Navigation
- [ ] Open the sidebar
- [ ] Press Alt+Down to navigate to next item
- [ ] Press Alt+Up to navigate to previous item
- [ ] Press Alt+Shift+Down to skip headers and go to next prompt
- [ ] Verify conversation scrolls to selected item

### Test 9: Streaming Response
- [ ] Send a prompt that will generate a long response
- [ ] While Claude is typing, verify the sidebar shows "generating" indicator
- [ ] Verify headings appear as they are generated (with some delay)

### Test 10: Settings Panel
- [ ] Click the OctoGPT logo in the sidebar header
- [ ] Verify settings panel opens
- [ ] Adjust scroll duration slider
- [ ] Close panel with X or by clicking backdrop
- [ ] Navigate to a prompt and verify the new scroll duration is applied

## Debugging

### If no prompts are found:

1. **Enable debug logging**
   In `content/parser.js`, set:
   ```javascript
   const DEBUG = true;
   ```
   Then refresh the page.

2. **Check DOM selectors**
   ```javascript
   // In console:
   document.querySelectorAll('[data-testid*="message"]')
   document.querySelectorAll('[class*="human"]')
   document.querySelectorAll('[class*="assistant"]')
   ```

3. **Manual extraction**
   ```javascript
   // Force re-extraction:
   window.octogpt.extractAndLog()
   ```

### If sidebar doesn't appear:

1. Check if extension is loaded:
   ```javascript
   document.querySelector('#octogpt-root')
   ```

2. Check for errors in console

3. Verify manifest permissions are correct

### If dark mode doesn't work:

1. Check what attribute Claude uses for dark mode:
   ```javascript
   document.documentElement.getAttribute('data-theme')
   document.body.className
   ```

2. Update `styles.css` if the selector is different

## DOM Inspection Tips

Claude's DOM structure may differ from ChatGPT/Gemini. To find the correct selectors:

1. **Inspect a user message**:
   - Right-click on your message -> Inspect
   - Look for identifying attributes like `data-testid`, `class`, or custom tags
   - Note the parent containers

2. **Inspect an assistant message**:
   - Right-click on Claude's response -> Inspect
   - Look for markdown/prose containers
   - Note heading elements (h2, h3, etc.)

3. **Update selectors if needed**:
   - Edit `content/parser.js` ClaudeParser selectors
   - Edit `content/content.js` site-specific checks
   - Refresh and test

## Success Criteria

Claude support is successful if:
- [ ] Extension loads without errors on claude.ai
- [ ] All user prompts are extracted and displayed
- [ ] Real-time updates work when sending messages
- [ ] Click-to-scroll navigation works
- [ ] Heading extraction and display works
- [ ] Dark mode styling works
- [ ] No interference with Claude's normal functionality
- [ ] Keyboard shortcuts work

## Known Limitations

1. **No Branch Support**: Claude doesn't have conversation branching like ChatGPT, so the angle bracket indicators will not appear.

2. **DOM Changes**: If Claude updates their interface, selectors may need adjustment.

3. **Streaming Headings**: Headings may not appear immediately during streaming; they are captured on subsequent polls.

## Reporting Issues

If you encounter issues:
1. Enable DEBUG mode
2. Capture console output
3. Note the specific URL pattern
4. Take a screenshot of the DOM structure if selectors are failing
5. Document steps to reproduce
