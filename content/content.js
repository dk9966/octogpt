/**
 * OctoGPT Content Script
 * Main entry point that runs on ChatGPT and Gemini pages
 */

class OctoGPT {
  constructor() {
    this.parser = null; // Will be set based on detected site
    this.site = null; // 'chatgpt' or 'gemini'
    this.sidebar = null;
    this.observer = null;
    this.prompts = [];
    this.isInitialized = false;
    this.debounceTimer = null;
    this.streamingPollTimer = null;
    this.lastUpdateTime = 0;

    // Configuration
    this.config = {
      debounceDelay: 300, // ms to wait before re-parsing
      minUpdateInterval: 500, // minimum time between updates
      streamingPollInterval: 800, // ms between polls during streaming
    };
  }

  /**
   * Detect which site we're on
   */
  detectSite() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    if (hostname.includes('gemini.google.com') || hostname.includes('aistudio.google.com')) {
      return 'gemini';
    }
    
    if (hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com')) {
      return 'chatgpt';
    }

    // Default fallback based on URL patterns
    if (pathname.includes('/share/') || pathname.includes('/app/')) {
      return 'gemini';
    }

    return 'chatgpt'; // Default fallback
  }

  /**
   * Initialize the extension
   */
  async init() {
    if (this.isInitialized) return;

    // Detect site and initialize appropriate parser
    this.site = this.detectSite();
    
    if (this.site === 'gemini') {
      if (typeof GeminiParser === 'undefined') {
        log.error('GeminiParser not available');
        return;
      }
      this.parser = new GeminiParser();
      log.info('Detected Gemini, initializing Gemini parser...');
    } else {
      if (typeof ChatGPTParser === 'undefined') {
        log.error('ChatGPTParser not available');
        return;
      }
      this.parser = new ChatGPTParser();
      log.info('Detected ChatGPT, initializing ChatGPT parser...');
    }

    log.info(`Waiting for ${this.site} to be ready...`);

    // Wait for site-specific DOM elements to be present
    await this.waitForReady();

    log.info(`${this.site} ready, initializing...`);
    await this.setup();
  }

  /**
   * Wait for page to be ready
   * Checks for site-specific DOM elements
   */
  waitForReady() {
    return new Promise((resolve) => {
      const TIMEOUT = 10000;
      const CHECK_INTERVAL = 50;
      const startTime = Date.now();

      const isReady = () => {
        const main = document.querySelector('main');
        if (!main) return false;

        if (this.site === 'gemini') {
          // Gemini: check for user-query or model-response or input area
          const hasContent = document.querySelector('user-query') ||
                             document.querySelector('model-response') ||
                             document.querySelector('.conversation-container');
          const hasInput = document.querySelector('[aria-label*="Enter a prompt" i], [contenteditable="true"][role="textbox"]');
          return hasContent || hasInput;
        } else {
          // ChatGPT: check for conversation turns or input area
          const hasContent = document.querySelector('[data-testid^="conversation-turn-"]') ||
                             document.querySelector('[data-message-author-role]');
          const hasInput = document.querySelector('#prompt-textarea, textarea[placeholder], [contenteditable="true"]');
          return hasContent || hasInput;
        }
      };

      const check = () => {
        if (isReady()) {
          setTimeout(resolve, 50);
          return;
        }

        if (Date.now() - startTime > TIMEOUT) {
          log.warn('Ready timeout, proceeding anyway');
          resolve();
          return;
        }

        setTimeout(check, CHECK_INTERVAL);
      };

      check();
    });
  }

  /**
   * Setup the extension after page is ready
   */
  async setup() {
    log.info('Setting up...');

    // Initialize sidebar
    if (window.OctoGPTSidebar) {
      this.sidebar = new OctoGPTSidebar();
      await this.sidebar.init();
    }

    // Initial extraction (will set loading state to 'parsing' if needed)
    this.extractAndLog();

    // Setup mutation observer for real-time updates
    this.setupMutationObserver();

    // Listen for URL changes (navigation between conversations)
    this.setupNavigationListener();

    this.isInitialized = true;
    log.info('Initialized successfully');
  }

  /**
   * Check if conversation content exists in DOM
   */
  hasConversationContent() {
    if (this.site === 'gemini') {
      return !!(document.querySelector('user-query') || 
                document.querySelector('model-response') ||
                document.querySelector('.conversation-container'));
    } else {
      return !!(document.querySelector('[data-testid^="conversation-turn-"]') ||
                document.querySelector('[data-message-author-role]'));
    }
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

    // Check if conversation content exists before setting loading state
    const hasContent = this.hasConversationContent();
    
    if (this.sidebar && this.sidebar.isLoading) {
      if (hasContent) {
        // Content exists, now parsing
        this.sidebar.setLoadingState('parsing');
      } else {
        // No content yet, still waiting
        this.sidebar.setLoadingState('waiting');
      }
    }

    log.info('Extracting prompts...');

    this.parser.extractAllPrompts();
    const formattedPrompts = this.parser.formatPromptsForDisplay();

    // Mark the last prompt as generating if streaming is happening
    if (formattedPrompts.length > 0 && this.isStreaming()) {
      formattedPrompts[formattedPrompts.length - 1].isGenerating = true;
    }

    this.prompts = formattedPrompts;

    // Update sidebar with new prompts
    if (this.sidebar) {
      this.sidebar.updatePrompts(formattedPrompts);
      // Clear loading state once we have prompts
      if (formattedPrompts.length > 0) {
        this.sidebar.setLoadingState(null);
      }
    }

    // Log results for debugging
    log.info(`Found ${formattedPrompts.length} prompts`);

    if (formattedPrompts.length > 0) {
      log.group('[OctoGPT] Extracted Prompts:');

      formattedPrompts.forEach((prompt, index) => {
        const branchIndicator = prompt.isBranchPoint ? ' [EDITED/BRANCH]' :
          prompt.inBranch ? ' [IN BRANCH]' : '';

        log.info(`${index + 1}. ${prompt.display}${branchIndicator}`);
        log.info(`   Full text: "${prompt.text.substring(0, 100)}${prompt.text.length > 100 ? '...' : ''}"`);

        if (prompt.isBranchPoint) {
          log.info(`   -> This is a branch point (edited prompt)`);
        }
      });

      log.groupEnd();

      // Log branch structure
      const branchInfo = this.analyzeBranchStructure(formattedPrompts);
      if (branchInfo.hasBranches) {
        log.info(`Branch structure detected:`);
        log.info(`  - Branch points: ${branchInfo.branchPoints}`);
        log.info(`  - Prompts in active branch: ${branchInfo.promptsInBranch}`);
      }
    } else {
      log.info('No prompts found in current conversation');
    }

    // If a response is still streaming, schedule another extraction to catch new headings
    this.scheduleStreamingPoll();
  }

  /**
   * Check if any response is currently streaming
   */
  isStreaming() {
    if (this.site === 'gemini') {
      // Gemini streaming indicators
      const streamingIndicators = document.querySelectorAll(
        '[class*="streaming"], [aria-busy="true"], .response-container-header-processing-state:not(:empty)'
      );
      return streamingIndicators.length > 0;
    } else {
      // ChatGPT streaming indicators
      const streamingIndicators = document.querySelectorAll(
        '[class*="result-streaming"], [class*="streaming"], [data-testid="stop-button"]'
      );
      return streamingIndicators.length > 0;
    }
  }

  /**
   * Schedule continued polling while streaming to catch new headings in real-time
   */
  scheduleStreamingPoll() {
    // Clear any existing poll timer
    clearTimeout(this.streamingPollTimer);

    if (this.isStreaming()) {
      log.info('Streaming detected, scheduling poll for new headings...');
      this.streamingPollTimer = setTimeout(() => {
        // Force update by resetting throttle (we want to capture new headings)
        this.lastUpdateTime = 0;
        this.extractAndLog();
      }, this.config.streamingPollInterval);
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
    log.info('Setting up MutationObserver...');

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

    log.info('MutationObserver active');
  }

  /**
   * Check if a node is a message node
   */
  isMessageNode(node) {
    if (!node.querySelector) return false;

    if (this.site === 'gemini') {
      // Gemini message indicators
      const isUserQuery = node.tagName === 'USER-QUERY' || node.querySelector?.('user-query');
      const isModelResponse = node.tagName === 'MODEL-RESPONSE' || node.querySelector?.('model-response');
      const isConversationContainer = node.classList?.contains('conversation-container');
      return isUserQuery || isModelResponse || isConversationContainer;
    } else {
      // ChatGPT message indicators
      const hasMessageRole = node.hasAttribute?.('data-message-author-role');
      const hasConversationTurn = node.hasAttribute?.('data-testid') &&
        node.getAttribute('data-testid').startsWith('conversation-turn-');
      const hasMessageContent = node.querySelector?.('[class*="markdown"], .whitespace-pre-wrap');

      const isMessage = hasMessageRole || hasConversationTurn || hasMessageContent;
      
      return isMessage;
    }
  }

  /**
   * Debounced update to avoid excessive re-parsing
   */
  debouncedUpdate() {
    clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      log.info('Detected changes, updating...');
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
        log.info('Navigation detected, re-initializing...');

        // Set loading state immediately when navigating
        if (this.sidebar) {
          this.sidebar.setLoadingState('waiting');
        }

        // Poll for content to appear, then extract
        this.waitForContentAndExtract();
      }
    });
  }

  /**
   * Wait for conversation content to appear, then extract
   */
  waitForContentAndExtract() {
    const maxWait = 10000; // 10 second max
    const checkInterval = 100;
    const startTime = Date.now();

    const check = () => {
      if (this.hasConversationContent()) {
        // Content found, extract
        this.extractAndLog();
        return;
      }

      if (Date.now() - startTime > maxWait) {
        // Timeout, try extracting anyway (might be empty conversation)
        this.extractAndLog();
        return;
      }

      setTimeout(check, checkInterval);
    };

    check();
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
    clearTimeout(this.streamingPollTimer);

    log.info('Cleaned up');
  }
}

// Initialize when script loads
const octogpt = new OctoGPT();
octogpt.init();

// Make available globally for debugging
window.octogpt = octogpt;

log.info('Content script loaded');

// Cleanup before unload
window.addEventListener('beforeunload', () => {
  octogpt.destroy();
});
