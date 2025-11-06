# OctoGPT Quick Start

## Install and Test in 3 Minutes

### Step 1: Load Extension (30 seconds)

**Chrome:**
1. Open `chrome://extensions/`
2. Toggle "Developer mode" ON (top right)
3. Click "Load unpacked"
4. Select the `octogpt` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `octogpt/manifest.json`

### Step 2: Open ChatGPT (30 seconds)
1. Go to https://chat.openai.com/ or https://chatgpt.com/
2. Open any existing conversation (or start a new one)

### Step 3: Check Console (30 seconds)
1. Press `F12` (or `Cmd+Option+I` on Mac)
2. Click the "Console" tab
3. Look for green `[OctoGPT]` messages

### What You Should See

```
[OctoGPT] Content script loaded
[OctoGPT] Initializing...
[OctoGPT] Found 4 prompts
[OctoGPT] Extracted Prompts:
  1. Explain quan...
     Full text: "Explain quantum computing in simple terms"
  2. Write a func...
     Full text: "Write a function to sort an array"
  3. How do I fix...
     Full text: "How do I fix this error message"
  4. Create a sim...
     Full text: "Create a simple todo app"
```

### Quick Tests

**Test 1: Send a message**
- Type something in ChatGPT and send
- Watch console update automatically ✓

**Test 2: Switch conversations**
- Click a different chat in sidebar
- Watch console clear and reload new prompts ✓

**Test 3: Edit a prompt** (if available)
- Click edit on any prompt
- Watch console mark it as `[EDITED/BRANCH]` ✓

## Debugging

**Not seeing messages?**
```javascript
// Type in console:
window.octogpt.extractAndLog()
```

**Need to see current prompts?**
```javascript
// Type in console:
window.octogpt.getPrompts()
```

## What's Next?

Phase 1 is complete! This validates that extraction works.

**Coming in Phase 2:**
- Sidebar UI showing all prompts
- Click to navigate
- Visual branch indicators

## Documentation

- `README.md` - Full documentation
- `TESTING_PHASE1.md` - Comprehensive testing guide
- `PHASE1_COMPLETE.md` - Implementation summary

## Need Help?

Phase 1 only does extraction and console logging. If you see the `[OctoGPT]` messages in console with your prompts listed, everything is working correctly!

