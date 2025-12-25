# OctoGPT

A browser extension that adds a sidebar to ChatGPT for navigating your prompts in a conversation.

## Features

- Sidebar showing all your prompts in the current conversation
- Toggle with `Cmd/Ctrl + K` or the floating button
- Search/filter prompts
- Edited prompt indicators (angle brackets)
- Branch detection for conversation forks
- Real-time updates as you chat
- Persists open/closed state
- Light and dark mode support

## Installation

### Chrome / Arc / Edge

1. Go to `chrome://extensions/` (or `arc://extensions/` for Arc)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this folder

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json`

## Usage

1. Navigate to any ChatGPT conversation
2. Press `Cmd/Ctrl + K` or click the floating button to open the sidebar
3. Click any prompt to scroll to it (coming soon)

## Project Structure

```
octogpt/
├── manifest.json          # Extension configuration
├── content/
│   ├── content.js         # Main content script
│   ├── parser.js          # DOM parsing logic
│   ├── sidebar.js         # Sidebar UI
│   └── styles.css         # Sidebar styles
├── assets/
│   └── icons/             # Extension icons
├── docs/                  # Documentation
│   ├── PHASE1_COMPLETE.md
│   ├── PHASE2_COMPLETE.md
│   ├── PLAN.md
│   ├── PRIVACY.md
│   └── ...
├── scripts/               # Dev utilities
│   ├── generate_icons.py
│   └── convert_screenshots.py
└── screenshots/           # Store screenshots
```

## Development

The extension uses Manifest V3 and Shadow DOM for style isolation.

### Debugging

Open browser console on ChatGPT and look for `[OctoGPT]` messages. You can also access:

```javascript
window.octogpt              // Main instance
window.octogpt.getPrompts() // Current prompts
window.octogpt.sidebar      // Sidebar instance
```

## Roadmap

- [x] Phase 1: Core prompt extraction
- [x] Phase 2: Sidebar UI
- [ ] Phase 3: Click-to-scroll navigation
- [ ] Phase 4: Enhanced features (copy, tooltips)
- [ ] Phase 5: Multi-chat persistence
