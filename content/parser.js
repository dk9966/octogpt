/**
 * OctoGPT Parser Module
 * Handles extraction of user prompts from ChatGPT, Gemini, and Claude DOM
 */

/**
 * Debug logging configuration
 * Set to true to enable console output
 */
const DEBUG = false;
const DEBUG_NAV = false;

const log = {
  info: (...args) => DEBUG && console.log('[OctoGPT]', ...args),
  warn: (...args) => DEBUG && console.warn('[OctoGPT]', ...args),
  error: (...args) => DEBUG && console.error('[OctoGPT]', ...args),
  group: (label) => DEBUG && console.group(label),
  groupEnd: () => DEBUG && console.groupEnd(),
  // Navigation/state tracking - always logs (not gated by DEBUG)
  nav: (msg) => DEBUG && DEBUG_NAV && console.log('[OctoGPT]', window.location.pathname, '-', msg),
};

/**
 * Base parser class with common interface
 * Site-specific parsers extend this class
 */
class BaseParser {
    constructor() {
        this.prompts = [];
        this.conversationId = null;
        this.selectors = {};
    }

    /**
     * Get the current conversation ID from URL
     * Must be implemented by subclasses
     */
    getConversationId() {
        throw new Error('getConversationId() must be implemented by subclass');
    }

    /**
     * Extract all user prompts from the current page
     */
    extractAllPrompts() {
        this.conversationId = this.getConversationId();
        this.prompts = [];

        if (!this.conversationId) {
            log.info('No conversation detected');
            return [];
        }

        const prompts = this.findUserMessages();
        this.prompts = prompts;

        return prompts;
    }

    /**
     * Find all user messages in the DOM
     * Must be implemented by subclasses
     */
    findUserMessages() {
        throw new Error('findUserMessages() must be implemented by subclass');
    }

    /**
     * Extract prompt data from a DOM element
     * Must be implemented by subclasses
     */
    extractPromptData(element, index) {
        throw new Error('extractPromptData() must be implemented by subclass');
    }

    /**
     * Extract headings from assistant response
     * Must be implemented by subclasses
     */
    extractAssistantHeadings(userElement) {
        throw new Error('extractAssistantHeadings() must be implemented by subclass');
    }

    /**
     * Get branch information for a prompt
     * Must be implemented by subclasses
     */
    getBranchInfo(element) {
        throw new Error('getBranchInfo() must be implemented by subclass');
    }

    /**
     * Generate a unique ID for a prompt
     */
    generatePromptId(element, index) {
        return `prompt-${this.conversationId}-${index}`;
    }

    /**
     * Clean and normalize text content
     */
    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Generate a preview (first ~12 characters) of the prompt
     */
    generatePreview(text, maxLength = 12) {
        const cleaned = text.trim();
        if (cleaned.length <= maxLength) {
            return cleaned;
        }
        return cleaned.substring(0, maxLength) + '...';
    }

    /**
     * Detect which branch is currently active
     */
    detectActiveBranch() {
        const prompts = this.prompts;

        for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];

            if (prompt.isEdited) {
                prompt.isBranchPoint = true;

                for (let j = i + 1; j < prompts.length; j++) {
                    prompts[j].inBranch = true;
                    prompts[j].branchStartIndex = i;
                }
            }
        }

        return prompts;
    }

    /**
     * Format prompts for display with branch indicators
     */
    formatPromptsForDisplay() {
        const prompts = this.detectActiveBranch();

        return prompts.map(prompt => {
            let displayText = prompt.preview;

            if (prompt.isBranchPoint) {
                displayText = `< ${displayText} >`;
            }

            return {
                id: prompt.id,
                display: displayText,
                text: prompt.text,
                timestamp: prompt.timestamp,
                isEdited: prompt.isEdited,
                isBranchPoint: prompt.isBranchPoint,
                inBranch: prompt.inBranch,
                branchInfo: prompt.branchInfo,
                element: prompt.element,
                headings: prompt.headings,
            };
        });
    }
}

class ChatGPTParser extends BaseParser {
    constructor() {
        super();
        this.prompts = [];
        this.conversationId = null;

        // Known selectors for ChatGPT's DOM structure
        // These may need updates as ChatGPT changes
        this.selectors = {
            // Primary selectors
            conversationContainer: 'main [class*="react-scroll-to-bottom"]',
            messageGroups: '[data-testid^="conversation-turn-"]',
            userMessages: '[data-message-author-role="user"]',
            assistantMessages: '[data-message-author-role="assistant"]',
        };
    }

    /**
     * Get the current conversation ID from URL
     * Uses regex, uses () for capture group, [] for character class, + for one or more
     * / is just syntax, .match returns match[0] is the full match, match[1] is the first capture group, etc.
     * window.location.pathname is like /c/1234567890
     * match is like ["/c/1234567890", "1234567890"]
     */
    getConversationId() {
        const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
        return match ? match[1] : null;
    }

    /**
     * Extract all user prompts from the current page
     * Check if conversationId is valid
     * and gets user messages
     */
    extractAllPrompts() {
        this.conversationId = this.getConversationId();
        this.prompts = [];

        if (!this.conversationId) {
            log.info('No conversation detected');
            return [];
        }

        const prompts = this.findUserMessages();
        this.prompts = prompts; // list of prompt objects

        return prompts;
    }

    /**
     * Find all user messages in the DOM
     * gets all DOM elements and then parses DOM elements
     */
    findUserMessages() {
        const messages = [];

        // Try primary selector first
        let userElements = document.querySelectorAll(this.selectors.userMessages);

        // Fallback to alternative selectors if primary fails
        if (userElements.length === 0) {
            log.info('No user messages found with primary selector, trying fallback');
            userElements = this.findUserMessagesWithFallback();
        }

        userElements.forEach((element, index) => { // element is the DOM element
            const promptData = this.extractPromptData(element, index);
            if (promptData) {
                messages.push(promptData);
            }
        });

        return messages;
    }

    /**
     * Fallback method to find user messages using alternative selectors
     */
    findUserMessagesWithFallback() {
        const elements = [];

        // Look for conversation turns and identify user vs assistant 
        const allTurns = document.querySelectorAll(this.selectors.messageGroups);

        allTurns.forEach(turn => {
            // User messages typically don't have the assistant avatar
            // and have specific styling patterns
            const hasAssistantAvatar = turn.querySelector('[alt*="ChatGPT" i], [class*="gizmo-bot-avatar"]');

            if (!hasAssistantAvatar) {
                // This is likely a user message
                const messageContent = turn.querySelector('[class*="markdown"], .whitespace-pre-wrap');
                if (messageContent) {
                    elements.push(turn);
                }
            }
        });

        // If still no results, try finding by content structure
        if (elements.length === 0) {
            const allMessages = document.querySelectorAll('main .text-base');
            allMessages.forEach(msg => {
                if (this.looksLikeUserMessage(msg)) {
                    elements.push(msg);
                }
            });
        }

        return elements;
    }

    /**
     * Fallback stuff
     * Heuristic to identify if an element looks like a user message
     */
    looksLikeUserMessage(element) {
        // User messages usually have certain characteristics
        // This is a heuristic that may need adjustment
        const text = element.textContent.trim();
        if (!text || text.length === 0) return false;

        // Filter out SSR hydration scripts and other JS artifacts
        // ChatGPT injects window.__oai_* scripts during page load
        if (text.startsWith('window.__oai_') || text.includes('__oai_SSR_HTML')) {
            return false;
        }

        // Check for common assistant message indicators
        const hasTypingIndicator = element.querySelector('[class*="typing"]');
        const hasStopButton = element.querySelector('button[aria-label*="Stop" i]');
        const hasCopyButton = element.querySelector('button[class*="copy"]');

        // Assistant messages typically have copy buttons
        if (hasCopyButton) return false;
        if (hasTypingIndicator) return false;
        if (hasStopButton) return false;

        return true;
    }

    /**
     * Turns user message DOM element into prompt data object
     */
    extractPromptData(element, index) {
        try {
            // Get the text content
            const textContent = this.getMessageText(element);

            if (!textContent || textContent.trim().length === 0) {
                return null;
            }

            // Check if this prompt has been edited
            const branchInfo = this.getBranchInfo(element);
            const isEdited = branchInfo?.hasBranches ?? false;

            // Extract headings from the assistant response that follows this prompt
            const headings = this.extractAssistantHeadings(element);

            log.info(`Prompt ${index}: "${textContent.substring(0, 30)}..." -> ${headings.length} headings`);
            if (headings.length > 0) {
                log.info(`  Headings for prompt ${index}:`, headings.map(h => h.text));
            }

            const promptData = {
                id: this.generatePromptId(element, index),
                index: index,
                text: textContent,
                preview: this.generatePreview(textContent),
                timestamp: Date.now(),
                isEdited: isEdited,
                branchInfo: branchInfo,
                element: element,
                headings: headings,
            };

            return promptData;
        } catch (error) {
            log.error('Error extracting prompt data:', error);
            return null;
        }
    }

    /**
     * Extract headings from the assistant response following a user message
     * Falls back through h2 -> h3 -> h4 -> h5 -> h6 if none found
     */
    extractAssistantHeadings(userElement) {
        // Find the conversation turn containing this user message
        const userTurn = userElement.closest('[data-testid^="conversation-turn-"]');
        if (!userTurn) {
            log.info('No user turn found for heading extraction');
            return [];
        }

        const userTurnId = userTurn.getAttribute('data-testid');
        log.info(`User turn: ${userTurnId}`);

        // First: check if assistant response is in the NEXT sibling turn
        // ChatGPT typically has separate turns for user and assistant
        let assistantContainer = null;
        const nextTurn = userTurn.nextElementSibling;
        
        if (nextTurn) {
            const nextTurnId = nextTurn.getAttribute('data-testid');
            const assistantInNext = nextTurn.querySelector('[data-message-author-role="assistant"]');
            if (assistantInNext) {
                log.info(`Found assistant in next turn: ${nextTurnId}`);
                assistantContainer = nextTurn;
            }
        }

        // If not found in next sibling, the assistant may not have responded yet
        if (!assistantContainer) {
            log.info('No assistant response found for this user message');
            return [];
        }

        // Extract headings from the assistant container
        return this.extractHeadingsFromElement(assistantContainer);
    }

    /**
     * Extract headings from a DOM element
     * Falls back through h2 -> h3 -> h4 -> h5 if none found at higher levels
     * Excludes h6 since it's rarely used for content and ChatGPT uses it for UI labels
     * Stores turn ID for re-querying later (DOM elements can become stale after React re-renders)
     */
    extractHeadingsFromElement(container) {
        const turnId = container.getAttribute('data-testid');
        // Stop at h5 - h6 is typically UI labels (e.g., ChatGPT's "ChatGPT said:" accessibility text)
        const headingLevels = ['h2', 'h3', 'h4', 'h5'];
        
        for (const level of headingLevels) {
            const headings = container.querySelectorAll(level);
            if (headings.length > 0) {
                const result = Array.from(headings).map((h, idx) => ({
                    level: level,
                    text: h.textContent.trim(),
                    turnId: turnId,
                    index: idx,
                }));
                log.info(`Extracted ${level} headings:`, result.map(h => h.text));
                return result;
            }
        }

        log.info('No headings found');
        return [];
    }

    /**
     * Get the text content from a message DOM element
     */
    getMessageText(element) {
        // Try different methods to get the text content

        // Method 1: Look for markdown or content containers
        const contentContainer = element.querySelector('[class*="markdown"], .whitespace-pre-wrap, [class*="prose"]');
        if (contentContainer) {
            return this.cleanText(contentContainer.textContent);
        }

        // Method 2: Get direct text content
        const text = element.textContent;
        if (text) {
            return this.cleanText(text);
        }

        return '';
    }

    /**
     * Clean and normalize text content
     */
    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Generate a preview (first ~12 characters) of the prompt
     * trims text
     */
    generatePreview(text, maxLength = 12) {
        const cleaned = text.trim();
        if (cleaned.length <= maxLength) {
            return cleaned;
        }
        return cleaned.substring(0, maxLength) + '...';
    }

    /**
     * Get branch information for the current prompt DOM element
     */
    getBranchInfo(element) {
        const parent = element.closest('[data-testid^="conversation-turn-"]');

        if (!parent) return null;

        // Look for branch navigation elements
        // ChatGPT shows "Previous response" / "Next response" buttons with a counter like "3/3"
        const prevButtonEl = parent.querySelector('button[aria-label*="Previous response" i]');
        const nextButtonEl = parent.querySelector('button[aria-label*="Next response" i]');

        if (!prevButtonEl && !nextButtonEl) return { hasBranches: false };

        // Only include buttons that are enabled (not disabled)
        const prevButton = prevButtonEl && !prevButtonEl.disabled ? prevButtonEl : null;
        const nextButton = nextButtonEl && !nextButtonEl.disabled ? nextButtonEl : null;

        // Find the container with both buttons to get the branch counter
        const navContainer = prevButtonEl?.parentElement || nextButtonEl?.parentElement;

        if (!navContainer) return { hasBranches: true, hasNavContainer: false, prevButton, nextButton };

        // Try to extract branch position info from the counter text
        // ChatGPT typically shows something like "3/3" for branches
        const branchText = navContainer.textContent;
        const match = branchText.match(/(\d+)\s*\/\s*(\d+)/);

        if (match) {
            return {
                hasBranches: true,
                current: parseInt(match[1]),
                total: parseInt(match[2]),
                prevButton,
                nextButton,
            };
        }

        return { hasBranches: true, hasMatch: false, prevButton, nextButton };
    }

    /**
     * Generate a unique ID for a prompt given DOM element
     * 
     */
    generatePromptId(element, index) {
        // Use data attributes if available
        const turnId = element.closest('[data-testid^="conversation-turn-"]')
            ?.getAttribute('data-testid');

        if (turnId) {
            return turnId;
        }

        // Fallback to index-based ID
        return `prompt-${this.conversationId}-${index}`;
    }

}

/**
 * Gemini parser implementation
 */
class GeminiParser extends BaseParser {
    constructor() {
        super();
        this.selectors = {
            conversationContainer: '.conversation-container',
            userMessages: 'user-query',
            assistantMessages: 'model-response',
            userQueryText: '.query-text, .query-text-line',
            assistantContent: '.model-response-text .markdown, .markdown-main-panel',
        };
    }

    /**
     * Get the current conversation ID from URL
     * Gemini URLs: /share/{id} or /app/{id}
     */
    getConversationId() {
        const shareMatch = window.location.pathname.match(/\/share\/([a-zA-Z0-9-]+)/);
        if (shareMatch) return shareMatch[1];
        
        const appMatch = window.location.pathname.match(/\/app\/([a-zA-Z0-9-]+)/);
        if (appMatch) return appMatch[1];
        
        return null;
    }

    /**
     * Find all user messages in the DOM
     */
    findUserMessages() {
        const messages = [];
        const userElements = document.querySelectorAll(this.selectors.userMessages);

        userElements.forEach((element, index) => {
            const promptData = this.extractPromptData(element, index);
            if (promptData) {
                messages.push(promptData);
            }
        });

        return messages;
    }

    /**
     * Extract prompt data from a user-query element
     */
    extractPromptData(element, index) {
        try {
            const textContent = this.getMessageText(element);

            if (!textContent || textContent.trim().length === 0) {
                return null;
            }

            const branchInfo = this.getBranchInfo(element);
            const isEdited = branchInfo?.hasBranches ?? false;

            const headings = this.extractAssistantHeadings(element);

            log.info(`Prompt ${index}: "${textContent.substring(0, 30)}..." -> ${headings.length} headings`);
            if (headings.length > 0) {
                log.info(`  Headings for prompt ${index}:`, headings.map(h => h.text));
            }

            const promptData = {
                id: this.generatePromptId(element, index),
                index: index,
                text: textContent,
                preview: this.generatePreview(textContent),
                timestamp: Date.now(),
                isEdited: isEdited,
                branchInfo: branchInfo,
                element: element,
                headings: headings,
            };

            return promptData;
        } catch (error) {
            log.error('Error extracting prompt data:', error);
            return null;
        }
    }

    /**
     * Get the text content from a user-query element
     */
    getMessageText(element) {
        // Look for query-text or query-text-line
        const textContainer = element.querySelector(this.selectors.userQueryText);
        if (textContainer) {
            return this.cleanText(textContainer.textContent);
        }

        // Fallback to direct text content
        const text = element.textContent;
        if (text) {
            return this.cleanText(text);
        }

        return '';
    }

    /**
     * Extract headings from the assistant response following a user message
     */
    extractAssistantHeadings(userElement) {
        // Find the conversation container containing this user message
        const conversationContainer = userElement.closest(this.selectors.conversationContainer);
        if (!conversationContainer) {
            log.info('No conversation container found for heading extraction');
            return [];
        }

        const containerId = conversationContainer.id || conversationContainer.getAttribute('id');
        log.info(`Conversation container: ${containerId}`);

        // Find the model-response in the same container or next sibling
        let assistantContainer = conversationContainer.querySelector(this.selectors.assistantMessages);
        
        // If not found in same container, check next sibling conversation-container
        if (!assistantContainer) {
            const nextContainer = conversationContainer.nextElementSibling;
            if (nextContainer && nextContainer.classList.contains('conversation-container')) {
                assistantContainer = nextContainer.querySelector(this.selectors.assistantMessages);
            }
        }

        if (!assistantContainer) {
            log.info('No assistant response found for this user message');
            return [];
        }

        return this.extractHeadingsFromElement(assistantContainer, containerId);
    }

    /**
     * Extract headings from a model-response element
     */
    extractHeadingsFromElement(container, containerId) {
        // Find the markdown content area
        const markdownContainer = container.querySelector(this.selectors.assistantContent);
        if (!markdownContainer) {
            log.info('No markdown container found');
            return [];
        }

        const headingLevels = ['h2', 'h3', 'h4', 'h5'];
        
        for (const level of headingLevels) {
            const headings = markdownContainer.querySelectorAll(level);
            if (headings.length > 0) {
                const result = Array.from(headings).map((h, idx) => ({
                    level: level,
                    text: h.textContent.trim(),
                    turnId: containerId,
                    index: idx,
                }));
                log.info(`Extracted ${level} headings:`, result.map(h => h.text));
                return result;
            }
        }

        log.info('No headings found');
        return [];
    }

    /**
     * Get branch information for a prompt
     * Gemini has edit functionality but may not have branch navigation like ChatGPT
     */
    getBranchInfo(element) {
        // Check for edit button (indicates editing capability)
        const editButton = element.querySelector('[data-test-id="prompt-edit-button"]');
        
        if (editButton) {
            // Gemini may have different branch UI - for now, just indicate editing is possible
            return { hasBranches: false, hasEdit: true };
        }

        return { hasBranches: false };
    }

    /**
     * Generate a unique ID for a prompt
     */
    generatePromptId(element, index) {
        // Try to use conversation container ID
        const container = element.closest(this.selectors.conversationContainer);
        if (container && container.id) {
            return container.id;
        }

        return super.generatePromptId(element, index);
    }
}

/**
 * Claude parser implementation
 * Note: DOM selectors may need adjustment based on Claude's current structure
 */
class ClaudeParser extends BaseParser {
    constructor() {
        super();
        // Claude's DOM selectors - updated to match actual Claude DOM structure
        // Note: Claude doesn't use 'human' or 'assistant' class names or '.standard-markdown'
        this.selectors = {
            conversationContainer: 'main .overflow-y-scroll, main',
            // Claude uses data-testid="user-message" for user messages
            userMessages: '[data-testid="user-message"]',
            // Claude assistant responses have font-claude-response-body paragraphs
            // They're identified by having <p class="font-claude-response-body"> elements
            assistantContent: '.font-claude-response-body',
            // Text content selectors
            userQueryText: '.whitespace-pre-wrap, p',
            // Message containers - data-test-render-count wraps each message turn
            messageGroup: '[data-test-render-count]',
        };
    }

    /**
     * Get the current conversation ID from URL
     * Claude URLs: /chat/{uuid} for existing chats, /new for new chats
     */
    getConversationId() {
        const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
        return match ? match[1] : null;
    }

    /**
     * Find all user messages in the DOM
     */
    findUserMessages() {
        const messages = [];
        
        // Try primary selector first
        let userElements = document.querySelectorAll(this.selectors.userMessages);
        
        // Fallback: look for elements with human/user indicators
        if (userElements.length === 0) {
            log.info('No user messages found with primary selector, trying fallback');
            userElements = this.findUserMessagesWithFallback();
        }

        userElements.forEach((element, index) => {
            const promptData = this.extractPromptData(element, index);
            if (promptData) {
                messages.push(promptData);
            }
        });

        return messages;
    }

    /**
     * Fallback method to find user messages using alternative selectors
     */
    findUserMessagesWithFallback() {
        const elements = [];
        
        // Look for message groups (data-test-render-count containers)
        const allMessages = document.querySelectorAll(this.selectors.messageGroup);
        
        allMessages.forEach(msg => {
            // Check if this container has a user message inside
            const hasUserMessage = msg.querySelector('[data-testid="user-message"]');
            
            if (hasUserMessage) {
                elements.push(hasUserMessage);
            }
        });
        
        // Additional fallback: look for whitespace-pre-wrap elements in user message bubbles
        if (elements.length === 0) {
            const contentBlocks = document.querySelectorAll('main .whitespace-pre-wrap');
            contentBlocks.forEach(block => {
                // Find parent that might be the message container
                const parent = block.closest('[data-test-render-count]');
                if (parent && this.looksLikeUserMessage(parent)) {
                    elements.push(block);
                }
            });
        }

        return elements;
    }

    /**
     * Heuristic to identify if an element looks like a user message
     */
    looksLikeUserMessage(element) {
        // Check for assistant-specific indicators
        // Claude assistant responses have font-claude-response-body class (not standard-markdown)
        const hasAssistantIndicator = element.querySelector('.font-claude-response-body') ||
                                      element.querySelector('[data-is-streaming]');
        
        if (hasAssistantIndicator) return false;
        
        // Check for copy buttons (typically on assistant messages)
        const hasCopyButton = element.querySelector('button[aria-label*="Copy" i]');
        if (hasCopyButton) return false;
        
        // Must have some text content
        const text = element.textContent?.trim();
        return text && text.length > 0;
    }

    /**
     * Extract prompt data from a user message element
     */
    extractPromptData(element, index) {
        try {
            const textContent = this.getMessageText(element);

            if (!textContent || textContent.trim().length === 0) {
                return null;
            }

            const branchInfo = this.getBranchInfo(element);
            const isEdited = branchInfo?.hasBranches ?? false;

            const headings = this.extractAssistantHeadings(element);

            log.info(`Prompt ${index}: "${textContent.substring(0, 30)}..." -> ${headings.length} headings`);
            if (headings.length > 0) {
                log.info(`  Headings for prompt ${index}:`, headings.map(h => h.text));
            }

            const promptData = {
                id: this.generatePromptId(element, index),
                index: index,
                text: textContent,
                preview: this.generatePreview(textContent),
                timestamp: Date.now(),
                isEdited: isEdited,
                branchInfo: branchInfo,
                element: element,
                headings: headings,
            };

            return promptData;
        } catch (error) {
            log.error('Error extracting prompt data:', error);
            return null;
        }
    }

    /**
     * Get the text content from a user message element
     */
    getMessageText(element) {
        // Try specific content selectors
        const textContainer = element.querySelector(this.selectors.userQueryText);
        if (textContainer) {
            return this.cleanText(textContainer.textContent);
        }

        // Fallback to direct text content
        const text = element.textContent;
        if (text) {
            return this.cleanText(text);
        }

        return '';
    }

    /**
     * Extract headings from the assistant response following a user message
     * Claude structure: user message and assistant response are in SEPARATE sibling containers.
     * Each [data-test-render-count] contains either user OR assistant content, not both.
     */
    extractAssistantHeadings(userElement) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/355f618a-e6f2-482b-9421-d8db93173052',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'parser.js:extractAssistantHeadings:entry',message:'Called extractAssistantHeadings',data:{userElementTag:userElement?.tagName,userElementTestId:userElement?.getAttribute?.('data-testid')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E',runId:'post-fix'})}).catch(()=>{});
        // #endregion
        
        // Find the outer container (data-test-render-count wrapper) for the user message
        const userContainer = userElement.closest('[data-test-render-count]');
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/355f618a-e6f2-482b-9421-d8db93173052',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'parser.js:extractAssistantHeadings:containerCheck',message:'User container lookup',data:{foundContainer:!!userContainer,containerId:userContainer?.getAttribute?.('data-test-render-count')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A',runId:'post-fix'})}).catch(()=>{});
        // #endregion
        
        if (!userContainer) {
            log.info('No user container found for heading extraction');
            return [];
        }

        const userContainerId = userContainer.getAttribute('data-test-render-count');
        
        // Claude has user and assistant in SEPARATE sibling containers
        // Look for the next sibling that contains assistant response content
        let assistantContainer = null;
        let nextElement = userContainer.nextElementSibling;
        
        while (nextElement) {
            // Check if this sibling has assistant content (font-claude-response-body paragraphs)
            const hasAssistantContent = nextElement.querySelector?.(this.selectors.assistantContent);
            // Or check if it has headings directly
            const hasHeadings = nextElement.querySelector?.('h1, h2, h3, h4, h5');
            
            if (hasAssistantContent || hasHeadings) {
                assistantContainer = nextElement;
                break;
            }
            
            // If we hit another user message, stop looking
            const hasUserMessage = nextElement.querySelector?.('[data-testid="user-message"]');
            if (hasUserMessage) break;
            
            nextElement = nextElement.nextElementSibling;
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/355f618a-e6f2-482b-9421-d8db93173052',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'parser.js:extractAssistantHeadings:siblingSearch',message:'Sibling search result',data:{foundAssistantContainer:!!assistantContainer,assistantContainerTag:assistantContainer?.tagName,assistantContainerId:assistantContainer?.getAttribute?.('data-test-render-count'),htmlPreview:assistantContainer?.innerHTML?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B',runId:'post-fix'})}).catch(()=>{});
        // #endregion
        
        if (!assistantContainer) {
            log.info('No assistant response found for this user message');
            return [];
        }

        const assistantContainerId = assistantContainer.getAttribute('data-test-render-count') || userContainerId;
        return this.extractHeadingsFromElement(assistantContainer, assistantContainerId);
    }

    /**
     * Extract headings from an assistant response element
     * Claude has variable heading rendering:
     * - Sometimes uses standard h1/h2/h3 tags
     * - Sometimes uses <strong> tags inside paragraphs as pseudo-headings
     * @param {Element} container - The message container element
     * @param {string} containerId - The data-test-render-count value for this container
     */
    extractHeadingsFromElement(container, containerId) {
        const turnId = containerId ? `claude-response-${containerId}` : 
                       container.getAttribute('data-test-render-count') ? 
                       `claude-response-${container.getAttribute('data-test-render-count')}` :
                       `claude-response-${Date.now()}`;

        // First, try standard HTML heading elements (h1-h5)
        const headingLevels = ['h1', 'h2', 'h3', 'h4', 'h5'];
        
        for (const level of headingLevels) {
            const allHeadings = container.querySelectorAll(level);
            const headings = Array.from(allHeadings).filter(h => {
                // Exclude headings inside user-message element
                return !h.closest('[data-testid="user-message"]');
            });
            
            if (headings.length > 0) {
                const result = headings.map((h, idx) => ({
                    level: level,
                    text: h.textContent.trim(),
                    turnId: turnId,
                    index: idx,
                }));
                log.info(`Extracted ${level} headings:`, result.map(h => h.text));
                return result;
            }
        }

        // Fallback: Claude sometimes uses <strong> inside paragraphs as pseudo-headings
        // Look for <strong> tags that are the only/first child of a paragraph (section headers)
        const strongHeadings = this.extractStrongHeadings(container, turnId);
        if (strongHeadings.length > 0) {
            log.info('Extracted strong pseudo-headings:', strongHeadings.map(h => h.text));
            return strongHeadings;
        }

        log.info('No headings found');
        return [];
    }

    /**
     * Extract <strong> tags that act as section headings in Claude responses
     * These are typically <strong> elements inside paragraphs with font-claude-response-body class
     * Only includes <strong> tags that appear to be headings (short, at start of paragraph)
     */
    extractStrongHeadings(container, turnId) {
        // Find strong tags inside response paragraphs
        const strongElements = container.querySelectorAll('.font-claude-response-body strong, p strong');
        
        const headings = [];
        for (const strong of strongElements) {
            // Skip if inside user message
            if (strong.closest('[data-testid="user-message"]')) continue;
            
            const text = strong.textContent.trim();
            // Skip empty or very long text (likely not a heading)
            if (!text || text.length > 100) continue;
            
            // Check if this strong is a heading-like element:
            // It should be the first significant content in its parent paragraph
            const parent = strong.closest('p');
            if (parent) {
                const parentText = parent.textContent.trim();
                // If the strong text IS the paragraph (or nearly), it's likely a heading
                // Also accept if strong is at the very start of the paragraph
                const isHeadingLike = parentText === text || 
                                      parentText.startsWith(text) && parentText.length < text.length + 20;
                if (isHeadingLike) {
                    headings.push({
                        level: 'strong',
                        text: text,
                        turnId: turnId,
                        index: headings.length,
                    });
                }
            }
        }
        
        return headings;
    }

    /**
     * Get branch information for a prompt
     * Claude does not currently support branching/editing like ChatGPT
     */
    getBranchInfo(element) {
        // Claude doesn't have branch navigation UI like ChatGPT
        // Check for any edit indicators
        const editButton = element.querySelector('[aria-label*="edit" i], [data-testid*="edit"]');
        
        return { 
            hasBranches: false, 
            hasEdit: !!editButton 
        };
    }

    /**
     * Generate a unique ID for a prompt
     */
    generatePromptId(element, index) {
        // Try to use data-testid if available
        const testId = element.getAttribute('data-testid');
        if (testId) {
            return testId;
        }

        // Try parent container ID
        const parent = element.closest('[data-testid]');
        if (parent) {
            return parent.getAttribute('data-testid');
        }

        // Fallback to index-based ID
        return `prompt-${this.conversationId}-${index}`;
    }
}

// Export for use in content script
window.ChatGPTParser = ChatGPTParser;
window.GeminiParser = GeminiParser;
window.ClaudeParser = ClaudeParser;
window.BaseParser = BaseParser;

