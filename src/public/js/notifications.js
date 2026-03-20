

let snackbarTimeout = null;


function showSnackbar(message, type = 'info', duration = 3000) {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) {
        console.error('Snackbar element not found');
        return;
    }
    if (snackbarTimeout) {
        clearTimeout(snackbarTimeout);
    }
    snackbar.classList.remove('show', 'success', 'error', 'warning', 'info');
    snackbar.textContent = message;
    snackbar.classList.add(type);
    void snackbar.offsetWidth;
    snackbar.classList.add('show');
    snackbarTimeout = setTimeout(() => {
        snackbar.classList.remove('show');
    }, duration);
}


function hideSnackbar() {
    const snackbar = document.getElementById('snackbar');
    if (snackbar) {
        snackbar.classList.remove('show');
    }
    if (snackbarTimeout) {
        clearTimeout(snackbarTimeout);
    }
}

let currentModalCallback = null;


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
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;
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
    currentModalCallback = onConfirm;
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
        const firstInput = bodyEl.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }, 100);
}


function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
    document.body.style.overflow = '';
    currentModalCallback = null;
}


function confirmModal() {
    if (currentModalCallback) {
        currentModalCallback();
    }
    closeModal();
}


function showAlert(title, message) {
    showModal(title, `<p>${message}</p>`, null, {
        confirmText: 'OK',
        hideCancel: true
    });
}


function showConfirm(title, message, onConfirm) {
    showModal(title, `<p>${message}</p>`, onConfirm, {
        confirmText: 'Yes',
        cancelText: 'No'
    });
}


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
        if (/^\d{17,19}$/.test(value)) {
            showPrompt('Emoji Name', 'Enter the emoji name:', 'emoji', (name) => {
                const formatted = `<:${name}:${value}>`;
                if (onSubmit) onSubmit(formatted);
            });
            return;
        }
        if (/<(a?):(\w+):(\d+)>/.test(value)) {
            if (onSubmit) onSubmit(value);
        } else {
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

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay?.classList.contains('show')) {
            closeModal();
        }
    });
});
