# UI States: Loading, Empty Chat, and Transitions

This document explains how OctoGPT handles different UI states in the sidebar.

---

## Overview

The sidebar has 3 mutually exclusive content states:

```
Loading       ->  Shows spinner + status text
New Chat      ->  Shows placeholder message  
Prompts       ->  Shows the prompt list
```

---

## State Properties (sidebar.js)

```javascript
// In OctoGPTSidebar class
isLoading = true;           // Currently waiting/parsing
loadingState = 'waiting';   // 'waiting' | 'parsing' | null
isNewChat = false;          // Page ready, but no conversation
```

---

## State Transitions

```
Page Load / Navigation
    |
    v
Check URL (isNewChatUrl)
    |
    +-- New chat URL (no ID) --> [New Chat]
    |
    +-- Has chat ID --> [Loading: waiting] --> content found --> [Loading: parsing] --> [Prompts]
                                                   |
                                                   +-- timeout --> [Empty fallback]
```

---

## Loading State

**When shown:** `isLoading === true && prompts.length === 0`

**Visual:** Spinner + status text

```html
<div class="octogpt-sidebar__loading">
  <div class="octogpt-sidebar__loading-spinner"></div>
  <div class="octogpt-sidebar__loading-text">Waiting for chat thread</div>
</div>
```

**Status messages:**
- `'waiting'` -> "Waiting for chat thread"
- `'parsing'` -> "Parsing chat thread"

**Code flow:**

```javascript
// Set loading state
sidebar.setLoadingState('waiting');  // Shows spinner + "Waiting for chat thread"
sidebar.setLoadingState('parsing');  // Shows spinner + "Parsing chat thread"
sidebar.setLoadingState(null);       // Clears loading
```

---

## New Chat State

**When shown:** `isNewChat === true && prompts.length === 0`

**Visual:** Plain text, no spinner

```html
<div class="octogpt-sidebar__empty">
  Start a conversation to see prompts here
</div>
```

**Triggered by:**

1. **URL-based detection** - `isNewChatUrl()` returns true (no chat ID in URL)
   - ChatGPT: URL is `/` or doesn't start with `/c/`
   - Gemini: URL is `/app` or `/app/`

Note: Detection is based on URL patterns, not DOM selectors (which can be unreliable). Timeouts do NOT trigger new chat state.

```javascript
// Set new chat state
sidebar.setNewChat(true);   // Shows placeholder
sidebar.setNewChat(false);  // Clears (usually when prompts arrive)
```

---

## State Priority (in render())

```javascript
// 1. New chat state takes priority over loading
if (this.isNewChat && this.prompts.length === 0) {
  // Show: "Start a conversation to see prompts here"
  return;
}

// 2. Loading state (spinner)
if (this.isLoading && this.prompts.length === 0) {
  // Show: spinner + status text
  return;
}

// 3. Empty state (fallback, shouldn't normally happen)
if (this.prompts.length === 0) {
  // Show: "No prompts found"
  return;
}

// 4. Prompts list
// Show: prompt items
```

---

## Detection Logic (content.js)

### Check for New Chat URL

```javascript
isNewChatUrl() {
  const pathname = window.location.pathname;

  if (this.site === 'gemini') {
    // Gemini new chat: /app or /app/ (no ID after)
    return pathname === '/app' || pathname === '/app/';
  } else {
    // ChatGPT new chat: / or no /c/ segment
    return pathname === '/' || !pathname.startsWith('/c/');
  }
}
```

### Setup Flow

```javascript
// In setup() and navigation handler:
if (this.isNewChatUrl()) {
  this.sidebar.setNewChat(true);  // URL has no chat ID
} else {
  this.extractAndLog();           // URL has chat ID, extract prompts
}
```

---

## CSS (spinner animation)

```css
.octogpt-sidebar__loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e5e5;
  border-top-color: #0d0d0d;
  border-radius: 50%;
  animation: octogpt-spin 0.8s linear infinite;
}

@keyframes octogpt-spin {
  to { transform: rotate(360deg); }
}
```

---

## Summary

| State | Condition | Display |
|-------|-----------|---------|
| Loading | `isLoading && !prompts.length` | Spinner + "Waiting..." or "Parsing..." |
| New Chat | `isNewChat && !prompts.length` | "Start a conversation to see prompts here" |
| Empty | `!prompts.length` (fallback) | "No prompts found" |
| Prompts | `prompts.length > 0` | List of clickable prompts |
