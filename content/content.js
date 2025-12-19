/**
 * OctoGPT Content Script
 * Main entry point that runs on ChatGPT pages
 */

class OctoGPT {
  constructor() {
    this.parser = new ChatGPTParser();
    this.sidebar = null;
    this.observer = null;
    this.prompts = [];
    this.isInitialized = false;
    this.debounceTimer = null;
    this.lastUpdateTime = 0;

    // Configuration
    this.config = {
      debounceDelay: 300, // ms to wait before re-parsing
      minUpdateInterval: 500, // minimum time between updates
    };
  }

  /**
   * Initialize the extension
   */
  async init() {
    if (this.isInitialized) return;

    console.log('[OctoGPT] Waiting for ChatGPT to be ready...');

    // Wait for React hydration to complete before touching the DOM
    await this.waitForHydration();

    console.log('[OctoGPT] ChatGPT ready, initializing...');
    await this.setup();
  }

  /**
   * Wait for React hydration to complete
   * Detects when React has attached its internal fiber properties to DOM elements
   */
  waitForHydration() {
    return new Promise((resolve) => {
      const TIMEOUT = 15000;
      const CHECK_INTERVAL = 100;
      const startTime = Date.now();

      const isHydrated = (element) => {
        if (!element) return false;
        return Object.keys(element).some(key =>
          key.startsWith('__reactFiber') || key.startsWith('__reactProps')
        );
      };

      const check = () => {
        const main = document.querySelector('main');
        
        // Check if main exists AND React has hydrated it
        if (main && isHydrated(main)) {
          // Small buffer to ensure event handlers are attached
          setTimeout(resolve, 100);
          return;
        }

        // Timeout fallback
        if (Date.now() - startTime > TIMEOUT) {
          console.warn('[OctoGPT] Hydration timeout, proceeding anyway');
          resolve();
          return;
        }

        // Keep checking
        setTimeout(check, CHECK_INTERVAL);
      };

      check();
    });
  }

  /**
   * Setup the extension after page is ready
   */
  async setup() {
    console.log('[OctoGPT] Setting up...');

    // Initialize sidebar
    if (window.OctoGPTSidebar) {
      this.sidebar = new OctoGPTSidebar();
      await this.sidebar.init();
    }

    // Initial extraction
    this.extractAndLog();

    // Setup mutation observer for real-time updates
    this.setupMutationObserver();

    // Listen for URL changes (navigation between conversations)
    this.setupNavigationListener();

    this.isInitialized = true;
    console.log('[OctoGPT] Initialized successfully');
  }

  /**
   * Extract prompts and log to console for validation
   */
  extractAndLog() {
    const now = Date.now();

    // Throttle updates
    if (now - this.lastUpdateTime < this.config.minUpdateInterval) {
      return;
    }

    this.lastUpdateTime = now;

    console.log('[OctoGPT] Extracting prompts...');

    const rawPrompts = this.parser.extractAllPrompts();
    const formattedPrompts = this.parser.formatPromptsForDisplay();

    this.prompts = formattedPrompts;

    // Update sidebar with new prompts
    if (this.sidebar) {
      this.sidebar.updatePrompts(formattedPrompts);
    }

    // Log results for Phase 1 validation
    console.log(`[OctoGPT] Found ${formattedPrompts.length} prompts`);

    if (formattedPrompts.length > 0) {
      console.group('[OctoGPT] Extracted Prompts:');

      formattedPrompts.forEach((prompt, index) => {
        const branchIndicator = prompt.isBranchPoint ? ' [EDITED/BRANCH]' :
          prompt.inBranch ? ' [IN BRANCH]' : '';

        console.log(`${index + 1}. ${prompt.display}${branchIndicator}`);
        console.log(`   Full text: "${prompt.text.substring(0, 100)}${prompt.text.length > 100 ? '...' : ''}"`);

        if (prompt.isBranchPoint) {
          console.log(`   -> This is a branch point (edited prompt)`);
        }
      });

      console.groupEnd();

      // Log branch structure
      const branchInfo = this.analyzeBranchStructure(formattedPrompts);
      if (branchInfo.hasBranches) {
        console.log(`[OctoGPT] Branch structure detected:`);
        console.log(`  - Branch points: ${branchInfo.branchPoints}`);
        console.log(`  - Prompts in active branch: ${branchInfo.promptsInBranch}`);
      }
    } else {
      console.log('[OctoGPT] No prompts found in current conversation');
    }
  }

  /**
   * Analyze the branch structure of prompts
   */
  analyzeBranchStructure(prompts) {
    const branchPoints = prompts.filter(p => p.isBranchPoint).length;
    const promptsInBranch = prompts.filter(p => p.inBranch).length;

    return {
      hasBranches: branchPoints > 0,
      branchPoints: branchPoints,
      promptsInBranch: promptsInBranch,
      totalPrompts: prompts.length,
    };
  }

  /**
   * Setup MutationObserver to detect changes in the conversation
   */
  setupMutationObserver() {
    console.log('[OctoGPT] Setting up MutationObserver...');

    // Target the main conversation container
    const targetNode = document.querySelector('main') || document.body;

    const config = {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    };

    // Callback for mutations
    const callback = (mutationsList, observer) => {
      let shouldUpdate = false;

      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          // Check if added nodes contain message content
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if this is a message-related element
              if (this.isMessageNode(node)) {
                shouldUpdate = true;
              }
            }
          });

          // Check if removed nodes were messages (deleted/regenerated)
          mutation.removedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (this.isMessageNode(node)) {
                shouldUpdate = true;
              }
            }
          });
        }
      }

      if (shouldUpdate) {
        this.debouncedUpdate();
      }
    };

    this.observer = new MutationObserver(callback);
    this.observer.observe(targetNode, config);

    console.log('[OctoGPT] MutationObserver active');
  }

  /**
   * Check if a node is a message node
   */
  isMessageNode(node) {
    if (!node.querySelector) return false;

    // Check for common message indicators
    const hasMessageRole = node.hasAttribute?.('data-message-author-role');
    const hasConversationTurn = node.hasAttribute?.('data-testid') &&
      node.getAttribute('data-testid').startsWith('conversation-turn-');
    const hasMessageContent = node.querySelector?.('[class*="markdown"], .whitespace-pre-wrap');

    return hasMessageRole || hasConversationTurn || hasMessageContent;
  }

  /**
   * Debounced update to avoid excessive re-parsing
   */
  debouncedUpdate() {
    clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      console.log('[OctoGPT] Detected changes, updating...');
      this.extractAndLog();
    }, this.config.debounceDelay);
  }

  /**
   * Setup listener for navigation between conversations
   */
  setupNavigationListener() {
    let lastUrl = window.location.href;

    // Listen for URL changes using history API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      window.dispatchEvent(new Event('locationchange'));
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('locationchange'));
    };

    window.addEventListener('popstate', () => {
      window.dispatchEvent(new Event('locationchange'));
    });

    window.addEventListener('locationchange', () => {
      const currentUrl = window.location.href;

      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('[OctoGPT] Navigation detected, re-initializing...');

        // Wait a bit for new content to load
        setTimeout(() => {
          this.extractAndLog();
        }, 1000);
      }
    });
  }

  /**
   * Get current prompts
   */
  getPrompts() {
    return this.prompts;
  }

  /**
   * Cleanup on unload
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.sidebar) {
      this.sidebar.destroy();
      this.sidebar = null;
    }

    clearTimeout(this.debounceTimer);

    console.log('[OctoGPT] Cleaned up');
  }
}

// Initialize when script loads
const octogpt = new OctoGPT();
octogpt.init();

// Make available globally for debugging
window.octogpt = octogpt;

console.log('[OctoGPT] Content script loaded');

// Cleanup before unload
window.addEventListener('beforeunload', () => {
  octogpt.destroy();
});



