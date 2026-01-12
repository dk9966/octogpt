# OctoGPT - ChatGPT Prompt Navigator Extension

## Overview
A browser extension that adds an expandable sidebar to ChatGPT, displaying all user prompts in the current conversation as a navigable list. Shows the active conversation branch and indicates edited prompts. Similar to Octotree's approach for GitHub repositories.

## Core Features

### 1. Prompt Extraction
- Parse the ChatGPT DOM to extract all user messages from the current conversation
- Handle different message types (text, code, attachments)
- Real-time monitoring for new messages as conversation continues
- Detect and track edited prompts that create conversation branches
- Show the currently active branch (the path the user is viewing)
- Mark edited prompts with visual indicator (angle brackets)

### 2. Sidebar Interface
- Collapsible/expandable sidebar overlay (similar to Octotree)
- Toggle visibility via keyboard shortcut and icon button
- Persist open/closed state across page loads
- Adjustable width with drag handle

### 3. Prompt List Structure
- Display prompts as a simple linear list
- Show first ~12 characters of each prompt with ellipsis
- Display timestamp next to each prompt
- Highlight current active prompt in conversation
- Handle edited prompts by showing the active version with visual indicator (angle brackets)
- When a prompt is edited, show the current branch being viewed
- Click prompt to scroll to that message in the main chat
- Hover to see full prompt text

### 4. Navigation
- Smooth scroll to selected prompt in main interface
- Keyboard shortcuts for next/previous prompt
- Search/filter functionality within prompts
- Jump to specific conversation sections

## Technical Architecture

### Extension Structure
```
manifest.json          - Extension configuration
content/
  ├── content.js       - Main content script
  ├── sidebar.js       - Sidebar UI logic
  ├── parser.js        - DOM parsing and prompt extraction
  └── styles.css       - Sidebar styling
background/
  ├── background.js    - Background service worker
popup/
  ├── popup.html       - Extension popup UI
  ├── popup.js         - Popup logic
  └── popup.css        - Popup styling
assets/
  ├── icons/           - Extension icons
  └── fonts/           - Custom fonts if needed
```

### Key Technologies
- **Manifest V3**: Modern extension API
- **DOM Observers**: MutationObserver for real-time updates
- **Storage API**: chrome.storage.local for preferences
- **Shadow DOM**: Isolated styling for sidebar

## Implementation Phases

### Phase 1: Core Extraction
**Goal**: Successfully identify and extract user prompts from ChatGPT DOM

Tasks:
1. Analyze ChatGPT's current DOM structure
2. Identify reliable selectors for user messages
3. Build extraction logic that handles:
   - Regular text messages
   - Code blocks
   - Multi-line prompts
4. Implement MutationObserver to detect new messages
5. Handle edge cases:
   - Deleted messages
   - Regenerated responses
   - Edited prompts that create new branches
6. Track conversation branch structure:
   - Detect when a prompt has been edited
   - Identify which branch is currently active
   - Mark edited prompts for special visual treatment

**Validation**: Log extracted prompts to console with timestamps and branch indicators

### Phase 2: Basic Sidebar
**Goal**: Display extracted prompts in a functional sidebar

Tasks:
1. Create sidebar HTML structure
2. Implement toggle mechanism (icon + keyboard shortcut)
3. Style sidebar to match ChatGPT's aesthetic
4. Ensure sidebar doesn't break ChatGPT functionality
5. Handle responsive layout adjustments
6. Add basic list rendering of prompts:
   - Show first ~12 characters with ellipsis
   - Display timestamp inline
   - Clean, compact layout
7. Implement visual styling for edited prompts (angle bracket notation)
8. Display only the active conversation branch

**Validation**: Sidebar appears, can be toggled, displays prompts as truncated previews with proper branch indicators

### Phase 3: Navigation
**Goal**: Enable click-to-scroll and highlighting

Tasks:
1. Implement scroll-to-message functionality
2. Add highlight effect when clicking prompt
3. Track current scroll position
4. Highlight corresponding prompt in sidebar as user scrolls
5. Add smooth scrolling animation

**Validation**: Clicking prompts navigates to correct position, visual feedback works

### Phase 4: Enhanced Features
**Goal**: Add polish and advanced functionality

Tasks:
1. Implement search/filter within prompts
2. Add full prompt preview on hover (tooltip showing complete text)
3. Show character/word count per prompt (in hover preview)
4. Add "copy prompt" functionality
5. Implement keyboard navigation (j/k for next/prev)
6. Add settings panel for customization:
   - Sidebar position (left/right)
   - Theme (light/dark/auto)
   - Font size
   - Prompt truncation length (adjustable from ~12 chars)
   - Show/hide timestamps

**Validation**: All features work smoothly without performance issues

### Phase 5: Persistence & Multi-Chat
**Goal**: Handle multiple conversations and data persistence

Tasks:
1. Store prompt data per conversation, including branch information
2. Handle navigation between different chats
3. Clear/update data when switching conversations
4. Export conversation prompts as JSON/text (with branch structure)
5. Handle ChatGPT's shared chat feature
6. Persist which branch is active when switching away and back to a conversation

**Validation**: Data persists correctly across sessions and chat switches, branch state is preserved

## Technical Considerations

### DOM Parsing Strategy
ChatGPT's DOM structure may change. Strategy:
1. Use multiple fallback selectors
2. Implement robust error handling
3. Version detection for ChatGPT updates
4. Graceful degradation if structure changes

### Performance
- Debounce DOM observations (avoid excessive re-parsing)
- Virtual scrolling for conversations with 100+ prompts
- Lazy load prompt content on demand
- Efficient event delegation for click handlers

### Compatibility
- Support Chrome, Firefox, Edge (cross-browser manifest)
- Test with different ChatGPT plans (Free, Plus, Team, Enterprise)
- Handle different screen sizes and zoom levels
- Ensure accessibility (keyboard navigation, screen readers)

### Privacy & Security
- No data sent to external servers
- All processing happens locally
- No tracking or analytics
- Clear privacy policy in extension description

## User Experience Design

### Visual Hierarchy

**Basic conversation (no edits):**
```
┌─────────────────────────┐
│ [≡] OctoGPT        [×]  │ <- Header with logo and close
├─────────────────────────┤
│ [Search prompts...]     │ <- Search bar
├─────────────────────────┤
│   Explain quan...       │ <- First ~12 chars
│                         │
│   Write a func...       │
│                         │
│   Debug this c...     ● │ <- Current position indicator
│                         │
│   Refactor the...       │
└─────────────────────────┘
```

**When a prompt is edited (shows active branch):**
```
┌─────────────────────────┐
│ [≡] OctoGPT        [×]  │
├─────────────────────────┤
│ [Search prompts...]     │
├─────────────────────────┤
│   Explain quan...       │
│                         │
│ < Write a clas... >     │ <- Angle brackets = edited/active branch
│                         │
│   Add error ha...       │ <- Subsequent prompts in this branch
│                         │
│   Test the cla...       │
│                         │
│   Create unit ...     ● │ <- New prompt in this branch
└─────────────────────────┘
```

The angle bracket notation `< >` indicates the edited prompt that created the current conversation branch. All prompts following an edit are part of that branch's timeline.

### Interaction Patterns
- **Click**: Scroll to prompt in main chat
- **Hover**: Show full prompt text in tooltip
- **Right-click**: Context menu (copy, export)
- **Drag header**: Move sidebar position
- **Cmd/Ctrl + K**: Toggle sidebar
- **j/k or Up/Down arrows**: Navigate prompts
- **Enter**: Go to selected prompt

## Milestone Checklist

- [x] Phase 1: Core extraction working ✓
- [x] Phase 2: Basic sidebar functional ✓
- [ ] Phase 3: Navigation implemented
- [ ] Phase 4: Enhanced features added
- [ ] Phase 5: Multi-chat support
- [ ] Browser compatibility testing
- [ ] Performance optimization
- [x] Documentation and README ✓
- [ ] Extension store listing prepared
- [ ] Beta testing with users
- [ ] Public release

## Future Enhancements
- Export conversation prompts to various formats (including branch structure)
- Prompt statistics (total count, average length, branch count, etc.)
- Tag/label prompts for organization
- Prompt templates/snippets
- Integration with other AI chat platforms (Claude support added)
- Prompt history across all conversations
- Collaborative features (share prompt collections)
- Branch visualization: show alternate branches that exist but aren't currently active
- Branch switching: allow users to switch between different conversation branches
- Branch comparison: compare responses across different branches

## Success Metrics
- Successfully extracts 100% of user prompts
- Correctly identifies and displays the active conversation branch
- Sidebar loads in <200ms
- No interference with ChatGPT's native functionality
- Positive user feedback on usability
- Works across ChatGPT updates (resilient parsing)
- Accurately tracks edited prompts and resulting branches

