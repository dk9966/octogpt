# OctoGPT

A browser extension that adds a navigable sidebar to ChatGPT, Gemini, and Claude, displaying all prompts and headers in your conversation.

## Features

- **Sidebar navigation** - View all prompts and headers at a glance
- **Quick toggle** - Press `Cmd/Ctrl + H` or click the floating button
- **Smooth scrolling** - Click any item to jump to it in the conversation
- **Theme support** - Automatically adapts to light and dark modes

## Installation

If OctoGPT is not available on the Chrome Web Store, install it manually:

1. Clone or download this repository
2. Open your browser's extension management page:
   - Chrome: `chrome://extensions/`
   - Firefox: `about:debugging#/runtime/this-firefox`
3. Enable Developer mode
4. Load the extension (Chrome: "Load unpacked" | Firefox: "Load Temporary Add-on")
5. Navigate to [ChatGPT](https://chat.openai.com), [Gemini](https://gemini.google.com), or [Claude](https://claude.ai)

## Usage

Open any conversation and press `Cmd/Ctrl + H` to toggle the sidebar. Click any prompt or header to navigate directly to it.

## Supported Sites

- chat.openai.com
- chatgpt.com
- gemini.google.com
- claude.ai

## Technical Details

Built with Manifest V3 and Shadow DOM for style isolation. See `docs/` for detailed documentation.
