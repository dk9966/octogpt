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
Page Load
    |
    v
[Loading: waiting]  <-- "Waiting for chat thread"
    |
    +-- Content found? --> [Loading: parsing] --> prompts found? --> [Prompts]
    |                                               |
    |                                               +-- no prompts --> [New Chat]
    |
    +-- 2s timeout, no content --> [New Chat]

Navigation (URL change)
    |
    v
[Loading: waiting] --> same flow as above
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

1. **Timeout** - No content appears within 2 seconds after navigation
2. **Direct detection** - `hasConversationContent()` returns false

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

### Check for Conversation Content

```javascript
hasConversationContent() {
  // Gemini
  if (this.site === 'gemini') {
    return !!(document.querySelector('user-query') || 
              document.querySelector('model-response'));
  }
  // ChatGPT
  return !!(document.querySelector('[data-testid^="conversation-turn-"]') ||
            document.querySelector('[data-message-author-role]'));
}
```

### Wait for Content or Timeout

```javascript
waitForContentAndExtract() {
  const maxWait = 2000;  // 2 seconds
  
  const check = () => {
    if (this.hasConversationContent()) {
      this.extractAndLog();
      // If still no prompts, wait more or declare new chat
      if (this.prompts.length === 0) {
        this.waitForPromptsOrNewChat();
      }
      return;
    }

    if (Date.now() - startTime > maxWait) {
      // Timeout = new chat
      this.sidebar.setNewChat(true);
      return;
    }

    setTimeout(check, 100);
  };
  check();
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
