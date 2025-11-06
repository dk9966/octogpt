/**
 * OctoGPT Parser Module
 * Handles extraction of user prompts from ChatGPT DOM
 */

class ChatGPTParser {
    constructor() {
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

            // Fallback selectors
            fallbackUserMessages: '.text-base.gap-4.m-auto [class*="agent-turn"]:has(.bg-\\[\\#f4f4f4\\]), .text-base.gap-4.m-auto > div:has([class*="text-token-text-primary"])',

            // Edit indicators
            editButton: 'button[aria-label*="edit" i]',
            branchIndicator: '[data-testid*="branch"]',
        };
    }

    /**
     * Get the current conversation ID from URL
     */
    getConversationId() {
        const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
        return match ? match[1] : null;
    }

    /**
     * Extract all user prompts from the current page
     */
    extractAllPrompts() {
        this.conversationId = this.getConversationId();
        this.prompts = [];

        if (!this.conversationId) {
            console.log('[OctoGPT] No conversation detected');
            return [];
        }

        const prompts = this.findUserMessages();
        this.prompts = prompts;

        return prompts;
    }

    /**
     * Find all user messages in the DOM
     */
    findUserMessages() {
        const messages = [];

        // Try primary selector first
        let userElements = document.querySelectorAll(this.selectors.userMessages);

        // Fallback to alternative selectors if primary fails
        if (userElements.length === 0) {
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

        // Look for conversation turns and identify user vs assistant
        const allTurns = document.querySelectorAll('[data-testid^="conversation-turn-"]');

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
     * Heuristic to identify if an element looks like a user message
     */
    looksLikeUserMessage(element) {
        // User messages usually have certain characteristics
        // This is a heuristic that may need adjustment
        const text = element.textContent.trim();
        if (!text || text.length === 0) return false;

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
     * Extract prompt data from a user message element
     */
    extractPromptData(element, index) {
        try {
            // Get the text content
            const textContent = this.getMessageText(element);

            if (!textContent || textContent.trim().length === 0) {
                return null;
            }

            // Check if this prompt has been edited
            const isEdited = this.isPromptEdited(element);
            const branchInfo = this.getBranchInfo(element);

            const promptData = {
                id: this.generatePromptId(element, index),
                index: index,
                text: textContent,
                preview: this.generatePreview(textContent),
                timestamp: Date.now(),
                isEdited: isEdited,
                branchInfo: branchInfo,
                element: element,
            };

            return promptData;
        } catch (error) {
            console.error('[OctoGPT] Error extracting prompt data:', error);
            return null;
        }
    }

    /**
     * Get the text content from a message element
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
     */
    generatePreview(text, maxLength = 12) {
        const cleaned = text.trim();
        if (cleaned.length <= maxLength) {
            return cleaned;
        }
        return cleaned.substring(0, maxLength) + '...';
    }

    /**
     * Check if a prompt has been edited
     */
    isPromptEdited(element) {
        // Look for edit indicators in the element or nearby
        const editButton = element.querySelector(this.selectors.editButton);
        const parent = element.closest('[data-testid^="conversation-turn-"]');

        if (parent) {
            // Check for visual indicators of edits
            const hasEditIndicator = parent.querySelector('[title*="edited" i], [aria-label*="edited" i]');
            if (hasEditIndicator) return true;
        }

        // Check if there are multiple versions/branches visible
        const hasBranchIndicator = element.closest('[class*="branch"]') ||
            parent?.querySelector('[class*="branch"]');

        return !!hasBranchIndicator;
    }

    /**
     * Get branch information for the current prompt
     */
    getBranchInfo(element) {
        const parent = element.closest('[data-testid^="conversation-turn-"]');

        if (!parent) return null;

        // Look for branch navigation elements (prev/next branch buttons)
        const branchNav = parent.querySelector('[class*="branch"], button[aria-label*="branch" i]');

        if (!branchNav) return null;

        // Try to extract branch position info
        // ChatGPT typically shows something like "1 / 3" for branches
        const branchText = branchNav.textContent;
        const match = branchText.match(/(\d+)\s*\/\s*(\d+)/);

        if (match) {
            return {
                current: parseInt(match[1]),
                total: parseInt(match[2]),
            };
        }

        return { hasBranches: true };
    }

    /**
     * Generate a unique ID for a prompt
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

    /**
     * Detect which branch is currently active
     */
    detectActiveBranch() {
        // The active branch is the one currently visible/selected
        // We'll track edited prompts and their subsequent messages
        const prompts = this.prompts;

        for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];

            if (prompt.isEdited) {
                // Mark this as the branch point
                prompt.isBranchPoint = true;

                // All subsequent prompts are part of this branch
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

            // Add angle brackets for edited prompts (branch points)
            if (prompt.isBranchPoint) {
                displayText = `< ${displayText} >`;
            }

            return {
                id: prompt.id,
                display: displayText,
                text: prompt.text,
                isEdited: prompt.isEdited,
                isBranchPoint: prompt.isBranchPoint,
                inBranch: prompt.inBranch,
                element: prompt.element,
            };
        });
    }
}

// Export for use in content script
window.ChatGPTParser = ChatGPTParser;

