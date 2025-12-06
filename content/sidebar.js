/**
 * OctoGPT Sidebar Module
 * Handles sidebar UI creation, rendering, and interactions
 */

class OctoGPTSidebar {
  constructor() {
    this.sidebar = null;
    this.shadowRoot = null;
    this.isVisible = false;
    this.prompts = [];
    this.currentPromptIndex = -1;
    this.config = {
      defaultWidth: 200,
      minWidth: 180,
      maxWidth: 400,
    };

    // Resize state
    this.isResizing = false;

    // Bind methods
    this.toggle = this.toggle.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.render = this.render.bind(this);
    this.handleResizeStart = this.handleResizeStart.bind(this);
    this.handleResizeMove = this.handleResizeMove.bind(this);
    this.handleResizeEnd = this.handleResizeEnd.bind(this);
  }

  /**
   * Initialize the sidebar
   */
  async init() {
    // Load saved state
    await this.loadState();

    // Create sidebar DOM structure
    this.createSidebar();

    // Setup keyboard shortcut
    this.setupKeyboardShortcut();

    // Render initial state
    this.render();
  }

  /**
   * Load sidebar state from storage
   */
  async loadState() {
    try {
      const result = await chrome.storage.local.get(['sidebarVisible', 'sidebarWidth']);
      this.isVisible = result.sidebarVisible !== undefined ? result.sidebarVisible : false;
      // Use saved width if within valid range
      if (result.sidebarWidth && 
          result.sidebarWidth >= this.config.minWidth && 
          result.sidebarWidth <= this.config.maxWidth) {
        this.config.defaultWidth = result.sidebarWidth;
      }
    } catch (error) {
      console.error('[OctoGPT] Error loading sidebar state:', error);
      this.isVisible = false;
      this.config.defaultWidth = 200;
    }
  }

  /**
   * Save sidebar state to storage
   */
  async saveState() {
    try {
      await chrome.storage.local.set({
        sidebarVisible: this.isVisible,
        sidebarWidth: this.config.defaultWidth,
      });
    } catch (error) {
      console.error('[OctoGPT] Error saving sidebar state:', error);
    }
  }

  /**
   * Create the sidebar DOM structure using Shadow DOM
   */
  createSidebar() {
    // Create container
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'octogpt-sidebar';
    this.sidebar.className = 'octogpt-sidebar';

    // Create shadow root for style isolation
    this.shadowRoot = this.sidebar.attachShadow({ mode: 'open' });

    // Inject styles
    this.injectStyles();

    // Create HTML structure
    const html = `
      <div class="octogpt-sidebar__resize-handle" aria-label="Resize sidebar"></div>
      <div class="octogpt-sidebar__container">
        <div class="octogpt-sidebar__header">
          <div class="octogpt-sidebar__logo">
            <span class="octogpt-sidebar__logo-text">OctoGPT</span>
          </div>
        </div>
        <div class="octogpt-sidebar__content">
          <div class="octogpt-sidebar__prompt-list" role="list">
            <!-- Prompts will be rendered here -->
          </div>
          <div class="octogpt-sidebar__empty">
            No prompts found
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.innerHTML = html;

    // Attach event listeners
    this.attachEventListeners();

    // Append to body
    document.body.appendChild(this.sidebar);

    // Create toggle button
    this.createToggleButton();

    // Set initial visibility
    this.updateVisibility();
  }

  /**
   * Create floating toggle button
   */
  createToggleButton() {
    const toggle = document.createElement('button');
    toggle.className = 'octogpt-toggle';
    toggle.setAttribute('aria-label', 'Toggle OctoGPT sidebar');
    toggle.setAttribute('title', 'Toggle OctoGPT sidebar (Cmd/Ctrl + Shift + K)');
    toggle.innerHTML = '≡';
    toggle.addEventListener('click', () => this.toggle());
    document.body.appendChild(toggle);
    this.toggleButton = toggle;
  }

  /**
   * Inject CSS styles into shadow DOM
   */
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        position: relative;
        height: 100%;
      }

      .octogpt-sidebar__resize-handle {
        position: absolute;
        left: 4px;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 40px;
        cursor: ew-resize;
        background: rgba(0, 0, 0, 0.15);
        border-radius: 2px;
        z-index: 10;
        transition: background 0.15s ease, height 0.15s ease;
      }

      .octogpt-sidebar__resize-handle:hover,
      .octogpt-sidebar__resize-handle--active {
        background: rgba(0, 0, 0, 0.3);
        height: 56px;
      }

      @media (prefers-color-scheme: dark) {
        .octogpt-sidebar__resize-handle {
          background: rgba(255, 255, 255, 0.2);
        }

        .octogpt-sidebar__resize-handle:hover,
        .octogpt-sidebar__resize-handle--active {
          background: rgba(255, 255, 255, 0.4);
        }
      }

      .octogpt-sidebar__container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #ffffff;
        border-left: 1px solid rgba(0, 0, 0, 0.06);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        color: #374151;
      }

      @media (prefers-color-scheme: dark) {
        .octogpt-sidebar__container {
          background: #202123;
          border-left-color: rgba(255, 255, 255, 0.1);
          color: #ececf1;
        }
      }

      .octogpt-sidebar__header {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: transparent;
      }

      .octogpt-sidebar__logo {
        font-weight: 600;
        font-size: 14px;
        color: #343541;
      }

      @media (prefers-color-scheme: dark) {
        .octogpt-sidebar__logo {
          color: #ececf1;
        }
      }

      .octogpt-sidebar__logo-text {
        letter-spacing: -0.2px;
      }

      .octogpt-sidebar__content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0 8px 16px;
      }

      .octogpt-sidebar__content::-webkit-scrollbar {
        width: 5px;
      }

      .octogpt-sidebar__content::-webkit-scrollbar-track {
        background: transparent;
      }

      .octogpt-sidebar__content::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 3px;
      }

      .octogpt-sidebar__content::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.2);
      }

      @media (prefers-color-scheme: dark) {
        .octogpt-sidebar__content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }

        .octogpt-sidebar__content::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }

      .octogpt-sidebar__prompt-list {
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .octogpt-sidebar__prompt-item {
        padding: 10px 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        border-radius: 6px;
        margin: 0;
        border: none;
      }

      .octogpt-sidebar__prompt-item:hover {
        background: #f7f7f8;
      }

      .octogpt-sidebar__prompt-item--active {
        background: #ececf1;
      }

      @media (prefers-color-scheme: dark) {
        .octogpt-sidebar__prompt-item:hover {
          background: #2a2b32;
        }

        .octogpt-sidebar__prompt-item--active {
          background: #343541;
        }
      }

      .octogpt-sidebar__prompt-text {
        font-size: 13px;
        line-height: 1.5;
        color: #343541;
        margin-bottom: 2px;
        word-break: break-word;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      @media (prefers-color-scheme: dark) {
        .octogpt-sidebar__prompt-text {
          color: #ececf1;
        }
      }

      .octogpt-sidebar__prompt-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: #8e8ea0;
      }

      @media (prefers-color-scheme: dark) {
        .octogpt-sidebar__prompt-meta {
          color: #acacbe;
        }
      }

      .octogpt-sidebar__prompt-branch {
        padding: 1px 4px;
        background: rgba(0, 0, 0, 0.05);
        color: #666;
        border-radius: 3px;
        font-size: 9px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      @media (prefers-color-scheme: dark) {
        .octogpt-sidebar__prompt-branch {
          background: rgba(255, 255, 255, 0.1);
          color: #ececf1;
        }
      }

      .octogpt-sidebar__empty {
        padding: 32px 16px;
        text-align: center;
        color: #8e8ea0;
        font-size: 13px;
        display: none;
      }

      @media (prefers-color-scheme: dark) {
        .octogpt-sidebar__empty {
          color: #acacbe;
        }
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  /**
   * Attach event listeners to sidebar elements
   */
  attachEventListeners() {
    const promptList = this.shadowRoot.querySelector('.octogpt-sidebar__prompt-list');

    if (promptList) {
      promptList.addEventListener('click', (e) => {
        const promptItem = e.target.closest('.octogpt-sidebar__prompt-item');
        if (promptItem) {
          const index = parseInt(promptItem.dataset.index);
          this.handlePromptClick(index);
        }
      });
    }

    // Resize handle
    const resizeHandle = this.shadowRoot.querySelector('.octogpt-sidebar__resize-handle');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', this.handleResizeStart);
    }
  }

  /**
   * Start resizing the sidebar
   */
  handleResizeStart(e) {
    e.preventDefault();
    this.isResizing = true;

    const resizeHandle = this.shadowRoot.querySelector('.octogpt-sidebar__resize-handle');
    if (resizeHandle) {
      resizeHandle.classList.add('octogpt-sidebar__resize-handle--active');
    }

    // Add listeners to document for drag
    document.addEventListener('mousemove', this.handleResizeMove);
    document.addEventListener('mouseup', this.handleResizeEnd);

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  }

  /**
   * Handle resize drag movement
   */
  handleResizeMove(e) {
    if (!this.isResizing) return;

    // Calculate new width from right edge of viewport
    const newWidth = window.innerWidth - e.clientX;
    
    // Clamp to min/max
    const clampedWidth = Math.max(
      this.config.minWidth,
      Math.min(this.config.maxWidth, newWidth)
    );

    // Update width
    this.config.defaultWidth = clampedWidth;
    this.sidebar.style.width = `${clampedWidth}px`;
    document.body.style.paddingRight = `${clampedWidth}px`;
  }

  /**
   * End resizing
   */
  async handleResizeEnd() {
    if (!this.isResizing) return;

    this.isResizing = false;

    const resizeHandle = this.shadowRoot.querySelector('.octogpt-sidebar__resize-handle');
    if (resizeHandle) {
      resizeHandle.classList.remove('octogpt-sidebar__resize-handle--active');
    }

    // Remove document listeners
    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.handleResizeEnd);

    // Restore selection and cursor
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // Re-render prompts with new width-based truncation
    this.render();

    // Save new width
    await this.saveState();
  }

  /**
   * Setup keyboard shortcut (Cmd/Ctrl + K)
   */
  setupKeyboardShortcut() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyDown(event) {
    // Cmd/Ctrl + Shift + K to toggle sidebar
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'K') {
      // Don't trigger if user is typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      event.preventDefault();
      this.toggle();
    }
  }

  /**
   * Toggle sidebar visibility
   */
  async toggle() {
    this.isVisible = !this.isVisible;
    this.updateVisibility();
    await this.saveState();
  }

  /**
   * Show sidebar
   */
  async show() {
    if (!this.isVisible) {
      this.isVisible = true;
      this.updateVisibility();
      await this.saveState();
    }
  }

  /**
   * Hide sidebar
   */
  async hide() {
    if (this.isVisible) {
      this.isVisible = false;
      this.updateVisibility();
      await this.saveState();
    }
  }

  /**
   * Update sidebar visibility and adjust layout
   */
  updateVisibility() {
    if (!this.sidebar) return;

    const sidebarWidth = this.config.defaultWidth;

    // Ensure sidebar width matches config
    this.sidebar.style.width = `${sidebarWidth}px`;

    if (this.isVisible) {
      this.sidebar.classList.add('octogpt-sidebar--visible');
      if (this.toggleButton) {
        this.toggleButton.style.display = 'none';
      }
      // Push content using body padding (non-invasive approach)
      // Use the same width value to ensure they match
      document.body.style.paddingRight = `${sidebarWidth}px`;
      document.body.style.transition = 'padding-right 0.3s ease-in-out';
    } else {
      this.sidebar.classList.remove('octogpt-sidebar--visible');
      if (this.toggleButton) {
        this.toggleButton.style.display = 'flex';
      }
      // Restore body padding
      document.body.style.paddingRight = '';
      document.body.style.transition = '';
    }
  }

  /**
   * Update prompts data and re-render
   */
  updatePrompts(prompts) {
    this.prompts = prompts || [];
    this.render();
  }

  /**
   * Render the sidebar content
   */
  render() {
    if (!this.shadowRoot) return;

    const promptList = this.shadowRoot.querySelector('.octogpt-sidebar__prompt-list');
    const emptyState = this.shadowRoot.querySelector('.octogpt-sidebar__empty');

    if (!promptList || !emptyState) return;

    // Clear existing content
    promptList.innerHTML = '';

    if (this.prompts.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    // Render each prompt
    this.prompts.forEach((prompt, index) => {
      const promptItem = this.createPromptItem(prompt, index);
      promptList.appendChild(promptItem);
    });
  }

  /**
   * Calculate max characters for preview based on sidebar width
   * Accounts for padding and average character width at 13px font
   */
  getPreviewMaxLength() {
    const width = this.config.defaultWidth;
    const horizontalPadding = 40; // content + item padding
    const avgCharWidth = 7; // approximate width per character at 13px
    return Math.floor((width - horizontalPadding) / avgCharWidth);
  }

  /**
   * Truncate text to fit sidebar width
   */
  truncateText(text, maxLength) {
    const cleaned = text.trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return cleaned.substring(0, maxLength) + '...';
  }

  /**
   * Create a prompt list item element
   */
  createPromptItem(prompt, index) {
    const item = document.createElement('div');
    item.className = 'octogpt-sidebar__prompt-item';
    item.dataset.index = index;
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Prompt ${index + 1}: ${prompt.text.substring(0, 50)}`);

    // Build content
    const isActive = index === this.currentPromptIndex;
    const activeClass = isActive ? 'octogpt-sidebar__prompt-item--active' : '';

    item.className = `octogpt-sidebar__prompt-item ${activeClass}`;

    // Calculate display text based on current sidebar width
    const maxLength = this.getPreviewMaxLength();
    let displayText = this.truncateText(prompt.text, maxLength);
    if (prompt.isBranchPoint) {
      displayText = `< ${displayText} >`;
    }

    item.innerHTML = `
      <div class="octogpt-sidebar__prompt-text">${this.escapeHtml(displayText)}</div>
      ${prompt.isBranchPoint ? '<div class="octogpt-sidebar__prompt-meta"><span class="octogpt-sidebar__prompt-branch">branch</span></div>' : ''}
    `;

    // Add hover tooltip with full text
    item.title = prompt.text;

    return item;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Handle prompt click
   */
  handlePromptClick(index) {
    const prompt = this.prompts[index];
    if (!prompt || !prompt.element) return;

    // Scroll to the prompt element in the main chat
    // Phase 3 will implement smooth scrolling
    prompt.element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Update active state
    this.setActivePrompt(index);
  }

  /**
   * Set the active prompt index
   */
  setActivePrompt(index) {
    this.currentPromptIndex = index;
    this.render();
  }

  /**
   * Cleanup
   */
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.handleResizeEnd);
    if (this.sidebar && this.sidebar.parentNode) {
      this.sidebar.parentNode.removeChild(this.sidebar);
    }
    if (this.toggleButton && this.toggleButton.parentNode) {
      this.toggleButton.parentNode.removeChild(this.toggleButton);
    }
  }
}

// Export for use in content script
window.OctoGPTSidebar = OctoGPTSidebar;
