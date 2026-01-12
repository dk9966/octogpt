# Claude Support Implementation

## Overview

This document describes the implementation of Claude chat support for OctoGPT. The extension now supports three AI chat platforms:

- ChatGPT (chat.openai.com, chatgpt.com)
- Gemini (gemini.google.com, aistudio.google.com)
- Claude (claude.ai)

## Implementation Details

### 1. Manifest Updates

Added Claude URL pattern to `manifest.json`:

```json
"matches": [
    "https://chat.openai.com/*",
    "https://chatgpt.com/*",
    "https://gemini.google.com/*",
    "https://aistudio.google.com/*",
    "https://claude.ai/*"
]
```

### 2. ClaudeParser Class

Created `ClaudeParser` in `content/parser.js` extending `BaseParser`. Key implementation details:

#### URL Pattern
- Existing chat: `/chat/{uuid}`
- New chat: `/new` or `/`

#### DOM Selectors
```javascript
this.selectors = {
    conversationContainer: '[class*="conversation"], main',
    userMessages: '[data-testid="user-message"], [data-is-streaming="false"][class*="human"], .human-turn',
    assistantMessages: '[data-testid="assistant-message"], [class*="assistant"], .assistant-turn',
    userQueryText: '.whitespace-pre-wrap, [class*="prose"], p',
    assistantContent: '[class*="markdown"], [class*="prose"]',
    messageGroup: '[class*="message-row"], [class*="turn"]',
};
```

Note: These selectors are based on common patterns and may need adjustment based on Claude's actual DOM structure.

#### Branch Support
Claude does not currently support conversation branching like ChatGPT. The `getBranchInfo()` method returns `{ hasBranches: false }`.

### 3. Site Detection

Updated `detectSite()` in both `content.js` and `sidebar.js`:

```javascript
if (hostname.includes('claude.ai')) {
    return 'claude';
}
```

### 4. Ready State Detection

Added Claude-specific checks in `waitForReady()`:

```javascript
if (this.site === 'claude') {
    const hasContent = document.querySelector('[data-testid*="message"]') ||
                       document.querySelector('[class*="human"]') ||
                       document.querySelector('[class*="assistant"]');
    const hasInput = document.querySelector('[contenteditable="true"]') ||
                    document.querySelector('textarea') ||
                    document.querySelector('[class*="input"]');
    return hasContent || hasInput;
}
```

### 5. New Chat Detection

Updated `isNewChatUrl()` for Claude:

```javascript
if (this.site === 'claude') {
    isNew = pathname === '/new' || pathname === '/' || !pathname.startsWith('/chat/');
}
```

### 6. Streaming Detection

Added Claude streaming indicators in `isStreaming()`:

```javascript
if (this.site === 'claude') {
    const streamingIndicators = document.querySelectorAll(
        '[data-is-streaming="true"], [class*="streaming"], [aria-busy="true"]'
    );
    return streamingIndicators.length > 0;
}
```

### 7. Message Node Detection

Added Claude message detection in `isMessageNode()`:

```javascript
if (this.site === 'claude') {
    const hasMessageTestId = node.hasAttribute?.('data-testid') &&
        (node.getAttribute('data-testid').includes('message') ||
         node.getAttribute('data-testid').includes('human') ||
         node.getAttribute('data-testid').includes('assistant'));
    const hasHumanClass = node.classList?.contains('human-turn') || 
                         node.className?.includes?.('human');
    const hasAssistantClass = node.classList?.contains('assistant-turn') || 
                             node.className?.includes?.('assistant');
    const hasMessageContent = node.querySelector?.('[class*="markdown"], .whitespace-pre-wrap, [class*="prose"]');
    
    return hasMessageTestId || hasHumanClass || hasAssistantClass || hasMessageContent;
}
```

### 8. Dark Mode Support

Added Claude's dark mode selector `[data-theme="dark"]` to all dark mode styles in `styles.css`.

## Files Modified

- `manifest.json` - Added Claude URL patterns
- `content/parser.js` - Added ClaudeParser class and export
- `content/content.js` - Updated site detection, ready state, streaming, and message node detection
- `content/sidebar.js` - Updated site detection, scroll container, and heading element finding
- `content/styles.css` - Added Claude dark mode selectors

## Files Created

- `docs/PHASE_CLAUDE.md` - This documentation
- `docs/TESTING_CLAUDE.md` - Testing guide for Claude

## Known Limitations

1. **DOM Selectors**: Claude's DOM structure may change. The current selectors are based on common patterns and may need adjustment after testing on the actual Claude interface.

2. **No Branch Support**: Claude does not currently support conversation branching/editing like ChatGPT. The branch-related features will not work on Claude.

3. **Dark Mode Detection**: Claude's dark mode uses `[data-theme="dark"]` attribute. If Claude changes this, the dark mode styling will need to be updated.

## Testing

See `TESTING_CLAUDE.md` for comprehensive testing instructions.

## Future Improvements

1. Verify and refine DOM selectors based on actual Claude interface inspection
2. Add Claude-specific icon variant (like the Gemini blue icon)
3. Handle any Claude-specific features that may be added in the future
