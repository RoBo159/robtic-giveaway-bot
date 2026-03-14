/**
 * Notification System - Snackbar and Modal utilities
 */

// ==================== SNACKBAR ====================

let snackbarTimeout = null;

/**
 * Show a snackbar notification
 * @param {string} message - The message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (default: 3000)
 */
function showSnackbar(message, type = 'info', duration = 3000) {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) {
        console.error('Snackbar element not found');
        return;
    }
    
    // Clear any existing timeout
    if (snackbarTimeout) {
        clearTimeout(snackbarTimeout);
    }
    
    // Remove existing classes
    snackbar.classList.remove('show', 'success', 'error', 'warning', 'info');
    
    // Set message and type
    snackbar.textContent = message;
    snackbar.classList.add(type);
    
    // Force reflow for animation
    void snackbar.offsetWidth;
    
    // Show snackbar
    snackbar.classList.add('show');
    
    // Auto hide after duration
    snackbarTimeout = setTimeout(() => {
        snackbar.classList.remove('show');
    }, duration);
}

/**
 * Hide the snackbar immediately
 */
function hideSnackbar() {
    const snackbar = document.getElementById('snackbar');
    if (snackbar) {
        snackbar.classList.remove('show');
    }
    if (snackbarTimeout) {
        clearTimeout(snackbarTimeout);
    }
}


// ==================== MODAL ====================

let currentModalCallback = null;

/**
 * Show a confirmation modal
 * @param {string} title - Modal title
 * @param {string} bodyHtml - HTML content for the modal body
 * @param {Function} onConfirm - Callback when confirmed
 * @param {Object} options - Additional options
 */
function showModal(title, bodyHtml, onConfirm = null, options = {}) {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    
    if (!overlay) {
        console.error('Modal overlay element not found');
        return;
    }
    
    // Set content
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;
    
    // Configure buttons
    if (confirmBtn) {
        confirmBtn.textContent = options.confirmText || 'Confirm';
        confirmBtn.className = 'btn ' + (options.confirmClass || 'btn-primary');
    }
    if (cancelBtn) {
        cancelBtn.textContent = options.cancelText || 'Cancel';
        if (options.hideCancel) {
            cancelBtn.style.display = 'none';
        } else {
            cancelBtn.style.display = '';
        }
    }
    
    // Store callback
    currentModalCallback = onConfirm;
    
    // Show modal
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Focus first input if any
    setTimeout(() => {
        const firstInput = bodyEl.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }, 100);
}

/**
 * Close the modal
 */
function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
    document.body.style.overflow = '';
    currentModalCallback = null;
}

/**
 * Confirm modal action
 */
function confirmModal() {
    if (currentModalCallback) {
        currentModalCallback();
    }
    closeModal();
}

/**
 * Show an alert modal (replaces window.alert)
 * @param {string} title - Modal title
 * @param {string} message - Alert message
 */
function showAlert(title, message) {
    showModal(title, `<p>${message}</p>`, null, {
        confirmText: 'OK',
        hideCancel: true
    });
}

/**
 * Show a confirm dialog (replaces window.confirm)
 * @param {string} title - Modal title  
 * @param {string} message - Confirm message
 * @param {Function} onConfirm - Callback when confirmed
 */
function showConfirm(title, message, onConfirm) {
    showModal(title, `<p>${message}</p>`, onConfirm, {
        confirmText: 'Yes',
        cancelText: 'No'
    });
}

/**
 * Show a prompt dialog (replaces window.prompt)
 * @param {string} title - Modal title
 * @param {string} label - Input label
 * @param {string} defaultValue - Default input value
 * @param {Function} onConfirm - Callback with input value
 * @param {Object} options - Additional options (placeholder, helperText)
 */
function showPrompt(title, label, defaultValue = '', onConfirm, options = {}) {
    const inputId = 'promptInput_' + Date.now();
    const bodyHtml = `
        <div class="form-group">
            <label for="${inputId}">${label}</label>
            <input type="text" id="${inputId}" value="${defaultValue}" 
                   placeholder="${options.placeholder || ''}"
                   autocomplete="off">
            ${options.helperText ? `<div class="helper-text">${options.helperText}</div>` : ''}
            <div class="error-text" id="${inputId}_error"></div>
        </div>
    `;
    
    showModal(title, bodyHtml, () => {
        const input = document.getElementById(inputId);
        if (input && onConfirm) {
            onConfirm(input.value);
        }
    }, {
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel'
    });
}


// ==================== CUSTOM EMOJI INPUT ====================

/**
 * Show custom emoji input modal
 * @param {Function} onSubmit - Callback with emoji value
 */
function showCustomEmojiInput(onSubmit) {
    const bodyHtml = `
        <div class="form-group">
            <label for="customEmojiId">Emoji ID or Format</label>
            <input type="text" id="customEmojiId" placeholder="<:name:123456789012345678> or just the ID">
            <div class="helper-text">
                Enter a Discord emoji format like <code>&lt;:name:id&gt;</code> or just the emoji ID
            </div>
            <div class="error-text" id="customEmojiError"></div>
        </div>
    `;
    
    showModal('Custom Emoji', bodyHtml, () => {
        const input = document.getElementById('customEmojiId');
        const errorEl = document.getElementById('customEmojiError');
        if (!input) return;
        
        let value = input.value.trim();
        
        // If just an ID, try to format it
        if (/^\d{17,19}$/.test(value)) {
            // Show prompt for emoji name
            showPrompt('Emoji Name', 'Enter the emoji name:', 'emoji', (name) => {
                const formatted = `<:${name}:${value}>`;
                if (onSubmit) onSubmit(formatted);
            });
            return;
        }
        
        // Validate format
        if (/<(a?):(\w+):(\d+)>/.test(value)) {
            if (onSubmit) onSubmit(value);
        } else {
            // Check if it's a unicode emoji
            if (/\p{Emoji}/u.test(value)) {
                if (onSubmit) onSubmit(value);
            } else {
                if (errorEl) {
                    errorEl.textContent = 'Invalid emoji format. Use <:name:id> or a unicode emoji.';
                    errorEl.style.display = 'block';
                }
                return; // Don't close modal
            }
        }
    }, {
        confirmText: 'Use Emoji'
    });
}


// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    // Close modal on overlay click
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay?.classList.contains('show')) {
            closeModal();
        }
    });
});
