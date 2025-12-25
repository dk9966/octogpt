/**
 * OctoGPT Sidebar Module
 * Handles sidebar UI creation, rendering, and interactions
 */

// Note: DEBUG and log are defined in parser.js (loaded first)

class OctoGPTSidebar {
  constructor() {
    this.rootContainer = null;
    this.sidebar = null;
    this.shadowRoot = null;
    this.slab = null;
    this.isVisible = false;
    this.isPinned = false;
    this.isSettingsMode = false;
    this.prompts = [];
    this.currentPromptIndex = -1;
    this.collapsedPrompts = new Set(); // Track which prompts have collapsed headings
    this.config = {
      defaultWidth: 200,
      minWidth: 120,
      maxWidth: 400,
      scrollDuration: 100, // ms, 0 for instant
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
    this.toggleSettings = this.toggleSettings.bind(this);
    this.handleScrollDurationChange = this.handleScrollDurationChange.bind(this);
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
      const result = await chrome.storage.local.get(['sidebarPinned', 'sidebarWidth', 'scrollDuration']);
      this.isPinned = result.sidebarPinned !== undefined ? result.sidebarPinned : false;
      // If pinned, start visible; otherwise start hidden
      this.isVisible = this.isPinned;
      // Use saved width if within valid range
      if (result.sidebarWidth && 
          result.sidebarWidth >= this.config.minWidth && 
          result.sidebarWidth <= this.config.maxWidth) {
        this.config.defaultWidth = result.sidebarWidth;
      }
      // Load scroll duration (0-600ms range)
      if (result.scrollDuration !== undefined && 
          result.scrollDuration >= 0 && 
          result.scrollDuration <= 600) {
        this.config.scrollDuration = result.scrollDuration;
      }
    } catch (error) {
      log.error('Error loading sidebar state:', error);
      this.isPinned = false;
      this.isVisible = false;
      this.config.defaultWidth = 200;
      this.config.scrollDuration = 100;
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
        scrollDuration: this.config.scrollDuration,
      });
    } catch (error) {
      log.error('Error saving sidebar state:', error);
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
          <button class="octogpt-sidebar__logo-btn" aria-label="Toggle settings">
            <div class="octogpt-sidebar__logo">
              <img class="octogpt-sidebar__logo-icon" src="${chrome.runtime.getURL('assets/icons/icon48.png')}" alt="OctoGPT" />
              <span class="octogpt-sidebar__logo-text">OctoGPT</span>
            </div>
          </button>
          <div class="octogpt-sidebar__header-actions">
            <button class="octogpt-sidebar__collapse-all-btn" aria-label="Collapse all headers" title="Collapse all">
              <svg class="octogpt-sidebar__collapse-all-icon" viewBox="0 0 16 16" width="14" height="14">
                <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M4 4l4 3.5 4-3.5"/>
                <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M4 8.5l4 3.5 4-3.5"/>
              </svg>
            </button>
            <button class="octogpt-sidebar__pin-btn" aria-label="Pin sidebar" title="Pin sidebar">
              <svg class="octogpt-sidebar__pin-icon" viewBox="0 0 16 16" width="14" height="14">
                <path fill="currentColor" d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182a.5.5 0 0 1-.707 0 .5.5 0 0 1 0-.707l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="octogpt-sidebar__content">
          <div class="octogpt-sidebar__prompt-list" role="list">
            <!-- Prompts will be rendered here -->
          </div>
          <div class="octogpt-sidebar__empty">
            No prompts found
          </div>
          <div class="octogpt-sidebar__settings" style="display: none;">
            <div class="octogpt-sidebar__settings-section">
              <label class="octogpt-sidebar__settings-label">Scroll Duration (ms)</label>
              <div class="octogpt-sidebar__settings-controls">
                <input type="range" 
                       class="octogpt-sidebar__settings-slider" 
                       min="0" 
                       max="600" 
                       value="${this.config.scrollDuration}"
                       aria-label="Scroll duration slider">
                <input type="number" 
                       class="octogpt-sidebar__settings-input" 
                       min="0" 
                       max="600" 
                       value="${this.config.scrollDuration}"
                       aria-label="Scroll duration input">
              </div>
              <div class="octogpt-sidebar__settings-hint">
                Controls animation speed when scrolling to prompts (0 = instant)
              </div>
            </div>
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

      .octogpt-sidebar__logo-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
        overflow: hidden;
        border: none;
        background: transparent;
        padding: 0;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }

      .octogpt-sidebar__logo-btn:hover {
        opacity: 0.7;
      }

      .octogpt-sidebar__logo {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
        overflow: hidden;
      }

      .octogpt-sidebar__logo-icon {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .octogpt-sidebar__logo-text {
        font-weight: 600;
        font-size: 14px;
        letter-spacing: -0.2px;
        color: #0d0d0d;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      :host-context(.dark) .octogpt-sidebar__logo-text {
        color: #ececec;
      }

      .octogpt-sidebar__header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }

      .octogpt-sidebar__collapse-all-btn {
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

      .octogpt-sidebar__collapse-all-btn:hover {
        background: #f0f0f0;
        color: #0d0d0d;
      }

      :host-context(.dark) .octogpt-sidebar__collapse-all-btn {
        color: #b4b4b4;
      }

      :host-context(.dark) .octogpt-sidebar__collapse-all-btn:hover {
        background: #2f2f2f;
        color: #ececec;
      }

      .octogpt-sidebar__collapse-all-icon {
        transition: transform 0.2s ease;
      }

      .octogpt-sidebar__collapse-all-btn--collapsed .octogpt-sidebar__collapse-all-icon {
        transform: rotate(-90deg);
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

      /* Prompt group wrapper */
      .octogpt-sidebar__prompt-group {
        display: flex;
        flex-direction: column;
      }

      /* Toggle button for collapsing headings */
      .octogpt-sidebar__toggle-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        padding: 0;
        margin-right: 4px;
        border: none;
        background: transparent;
        color: #9a9a9a;
        cursor: pointer;
        transition: color 0.1s ease;
      }

      .octogpt-sidebar__toggle-btn:hover {
        color: #0d0d0d;
      }

      :host-context(.dark) .octogpt-sidebar__toggle-btn:hover {
        color: #ececec;
      }

      .octogpt-sidebar__toggle-icon {
        width: 8px;
        height: 8px;
        transition: transform 0.15s ease;
      }

      .octogpt-sidebar__toggle-btn--collapsed .octogpt-sidebar__toggle-icon {
        transform: rotate(-90deg);
      }

      /* Headings container */
      .octogpt-sidebar__headings {
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin-left: 12px;
        padding-left: 8px;
        border-left: 1px solid #e0e0e0;
        overflow: hidden;
        transition: max-height 0.2s ease, opacity 0.15s ease;
      }

      .octogpt-sidebar__headings--collapsed {
        max-height: 0;
        opacity: 0;
        pointer-events: none;
      }

      :host-context(.dark) .octogpt-sidebar__headings {
        border-left-color: #3a3a3a;
      }

      /* Heading item */
      .octogpt-sidebar__heading-item {
        display: flex;
        align-items: center;
        padding: 6px 10px;
        cursor: pointer;
        transition: all 0.15s ease;
        border-radius: 4px;
      }

      .octogpt-sidebar__heading-item:hover {
        background: #f5f5f5;
      }

      :host-context(.dark) .octogpt-sidebar__heading-item:hover {
        background: #2a2a2a;
      }

      .octogpt-sidebar__heading-text {
        font-size: 12px;
        line-height: 1.4;
        color: #6b6b6b;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      :host-context(.dark) .octogpt-sidebar__heading-text {
        color: #9a9a9a;
      }

      .octogpt-sidebar__heading-item:hover .octogpt-sidebar__heading-text {
        color: #0d0d0d;
      }

      :host-context(.dark) .octogpt-sidebar__heading-item:hover .octogpt-sidebar__heading-text {
        color: #ececec;
      }

      /* Settings page */
      .octogpt-sidebar__settings {
        padding: 16px;
      }

      .octogpt-sidebar__settings-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .octogpt-sidebar__settings-label {
        font-size: 13px;
        font-weight: 600;
        color: #0d0d0d;
      }

      :host-context(.dark) .octogpt-sidebar__settings-label {
        color: #ececec;
      }

      .octogpt-sidebar__settings-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 12px;
      }

      .octogpt-sidebar__settings-slider {
        flex: 1 1 80px;
        min-width: 0;
        height: 4px;
        border-radius: 2px;
        background: #e5e5e5;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
      }

      .octogpt-sidebar__settings-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #0d0d0d;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .octogpt-sidebar__settings-slider::-webkit-slider-thumb:hover {
        background: #333333;
      }

      .octogpt-sidebar__settings-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #0d0d0d;
        cursor: pointer;
        border: none;
        transition: background 0.15s ease;
      }

      .octogpt-sidebar__settings-slider::-moz-range-thumb:hover {
        background: #333333;
      }

      :host-context(.dark) .octogpt-sidebar__settings-slider {
        background: #3f3f3f;
      }

      :host-context(.dark) .octogpt-sidebar__settings-slider::-webkit-slider-thumb {
        background: #ececec;
      }

      :host-context(.dark) .octogpt-sidebar__settings-slider::-webkit-slider-thumb:hover {
        background: #ffffff;
      }

      :host-context(.dark) .octogpt-sidebar__settings-slider::-moz-range-thumb {
        background: #ececec;
      }

      :host-context(.dark) .octogpt-sidebar__settings-slider::-moz-range-thumb:hover {
        background: #ffffff;
      }

      .octogpt-sidebar__settings-input {
        flex: 1 1 60px;
        min-width: 60px;
        max-width: 100%;
        padding: 6px 8px;
        border: 1px solid #e5e5e5;
        border-radius: 6px;
        background: #ffffff;
        color: #0d0d0d;
        font-size: 13px;
        text-align: center;
        outline: none;
        transition: border-color 0.15s ease;
      }

      .octogpt-sidebar__settings-input:focus {
        border-color: #0d0d0d;
      }

      :host-context(.dark) .octogpt-sidebar__settings-input {
        background: #2f2f2f;
        border-color: #3f3f3f;
        color: #ececec;
      }

      :host-context(.dark) .octogpt-sidebar__settings-input:focus {
        border-color: #ececec;
      }

      .octogpt-sidebar__settings-hint {
        font-size: 12px;
        color: #6b6b6b;
        line-height: 1.4;
      }

      :host-context(.dark) .octogpt-sidebar__settings-hint {
        color: #b4b4b4;
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  /**
   * Attach event listeners to sidebar elements
   */
  attachEventListeners() {
    // Resize handle
    const resizeHandle = this.shadowRoot.querySelector('.octogpt-sidebar__resize-handle');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', this.handleResizeStart);
    }

    // Collapse all button
    const collapseAllBtn = this.shadowRoot.querySelector('.octogpt-sidebar__collapse-all-btn');
    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', () => this.toggleAllCollapsed());
    }

    // Pin button
    const pinBtn = this.shadowRoot.querySelector('.octogpt-sidebar__pin-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', () => this.togglePin());
    }

    // Logo button (settings toggle)
    const logoBtn = this.shadowRoot.querySelector('.octogpt-sidebar__logo-btn');
    if (logoBtn) {
      logoBtn.addEventListener('click', this.toggleSettings);
    }

    // Settings controls
    const scrollSlider = this.shadowRoot.querySelector('.octogpt-sidebar__settings-slider');
    const scrollInput = this.shadowRoot.querySelector('.octogpt-sidebar__settings-input');
    if (scrollSlider && scrollInput) {
      scrollSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        scrollInput.value = value;
        this.handleScrollDurationChange(value);
      });
      scrollInput.addEventListener('input', (e) => {
        let value = parseInt(e.target.value, 10);
        if (isNaN(value)) value = 0;
        value = Math.max(0, Math.min(600, value));
        scrollSlider.value = value;
        scrollInput.value = value;
        this.handleScrollDurationChange(value);
      });
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
      // When pinning, ensure sidebar is visible, hide slab, and push content
      if (!this.isVisible) {
        this.isVisible = true;
        this.updateVisibility();
      } else {
        // Sidebar already visible, just need to push content now that we're pinned
        this.adjustChatGPTLayout(this.config.defaultWidth, true);
      }
      if (this.slab) {
        this.slab.classList.add('octogpt-slab--hidden');
      }
    } else {
      // When unpinning, release content margin (no layout change = no scroll reset)
      this.adjustChatGPTLayout(0, false);
      
      // Check if cursor is currently over sidebar
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

  setupKeyboardShortcut() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Handle keyboard shortcuts
     */
  handleKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'h') {
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
   * Adjust ChatGPT layout elements to accommodate sidebar
   * Only pushes content when pinned - unpinned mode is overlay-only
   */
  adjustChatGPTLayout(width, animate = true) {
    // Only push content when pinned - unpinned sidebar overlays without affecting layout
    if (!this.isPinned) {
      // Clear any existing margin when unpinned
      const main = document.querySelector('main');
      const container = main?.parentElement;
      if (container) {
        container.style.marginRight = '';
        container.style.transition = '';
      }
      return;
    }

    // Find the outermost content container - the parent of main
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
      // Only push content when pinned
      if (this.isPinned) {
        this.adjustChatGPTLayout(sidebarWidth, true);
      }
    } else {
      this.sidebar.classList.remove('octogpt-sidebar--visible');
      // Only adjust layout when pinned - unpinned mode is overlay, no layout changes
      if (this.isPinned) {
        this.adjustChatGPTLayout(0, false);
      }
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
    const settings = this.shadowRoot.querySelector('.octogpt-sidebar__settings');

    if (!promptList || !emptyState || !settings) return;

    // Show/hide settings vs prompts based on mode
    const collapseAllBtn = this.shadowRoot.querySelector('.octogpt-sidebar__collapse-all-btn');
    
    if (this.isSettingsMode) {
      promptList.style.display = 'none';
      emptyState.style.display = 'none';
      settings.style.display = 'block';
      
      // Hide collapse-all button in settings mode
      if (collapseAllBtn) {
        collapseAllBtn.style.display = 'none';
      }
      
      // Update settings controls with current value
      const scrollSlider = this.shadowRoot.querySelector('.octogpt-sidebar__settings-slider');
      const scrollInput = this.shadowRoot.querySelector('.octogpt-sidebar__settings-input');
      if (scrollSlider && scrollInput) {
        scrollSlider.value = this.config.scrollDuration;
        scrollInput.value = this.config.scrollDuration;
      }
    } else {
      settings.style.display = 'none';
      
      // Show collapse-all button in prompts mode
      if (collapseAllBtn) {
        collapseAllBtn.style.display = 'flex';
      }
      
      // Clear existing content
      promptList.innerHTML = '';

      if (this.prompts.length === 0) {
        emptyState.style.display = 'block';
        promptList.style.display = 'none';
        return;
      }

      emptyState.style.display = 'none';
      promptList.style.display = 'flex';

      // Render each prompt
      this.prompts.forEach((prompt, index) => {
        const promptItem = this.createPromptItem(prompt, index);
        promptList.appendChild(promptItem);
      });

      // Update collapse-all button state
      this.updateCollapseAllButton();
    }
  }

  /**
   * Calculate max characters for preview based on sidebar width
   * Accounts for padding and average character width at 13px font
   */
  getPreviewMaxLength() {
    const width = this.config.defaultWidth;
    const horizontalPadding = 40; // content + item padding
    const avgCharWidth = 5.5; // approximate width per character at 13px
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
   * Create a prompt list item element with its headings
   */
  createPromptItem(prompt, index) {
    // Create a wrapper for prompt + headings
    const wrapper = document.createElement('div');
    wrapper.className = 'octogpt-sidebar__prompt-group';
    wrapper.dataset.index = index;

    // Create the prompt item
    const item = document.createElement('div');
    item.className = 'octogpt-sidebar__prompt-item';
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
    const hasHeadings = prompt.headings && prompt.headings.length > 0;
    const isCollapsed = this.collapsedPrompts.has(index);

    item.className = `octogpt-sidebar__prompt-item ${activeClass} ${prevClass} ${nextClass}`;

    // Calculate display text based on current sidebar width
    const maxLength = this.getPreviewMaxLength();
    let displayText = this.truncateText(prompt.text, maxLength);

    // Build HTML with toggle button, branch buttons, and text
    const toggleBtnHtml = hasHeadings ? `
      <button class="octogpt-sidebar__toggle-btn ${isCollapsed ? 'octogpt-sidebar__toggle-btn--collapsed' : ''}" 
              data-toggle-action="collapse" 
              title="${isCollapsed ? 'Expand headers' : 'Collapse headers'}">
        <svg class="octogpt-sidebar__toggle-icon" viewBox="0 0 8 8" fill="currentColor">
          <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    ` : '';
    const prevBtnHtml = hasPrev ? `<button class="octogpt-sidebar__branch-btn" data-branch-action="prev" title="Previous version">&lt;</button>` : '';
    const nextBtnHtml = hasNext ? `<button class="octogpt-sidebar__branch-btn" data-branch-action="next" title="Next version">&gt;</button>` : '';
    
    item.innerHTML = `
      ${prevBtnHtml}
      ${toggleBtnHtml}
      <div class="octogpt-sidebar__prompt-text">${this.escapeHtml(displayText)}</div>
      ${nextBtnHtml}
    `;

    // Add hover tooltip with full text
    item.title = prompt.text;

    // Add click handler for toggle button (does NOT scroll)
    // Option/Alt+click toggles ALL prompts (macOS Finder convention)
    if (hasHeadings) {
      const toggleBtn = item.querySelector('[data-toggle-action="collapse"]');
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.altKey) {
          // Alt/Option+click: toggle all to match this prompt's target state
          const willCollapse = !this.collapsedPrompts.has(index);
          this.toggleAllCollapsed(willCollapse);
        } else {
          this.togglePromptCollapse(index);
          this.updateCollapseAllButton();
        }
      });
    }

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

    // Add click handler on item for scrolling
    item.addEventListener('click', () => {
      this.handlePromptClick(index);
    });

    wrapper.appendChild(item);

    // Add headings if present
    if (hasHeadings) {
      const headingsContainer = document.createElement('div');
      headingsContainer.className = `octogpt-sidebar__headings ${isCollapsed ? 'octogpt-sidebar__headings--collapsed' : ''}`;

      prompt.headings.forEach(heading => {
        const headingItem = this.createHeadingItem(heading, maxLength);
        headingsContainer.appendChild(headingItem);
      });

      wrapper.appendChild(headingsContainer);
    }

    return wrapper;
  }

  /**
   * Toggle the collapsed state for a prompt's headings
   */
  togglePromptCollapse(index) {
    const promptList = this.shadowRoot?.querySelector('.octogpt-sidebar__prompt-list');
    if (!promptList) return;

    const wrapper = promptList.querySelector(`[data-index="${index}"]`);
    if (!wrapper) return;

    const toggleBtn = wrapper.querySelector('.octogpt-sidebar__toggle-btn');
    const headingsContainer = wrapper.querySelector('.octogpt-sidebar__headings');

    if (this.collapsedPrompts.has(index)) {
      // Expand
      this.collapsedPrompts.delete(index);
      if (toggleBtn) {
        toggleBtn.classList.remove('octogpt-sidebar__toggle-btn--collapsed');
        toggleBtn.title = 'Collapse headers';
      }
      if (headingsContainer) {
        headingsContainer.classList.remove('octogpt-sidebar__headings--collapsed');
      }
    } else {
      // Collapse
      this.collapsedPrompts.add(index);
      if (toggleBtn) {
        toggleBtn.classList.add('octogpt-sidebar__toggle-btn--collapsed');
        toggleBtn.title = 'Expand headers';
      }
      if (headingsContainer) {
        headingsContainer.classList.add('octogpt-sidebar__headings--collapsed');
      }
    }
  }

  /**
   * Toggle all prompts collapsed/expanded
   * @param {boolean} forceCollapse - If provided, force this state instead of toggling
   */
  toggleAllCollapsed(forceCollapse) {
    const promptsWithHeadings = this.prompts
      .map((p, i) => ({ prompt: p, index: i }))
      .filter(({ prompt }) => prompt.headings?.length > 0);

    if (promptsWithHeadings.length === 0) return;

    // Determine target state: if any are expanded, collapse all. Otherwise expand all.
    const allCollapsed = promptsWithHeadings.every(({ index }) => 
      this.collapsedPrompts.has(index)
    );

    const shouldCollapse = forceCollapse !== undefined ? forceCollapse : !allCollapsed;

    promptsWithHeadings.forEach(({ index }) => {
      if (shouldCollapse) {
        this.collapsedPrompts.add(index);
      } else {
        this.collapsedPrompts.delete(index);
      }
    });

    // Re-render to apply changes
    this.render();
    this.updateCollapseAllButton();
  }

  /**
   * Update the collapse-all button icon and title based on current state
   */
  updateCollapseAllButton() {
    const btn = this.shadowRoot?.querySelector('.octogpt-sidebar__collapse-all-btn');
    if (!btn) return;

    const promptsWithHeadings = this.prompts.filter(p => p.headings?.length > 0);
    if (promptsWithHeadings.length === 0) {
      btn.style.display = 'none';
      return;
    }

    btn.style.display = 'flex';

    const allCollapsed = this.prompts.every((p, i) => 
      !p.headings?.length || this.collapsedPrompts.has(i)
    );

    if (allCollapsed) {
      btn.classList.add('octogpt-sidebar__collapse-all-btn--collapsed');
      btn.title = 'Expand all';
      btn.setAttribute('aria-label', 'Expand all headers');
    } else {
      btn.classList.remove('octogpt-sidebar__collapse-all-btn--collapsed');
      btn.title = 'Collapse all';
      btn.setAttribute('aria-label', 'Collapse all headers');
    }
  }

  /**
   * Create a heading item element
   */
  createHeadingItem(heading, maxLength) {
    const item = document.createElement('div');
    item.className = `octogpt-sidebar__heading-item octogpt-sidebar__heading-item--${heading.level}`;
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');

    const displayText = this.truncateText(heading.text, maxLength - 4); // Account for indent
    item.innerHTML = `<span class="octogpt-sidebar__heading-text">${this.escapeHtml(displayText)}</span>`;
    item.title = heading.text;

    // Click to scroll to heading - re-query DOM to avoid stale references
    item.addEventListener('click', () => {
      const element = this.findHeadingElement(heading);
      if (element) {
        this.scrollToElement(element);
      }
    });

    return item;
  }

  /**
   * Find heading element in DOM by turn ID and index
   * Re-queries to avoid stale references after React re-renders
   */
  findHeadingElement(heading) {
    const turn = document.querySelector(`[data-testid="${heading.turnId}"]`);
    if (!turn) return null;

    const headings = turn.querySelectorAll(heading.level);
    return headings[heading.index] || null;
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

    // Check if element is still attached to DOM (React may have re-rendered)
    if (!prompt.element.isConnected) {
      log.warn('Element detached from DOM, skipping scroll');
      return;
    }

    // Update active state visually without re-rendering DOM
    this.setActivePrompt(index, true);

    // Scroll to the prompt element
    this.scrollToElement(prompt.element);
  }

  /**
   * Scroll to element in ChatGPT's conversation container
   * Uses direct scroll on the correct container to avoid react-scroll-to-bottom conflicts
   */
  scrollToElement(element) {
    // Find ChatGPT's actual scroll container (inside react-scroll-to-bottom)
    const scrollContainer = this.findScrollContainer();

    if (scrollContainer) {
      // Calculate position to center the element using getBoundingClientRect
      // Note: element.offsetTop is relative to offsetParent, not the scroll container,
      // so we must use getBoundingClientRect for accurate positioning
      const elementRect = element.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementOffsetInContainer = scrollContainer.scrollTop + elementRect.top - containerRect.top;
      const targetScroll = elementOffsetInContainer - (containerRect.height / 2) + (elementRect.height / 2);

      this.smoothScrollTo(scrollContainer, Math.max(0, targetScroll), this.config.scrollDuration);
    } else {
      // Fallback to scrollIntoView if container not found
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Custom smooth scroll with configurable duration
   * Uses easeOutCubic for natural deceleration
   * Pass duration=0 for instant teleport
   */
  smoothScrollTo(container, targetTop, duration) {
    if (duration <= 0) {
      container.scrollTop = targetTop;
      return;
    }

    const startTop = container.scrollTop;
    const distance = targetTop - startTop;
    const startTime = performance.now();

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      container.scrollTop = startTop + distance * eased;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  /**
   * Find ChatGPT's scroll container
   * The react-scroll-to-bottom library nests the scrollable element inside
   */
  findScrollContainer() {
    // Try common patterns for ChatGPT's scroll container
    const selectors = [
      'main [class*="react-scroll-to-bottom"] > div',
      'main [class*="react-scroll-to-bottom--css"]',
      'main [class*="overflow-y-auto"]'
    ];

    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container && container.scrollHeight > container.clientHeight) {
        return container;
      }
    }

    // Fallback: find any scrollable ancestor of a conversation turn
    const turn = document.querySelector('[data-testid^="conversation-turn-"]');
    if (turn) {
      let parent = turn.parentElement;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';
        if (isScrollable && parent.scrollHeight > parent.clientHeight) {
          return parent;
        }
        parent = parent.parentElement;
      }
    }

    return null;
  }

  /**
   * Set the active prompt index
   * @param {number} index - The prompt index to set as active
   * @param {boolean} skipRender - If true, update visually without full re-render
   */
  setActivePrompt(index, skipRender = false) {
    const prevIndex = this.currentPromptIndex;
    this.currentPromptIndex = index;

    if (skipRender) {
      // Update active class directly without rebuilding DOM
      const promptList = this.shadowRoot?.querySelector('.octogpt-sidebar__prompt-list');
      if (!promptList) return;

      // Remove active from previous
      if (prevIndex >= 0) {
        const prevGroup = promptList.querySelector(`[data-index="${prevIndex}"]`);
        const prevItem = prevGroup?.querySelector('.octogpt-sidebar__prompt-item');
        if (prevItem) {
          prevItem.classList.remove('octogpt-sidebar__prompt-item--active');
        }
      }

      // Add active to current
      const currentGroup = promptList.querySelector(`[data-index="${index}"]`);
      const currentItem = currentGroup?.querySelector('.octogpt-sidebar__prompt-item');
      if (currentItem) {
        currentItem.classList.add('octogpt-sidebar__prompt-item--active');
      }
    } else {
      this.render();
    }
  }

  /**
   * Toggle between settings and prompts view
   */
  toggleSettings() {
    this.isSettingsMode = !this.isSettingsMode;
    this.render();
  }

  /**
   * Handle scroll duration change from settings
   */
  async handleScrollDurationChange(value) {
    this.config.scrollDuration = Math.max(0, Math.min(600, value));
    await this.saveState();
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
