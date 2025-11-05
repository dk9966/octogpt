# OctoGPT - ChatGPT Prompt Navigator Extension

## Overview
A browser extension that adds an expandable sidebar to ChatGPT, displaying all user prompts in the current conversation as a navigable directory structure. Similar to Octotree's approach for GitHub repositories.

## Core Features

### 1. Prompt Extraction
- Parse the ChatGPT DOM to extract all user messages from the current conversation
- Handle different message types (text, code, attachments)
- Real-time monitoring for new messages as conversation continues
- Support for edited messages (show edit history or latest version)

### 2. Sidebar Interface
- Collapsible/expandable sidebar overlay (similar to Octotree)
- Toggle visibility via keyboard shortcut and icon button
- Persist open/closed state across page loads
- Adjustable width with drag handle

### 3. Directory Structure
- Display prompts as hierarchical list
- Show timestamp for each prompt
- Truncate long prompts with ellipsis (expand on hover/click)
- Highlight current position in conversation
- Click prompt to scroll to that message in the main chat

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
5. Handle edge cases (deleted messages, regenerated responses)

**Validation**: Log extracted prompts to console with timestamps

### Phase 2: Basic Sidebar
**Goal**: Display extracted prompts in a functional sidebar

Tasks:
1. Create sidebar HTML structure
2. Implement toggle mechanism (icon + keyboard shortcut)
3. Style sidebar to match ChatGPT's aesthetic
4. Ensure sidebar doesn't break ChatGPT functionality
5. Handle responsive layout adjustments
6. Add basic list rendering of prompts

**Validation**: Sidebar appears, can be toggled, displays all prompts

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
2. Add prompt preview on hover
3. Show character/word count per prompt
4. Add "copy prompt" functionality
5. Implement keyboard navigation (j/k for next/prev)
6. Add settings panel for customization:
   - Sidebar position (left/right)
   - Theme (light/dark/auto)
   - Font size
   - Show/hide timestamps

**Validation**: All features work smoothly without performance issues

### Phase 5: Persistence & Multi-Chat
**Goal**: Handle multiple conversations and data persistence

Tasks:
1. Store prompt data per conversation
2. Handle navigation between different chats
3. Clear/update data when switching conversations
4. Export conversation prompts as JSON/text
5. Handle ChatGPT's shared chat feature

**Validation**: Data persists correctly across sessions and chat switches

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
```
┌─────────────────────────┐
│ [≡] OctoGPT        [×]  │ <- Header with logo and close
├─────────────────────────┤
│ [Search prompts...]     │ <- Search bar
├─────────────────────────┤
│ > Prompt 1 (10:23 AM)   │ <- Expandable/collapsible
│   "Explain quantum..."  │
│                         │
│ > Prompt 2 (10:25 AM)   │
│   "Write a function..." │
│                         │
│ > Prompt 3 (10:30 AM) ● │ <- Current position indicator
│   "Debug this code..."  │
└─────────────────────────┘
```

### Interaction Patterns
- **Click**: Scroll to prompt
- **Hover**: Show full prompt text
- **Right-click**: Context menu (copy, export)
- **Drag header**: Move sidebar position
- **Cmd/Ctrl + K**: Toggle sidebar
- **Up/Down arrows**: Navigate prompts
- **Enter**: Go to selected prompt

## Milestone Checklist

- [ ] Phase 1: Core extraction working
- [ ] Phase 2: Basic sidebar functional
- [ ] Phase 3: Navigation implemented
- [ ] Phase 4: Enhanced features added
- [ ] Phase 5: Multi-chat support
- [ ] Browser compatibility testing
- [ ] Performance optimization
- [ ] Documentation and README
- [ ] Extension store listing prepared
- [ ] Beta testing with users
- [ ] Public release

## Future Enhancements
- Export conversation prompts to various formats
- Prompt statistics (total count, average length, etc.)
- Tag/label prompts for organization
- Prompt templates/snippets
- Integration with other AI chat platforms
- Prompt history across all conversations
- Collaborative features (share prompt collections)

## Success Metrics
- Successfully extracts 100% of user prompts
- Sidebar loads in <200ms
- No interference with ChatGPT's native functionality
- Positive user feedback on usability
- Works across ChatGPT updates (resilient parsing)

