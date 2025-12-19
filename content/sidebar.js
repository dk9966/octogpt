/**
 * OctoGPT Sidebar Module
 * Handles sidebar UI creation, rendering, and interactions
 */

class OctoGPTSidebar {
  constructor() {
    this.rootContainer = null;
    this.sidebar = null;
    this.shadowRoot = null;
    this.slab = null;
    this.isVisible = false;
    this.isPinned = false;
    this.prompts = [];
    this.currentPromptIndex = -1;
    this.config = {
      defaultWidth: 200,
      minWidth: 120,
      maxWidth: 400,
    };

    // Resize state
    this.isResizing = false;

    // Hover state for unpinned mode
    this.isHovering = false;
    this.hideTimeout = null;

    // Bind methods
    this.toggle = this.toggle.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.render = this.render.bind(this);
    this.handleResizeStart = this.handleResizeStart.bind(this);
    this.handleResizeMove = this.handleResizeMove.bind(this);
    this.handleResizeEnd = this.handleResizeEnd.bind(this);
    this.handleSlabMouseEnter = this.handleSlabMouseEnter.bind(this);
    this.handleSidebarMouseEnter = this.handleSidebarMouseEnter.bind(this);
    this.handleSidebarMouseLeave = this.handleSidebarMouseLeave.bind(this);
    this.handleSidebarTransitionEnd = this.handleSidebarTransitionEnd.bind(this);
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
      const result = await chrome.storage.local.get(['sidebarPinned', 'sidebarWidth']);
      this.isPinned = result.sidebarPinned !== undefined ? result.sidebarPinned : false;
      // If pinned, start visible; otherwise start hidden
      this.isVisible = this.isPinned;
      // Use saved width if within valid range
      if (result.sidebarWidth && 
          result.sidebarWidth >= this.config.minWidth && 
          result.sidebarWidth <= this.config.maxWidth) {
        this.config.defaultWidth = result.sidebarWidth;
      }
    } catch (error) {
      console.error('[OctoGPT] Error loading sidebar state:', error);
      this.isPinned = false;
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
        sidebarPinned: this.isPinned,
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
    // Create a root container outside React's hydration scope
    // This prevents React hydration errors when ChatGPT re-renders
    this.rootContainer = document.createElement('div');
    this.rootContainer.id = 'octogpt-root';
    this.rootContainer.setAttribute('data-octogpt', 'true');
    document.body.appendChild(this.rootContainer);

    // Create sidebar inside our container
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'octogpt-sidebar';
    this.sidebar.className = 'octogpt-sidebar';

    // Create shadow root for style isolation
    this.shadowRoot = this.sidebar.attachShadow({ mode: 'open' });

    // Create HTML structure first
    const html = `
      <div class="octogpt-sidebar__resize-handle" aria-label="Resize sidebar"></div>
      <div class="octogpt-sidebar__container">
        <div class="octogpt-sidebar__header">
          <div class="octogpt-sidebar__logo">
            <span class="octogpt-sidebar__logo-text">OctoGPT</span>
          </div>
          <button class="octogpt-sidebar__pin-btn" aria-label="Pin sidebar" title="Pin sidebar">
            <svg class="octogpt-sidebar__pin-icon" viewBox="0 0 16 16" width="14" height="14">
              <path fill="currentColor" d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182a.5.5 0 0 1-.707 0 .5.5 0 0 1 0-.707l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
            </svg>
          </button>
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

    // Inject styles after HTML so they don't get overwritten
    this.injectStyles();

    // Attach event listeners
    this.attachEventListeners();

    // Append to our isolated container (not directly to body)
    this.rootContainer.appendChild(this.sidebar);

    // Create hover slab
    this.createSlab();

    // Set initial visibility
    this.updateVisibility();

    // Initialize slab visibility (separate from updateVisibility for timing)
    this.initSlabVisibility();
  }

  /**
   * Create the hover slab that triggers sidebar on mouseenter
   */
  createSlab() {
    this.slab = document.createElement('div');
    this.slab.className = 'octogpt-slab';
    this.slab.setAttribute('aria-label', 'Show OctoGPT sidebar');
    this.slab.innerHTML = '<span class="octogpt-slab__arrow">&lt;</span>';
    this.slab.addEventListener('mouseenter', this.handleSlabMouseEnter);
    this.rootContainer.appendChild(this.slab);
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
        left: 0;
        top: 0;
        width: 4px;
        height: 100%;
        cursor: ew-resize;
        background: transparent;
        z-index: 10;
      }

      .octogpt-sidebar__resize-handle:hover,
      .octogpt-sidebar__resize-handle--active {
        background: rgba(0, 0, 0, 0.08);
      }

      :host-context(.dark) .octogpt-sidebar__resize-handle:hover,
      :host-context(.dark) .octogpt-sidebar__resize-handle--active {
        background: rgba(255, 255, 255, 0.1);
      }

      .octogpt-sidebar__container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #ffffff;
        border-left: 1px solid #e5e5e5;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 14px;
        color: #0d0d0d;
      }

      :host-context(.dark) .octogpt-sidebar__container {
        background: #212121;
        border-left-color: #2f2f2f;
        color: #ececec;
      }

      .octogpt-sidebar__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: transparent;
      }

      .octogpt-sidebar__logo {
        font-weight: 600;
        font-size: 14px;
        color: #0d0d0d;
      }

      :host-context(.dark) .octogpt-sidebar__logo {
        color: #ececec;
      }

      .octogpt-sidebar__logo-text {
        letter-spacing: -0.2px;
      }

      .octogpt-sidebar__pin-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #6b6b6b;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .octogpt-sidebar__pin-btn:hover {
        background: #f0f0f0;
        color: #0d0d0d;
      }

      .octogpt-sidebar__pin-btn--active {
        color: #0d0d0d;
        background: #e5e5e5;
      }

      :host-context(.dark) .octogpt-sidebar__pin-btn {
        color: #b4b4b4;
      }

      :host-context(.dark) .octogpt-sidebar__pin-btn:hover {
        background: #2f2f2f;
        color: #ececec;
      }

      :host-context(.dark) .octogpt-sidebar__pin-btn--active {
        color: #ececec;
        background: #3f3f3f;
      }

      .octogpt-sidebar__pin-icon {
        transition: transform 0.15s ease;
      }

      .octogpt-sidebar__pin-btn--active .octogpt-sidebar__pin-icon {
        transform: rotate(45deg);
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

      :host-context(.dark) .octogpt-sidebar__content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
      }

      :host-context(.dark) .octogpt-sidebar__content::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .octogpt-sidebar__prompt-list {
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .octogpt-sidebar__prompt-item {
        display: flex;
        align-items: center;
        gap: 0;
        box-sizing: border-box;
        padding: 10px 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        border-radius: 6px;
        margin: 0;
        border: none;
      }

      .octogpt-sidebar__prompt-item--has-prev {
        padding-left: 0;
      }

      .octogpt-sidebar__prompt-item--has-next {
        padding-right: 0;
      }

      .octogpt-sidebar__prompt-item:hover {
        background: #f0f0f0;
      }

      .octogpt-sidebar__prompt-item--active {
        background: #e5e5e5;
      }

      :host-context(.dark) .octogpt-sidebar__prompt-item:hover {
        background: #2f2f2f;
      }

      :host-context(.dark) .octogpt-sidebar__prompt-item--active {
        background: #3f3f3f;
      }

      .octogpt-sidebar__prompt-text {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        line-height: 1.5;
        color: #0d0d0d;
        word-break: break-word;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      :host-context(.dark) .octogpt-sidebar__prompt-text {
        color: #ececec;
      }

      .octogpt-sidebar__branch-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 12px;
        flex-shrink: 0;
        padding: 0;
        border: none;
        background: transparent;
        color: #9a9a9a;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        border-radius: 0;
        transition: all 0.1s ease;
        line-height: 1;
      }

      .octogpt-sidebar__branch-btn:hover {
        color: #0d0d0d;
      }

      :host-context(.dark) .octogpt-sidebar__branch-btn:hover {
        color: #ececec;
      }

      .octogpt-sidebar__empty {
        padding: 32px 16px;
        text-align: center;
        color: #6b6b6b;
        font-size: 13px;
        display: none;
      }

      :host-context(.dark) .octogpt-sidebar__empty {
        color: #b4b4b4;
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

    // Pin button
    const pinBtn = this.shadowRoot.querySelector('.octogpt-sidebar__pin-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', () => this.togglePin());
    }

    // Sidebar hover events for unpinned mode
    this.sidebar.addEventListener('mouseenter', this.handleSidebarMouseEnter);
    this.sidebar.addEventListener('mouseleave', this.handleSidebarMouseLeave);
    this.sidebar.addEventListener('transitionend', this.handleSidebarTransitionEnd);
  }

  /**
   * Handle slab mouseenter - show sidebar
   */
  handleSlabMouseEnter() {
    if (this.isPinned) return;
    
    // Clear any pending hide timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    this.isHovering = true;
    this.showSidebar();
  }

  /**
   * Handle sidebar mouseenter - keep sidebar visible
   */
  handleSidebarMouseEnter() {
    if (this.isPinned) return;

    // Clear any pending hide timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    this.isHovering = true;
  }

  /**
   * Handle sidebar mouseleave - start hiding sidebar
   */
  handleSidebarMouseLeave() {
    if (this.isPinned || this.isResizing) return;

    this.isHovering = false;
    
    // Small delay to allow moving back into sidebar
    this.hideTimeout = setTimeout(() => {
      if (!this.isHovering && !this.isResizing) {
        this.hideSidebar();
      }
    }, 100);
  }

  /**
   * Handle sidebar transition end - show slab after sidebar fully hidden
   */
  handleSidebarTransitionEnd(e) {
    // Only handle transform transitions on the sidebar itself
    if (e.propertyName !== 'transform') return;
    
    // If sidebar is now hidden and not pinned, show the slab
    if (!this.isVisible && !this.isPinned && this.slab) {
      this.slab.classList.remove('octogpt-slab--hidden');
    }
  }

  /**
   * Show sidebar (for hover mode)
   */
  showSidebar() {
    if (this.isVisible) return;

    // Hide slab immediately
    if (this.slab) {
      this.slab.classList.add('octogpt-slab--hidden');
    }

    this.isVisible = true;
    this.updateVisibility();
  }

  /**
   * Hide sidebar (for hover mode)
   */
  hideSidebar() {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.updateVisibility();
    // Note: slab will be shown in handleSidebarTransitionEnd after animation completes
  }

  /**
   * Toggle pin state
   */
  async togglePin() {
    this.isPinned = !this.isPinned;
    
    // Update pin button visual state
    const pinBtn = this.shadowRoot.querySelector('.octogpt-sidebar__pin-btn');
    if (pinBtn) {
      pinBtn.classList.toggle('octogpt-sidebar__pin-btn--active', this.isPinned);
      pinBtn.setAttribute('title', this.isPinned ? 'Unpin sidebar' : 'Pin sidebar');
      pinBtn.setAttribute('aria-label', this.isPinned ? 'Unpin sidebar' : 'Pin sidebar');
    }

    if (this.isPinned) {
      // When pinning, ensure sidebar is visible and hide slab
      if (!this.isVisible) {
        this.isVisible = true;
        this.updateVisibility();
      }
      if (this.slab) {
        this.slab.classList.add('octogpt-slab--hidden');
      }
    } else {
      // When unpinning, check if cursor is currently over sidebar
      // If not, hide the sidebar immediately
      const isMouseOverSidebar = this.sidebar.matches(':hover');
      if (!isMouseOverSidebar) {
        this.isHovering = false;
        this.hideSidebar();
      } else {
        this.isHovering = true;
      }
    }

    await this.saveState();
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
    
    // Adjust ChatGPT layout without animation during drag
    this.adjustChatGPTLayout(clampedWidth, false);
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
    // Cmd/Ctrl + I to toggle sidebar
    if ((event.metaKey || event.ctrlKey) && event.key === 'i') {
      // Don't trigger if user is typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      event.preventDefault();
      this.toggle();
    }
  }

  /**
   * Toggle sidebar pin state (keyboard shortcut)
   */
  async toggle() {
    await this.togglePin();
  }

  /**
   * Show sidebar (pinned)
   */
  async show() {
    if (!this.isPinned) {
      this.isPinned = true;
      this.isVisible = true;
      this.updateVisibility();
      await this.saveState();
    }
  }

  /**
   * Hide sidebar (unpin)
   */
  async hide() {
    if (this.isPinned) {
      this.isPinned = false;
      this.isVisible = false;
      this.updateVisibility();
      await this.saveState();
    }
  }

  /**
   * Adjust ChatGPT layout elements to accommodate sidebar
   */
  adjustChatGPTLayout(width, animate = true) {
    // Find the outermost content container - the parent of main
    // This typically contains both the header and main content
    const main = document.querySelector('main');
    const container = main?.parentElement;
    
    if (!container) return;

    const transition = animate ? 'margin-right 0.3s ease-in-out' : 'none';

    if (width > 0) {
      container.style.marginRight = `${width}px`;
      container.style.transition = transition;
    } else {
      container.style.marginRight = '';
      container.style.transition = '';
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
      // Hide slab when sidebar is visible
      if (this.slab) {
        this.slab.classList.add('octogpt-slab--hidden');
      }
      this.adjustChatGPTLayout(sidebarWidth, true);
    } else {
      this.sidebar.classList.remove('octogpt-sidebar--visible');
      this.adjustChatGPTLayout(0, false);
      // Note: slab will be shown via handleSidebarTransitionEnd after animation,
      // EXCEPT on initial load where we need to show it immediately
    }

    // Update pin button state
    const pinBtn = this.shadowRoot?.querySelector('.octogpt-sidebar__pin-btn');
    if (pinBtn) {
      pinBtn.classList.toggle('octogpt-sidebar__pin-btn--active', this.isPinned);
      pinBtn.setAttribute('title', this.isPinned ? 'Unpin sidebar' : 'Pin sidebar');
      pinBtn.setAttribute('aria-label', this.isPinned ? 'Unpin sidebar' : 'Pin sidebar');
    }
  }

  /**
   * Initialize slab visibility (called once after sidebar is created)
   */
  initSlabVisibility() {
    if (!this.slab) return;
    
    // Show slab only if not pinned and not visible
    if (this.isPinned || this.isVisible) {
      this.slab.classList.add('octogpt-slab--hidden');
    } else {
      this.slab.classList.remove('octogpt-slab--hidden');
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
    const hasBranches = prompt.isBranchPoint && prompt.branchInfo;
    const hasPrev = hasBranches && prompt.branchInfo.prevButton;
    const hasNext = hasBranches && prompt.branchInfo.nextButton;
    const prevClass = hasPrev ? 'octogpt-sidebar__prompt-item--has-prev' : '';
    const nextClass = hasNext ? 'octogpt-sidebar__prompt-item--has-next' : '';

    item.className = `octogpt-sidebar__prompt-item ${activeClass} ${prevClass} ${nextClass}`;

    // Calculate display text based on current sidebar width
    const maxLength = this.getPreviewMaxLength();
    let displayText = this.truncateText(prompt.text, maxLength);

    // Build HTML with branch buttons only where they exist
    const prevBtnHtml = hasPrev ? `<button class="octogpt-sidebar__branch-btn" data-branch-action="prev" title="Previous version">&lt;</button>` : '';
    const nextBtnHtml = hasNext ? `<button class="octogpt-sidebar__branch-btn" data-branch-action="next" title="Next version">&gt;</button>` : '';
    
    item.innerHTML = `
      ${prevBtnHtml}
      <div class="octogpt-sidebar__prompt-text">${this.escapeHtml(displayText)}</div>
      ${nextBtnHtml}
    `;

    // Add hover tooltip with full text
    item.title = prompt.text;

    // Add click handlers for branch navigation buttons
    if (hasPrev) {
      const prevBtn = item.querySelector('[data-branch-action="prev"]');
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        prompt.branchInfo.prevButton.click();
      });
    }
    
    if (hasNext) {
      const nextBtn = item.querySelector('[data-branch-action="next"]');
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        prompt.branchInfo.nextButton.click();
      });
    }

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
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    // Remove the entire root container (includes sidebar and slab)
    if (this.rootContainer && this.rootContainer.parentNode) {
      this.rootContainer.parentNode.removeChild(this.rootContainer);
    }
    this.sidebar = null;
    this.slab = null;
    this.rootContainer = null;
  }
}

// Export for use in content script
window.OctoGPTSidebar = OctoGPTSidebar;
