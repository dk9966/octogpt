# OctoGPT - ChatGPT Prompt Navigator

A browser extension that adds a sidebar to ChatGPT for navigating all your prompts in a conversation.

## Current Status: Phase 1 Complete

Phase 1 implements core prompt extraction with console logging validation.

### What Works Now

- Extracts all user prompts from ChatGPT conversations
- Detects edited prompts and conversation branches
- Real-time monitoring with MutationObserver
- Handles navigation between conversations
- Console logging for validation and debugging

## Installation (Development Mode)

**Chrome / Arc / Edge:**
1. Navigate to `chrome://extensions/` (or `arc://extensions/` for Arc)
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `octogpt` directory at `/Users/danielku/octogpt`

**Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file

**Arc Browser Users:** See `INSTALL_ARC.md` for detailed Arc-specific instructions.

## Testing Phase 1

1. Install the extension in development mode
2. Navigate to any ChatGPT conversation at `https://chat.openai.com/` or `https://chatgpt.com/`
3. Open the browser's Developer Console (F12 or Cmd+Option+I)
4. Look for `[OctoGPT]` log messages

### What to Look For

The extension will log:
- Number of prompts found
- List of all prompts with their previews (first ~12 characters)
- Branch indicators for edited prompts
- Full text preview for each prompt

### Testing Scenarios

1. **Basic conversation**: Open a conversation with several prompts
   - Should see all prompts listed in console
   - Each prompt should show preview text

2. **New message**: Type and send a new message
   - Should see console log update with new prompt
   - Real-time detection via MutationObserver

3. **Edited prompt**: Edit an existing prompt (click edit button)
   - Should detect the edit and mark it as `[EDITED/BRANCH]`
   - Subsequent prompts should show `[IN BRANCH]`

4. **Navigate between conversations**: Switch to a different chat
   - Should clear old prompts and extract new ones
   - Console should show re-initialization

### Console Commands for Debugging

In the browser console, you can access:

```javascript
// Get the OctoGPT instance
window.octogpt

// Manually trigger extraction
window.octogpt.extractAndLog()

// Get current prompts
window.octogpt.getPrompts()

// Access the parser directly
window.octogpt.parser
```

## Known Limitations (Phase 1)

- No UI yet (Phase 2)
- Branch detection is heuristic-based and may need refinement
- DOM selectors may break if ChatGPT updates their structure
- No actual navigation functionality yet (just extraction)

## Next Steps

- **Phase 2**: Build the sidebar UI
- **Phase 3**: Implement click-to-scroll navigation
- **Phase 4**: Add enhanced features (search, copy, etc.)
- **Phase 5**: Multi-chat persistence

## Project Structure

```
octogpt/
├── manifest.json           # Extension configuration
├── content/
│   ├── content.js         # Main content script with MutationObserver
│   ├── parser.js          # DOM parsing and extraction logic
│   └── styles.css         # Styles (empty in Phase 1)
├── assets/
│   └── icons/             # Extension icons (placeholders)
└── README.md              # This file
```

## Development Notes

- Uses Manifest V3 for future compatibility
- Follows clean code principles with proper separation of concerns
- Parser is isolated from main content script for testability
- Extensive console logging for Phase 1 validation
- Debounced updates to avoid excessive re-parsing

