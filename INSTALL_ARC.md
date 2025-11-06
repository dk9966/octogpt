# Installing OctoGPT in Arc Browser

Arc is Chromium-based, so it uses the same extension system as Chrome.

## Installation Steps

### Method 1: Using Arc's Extension Manager

1. **Open Extensions Page**
   - In Arc, press `Cmd+T` to open command bar
   - Type "extensions" and press Enter
   - Or navigate to: `arc://extensions/`

2. **Enable Developer Mode**
   - Look for "Developer mode" toggle in the top right corner
   - Turn it ON

3. **Load the Extension**
   - Click the "Load unpacked" button (appears after enabling Developer mode)
   - Navigate to your `octogpt` folder: `/Users/danielku/octogpt`
   - Click "Select" or "Open"

4. **Verify Installation**
   - You should see "OctoGPT" appear in your extensions list
   - Make sure it's enabled (toggle should be ON/blue)

### Method 2: Direct URL

1. Copy this and paste in Arc's address bar:
   ```
   arc://extensions/
   ```

2. Enable "Developer mode" (top right)

3. Click "Load unpacked" → Select `/Users/danielku/octogpt`

## Testing

1. **Navigate to ChatGPT**
   - Go to https://chat.openai.com/ or https://chatgpt.com/
   - Open any conversation

2. **Open Developer Console**
   - Right-click anywhere → "Inspect Element"
   - Or press `Cmd+Option+I`
   - Click the "Console" tab

3. **Check for OctoGPT Messages**
   - Look for green `[OctoGPT]` messages
   - Should see: "Content script loaded", "Initializing...", "Found X prompts"

## Expected Output

```
[OctoGPT] Content script loaded
[OctoGPT] Initializing...
[OctoGPT] Setting up...
[OctoGPT] Extracting prompts...
[OctoGPT] Found 4 prompts
[OctoGPT] Extracted Prompts:
  1. Explain quan...
  2. Write a func...
  3. Debug this c...
  4. Create a sim...
```

## Troubleshooting

### Extension Not Loading?
- Make sure you selected the `octogpt` folder (not a subfolder)
- The folder should contain `manifest.json` directly

### No Console Messages?
- Refresh the ChatGPT page after installing
- Make sure you're on a conversation page (URL has `/c/`)
- Check that the extension is enabled in `arc://extensions/`

### Permission Issues?
- Arc may ask for permission to access chat.openai.com
- Click "Allow" when prompted

## Quick Test Commands

Open console and try:

```javascript
// Check if OctoGPT loaded
window.octogpt

// Force extraction
window.octogpt.extractAndLog()

// Get current prompts
window.octogpt.getPrompts()
```

## Arc-Specific Notes

- Arc handles extensions the same way as Chrome
- Extensions appear in Arc's sidebar under the Extensions section
- You can pin/unpin the extension icon to Arc's toolbar
- Arc respects all Chrome extension APIs

## What's Working (Phase 1)

Right now the extension:
- ✓ Extracts all prompts from conversations
- ✓ Monitors for new messages in real-time
- ✓ Detects edited prompts (branches)
- ✓ Logs everything to console

**No UI yet** - Phase 2 will add the sidebar!

## Next Steps

Once you see the console messages working:
1. Send a test message in ChatGPT
2. Watch the console update automatically
3. Verify your prompts are being extracted

Then we're ready for Phase 2: building the actual sidebar UI.

