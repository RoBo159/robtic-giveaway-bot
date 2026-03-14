/**
 * Emoji Picker Module
 * Handles emoji selection for giveaway configuration
 */

let currentEmojiTarget = null; // Tracks which input is being targeted

/**
 * Open the emoji picker modal
 * @param {string} targetId - ID of the hidden input to store the emoji value
 * @param {string} previewId - ID of the element to show the emoji preview
 */
function openEmojiPicker(targetId, previewId) {
    currentEmojiTarget = { targetId, previewId };
    const modal = document.getElementById('emojiPickerModal');
    const searchInput = document.getElementById('emojiSearch');
    
    modal.classList.add('show');
    searchInput.value = '';
    filterEmojis(); // Reset filter
    searchInput.focus();
}

/**
 * Close the emoji picker modal
 */
function closeEmojiPicker() {
    const modal = document.getElementById('emojiPickerModal');
    modal.classList.remove('show');
    currentEmojiTarget = null;
}

/**
 * Select a Unicode emoji
 * @param {string} emoji - The Unicode emoji character
 */
function selectUnicodeEmoji(emoji) {
    if (!currentEmojiTarget) return;
    
    const targetInput = document.getElementById(currentEmojiTarget.targetId);
    const previewEl = document.getElementById(currentEmojiTarget.previewId);
    
    if (targetInput) {
        targetInput.value = emoji;
    }
    
    if (previewEl) {
        previewEl.innerHTML = emoji;
    }
    
    closeEmojiPicker();
    
    // Trigger update if available
    if (typeof updatePreview === 'function') updatePreview();
    if (typeof updateButtonPreview === 'function') updateButtonPreview();
    if (typeof updateReactionPreview === 'function') updateReactionPreview();
}

/**
 * Select a server emoji
 * @param {string} id - Emoji ID
 * @param {string} name - Emoji name
 * @param {boolean} animated - Whether the emoji is animated
 * @param {string} url - Emoji image URL
 */
function selectServerEmoji(id, name, animated, url) {
    if (!currentEmojiTarget) return;
    
    const targetInput = document.getElementById(currentEmojiTarget.targetId);
    const previewEl = document.getElementById(currentEmojiTarget.previewId);
    
    // Store the Discord format for sending to Discord
    const emojiFormat = animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`;
    
    if (targetInput) {
        targetInput.value = emojiFormat;
        targetInput.dataset.emojiUrl = url;
        targetInput.dataset.emojiName = name;
    }

    console.log('Selected server emoji:', { id, name, animated, url });
    
    // Show image preview in the button
    if (previewEl) {
        previewEl.innerHTML = `<img src="${url}" alt="${name}" style="width: 20px; height: 20px; vertical-align: middle;">`;
    }
    
    closeEmojiPicker();
    
    // Trigger update if available
    if (typeof updatePreview === 'function') updatePreview();
    if (typeof updateButtonPreview === 'function') updateButtonPreview();
    if (typeof updateReactionPreview === 'function') updateReactionPreview();
}

function filterEmojis() {
    const searchVal = document.getElementById('emojiSearch').value.toLowerCase().trim();
    
    document.querySelectorAll('.server-emoji').forEach(el => {
        const name = el.dataset.emojiName.toLowerCase();
        el.classList.toggle('hidden', searchVal && !name.includes(searchVal));
    });
    
    document.querySelectorAll('.unicode-emoji').forEach(el => {
        el.classList.toggle('hidden', false);
    });
    
    document.querySelectorAll('.emoji-category').forEach(cat => {
        const grid = cat.querySelector('.emoji-grid');
        const hasVisible = grid && grid.querySelector('.emoji-item:not(.hidden)');
        cat.style.display = hasVisible ? 'block' : 'none';
    });
}

/**
 * Parse emoji value and return display HTML
 * Handles both Unicode and Discord custom emoji formats
 * @param {string} emojiValue - The emoji value (Unicode or Discord format)
 * @param {string} emojiUrl - Optional URL for server emojis
 * @returns {string} HTML to display the emoji
 */
function getEmojiDisplay(emojiValue) {
    if (!emojiValue) return '🎉';
    
    // Check if it's a Discord custom emoji format
    const customMatch = emojiValue.match(/<a?:(\w+):(\d+)>/);
    if (customMatch) {
        const name = customMatch[1];
        const id = customMatch[2];
        const animated = emojiValue.startsWith('<a:');
        const ext = animated ? 'gif' : 'webp';
        const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;
        console.log('Displaying server emoji:', { name, id, animated, url });
        return `<img src="${url}" alt="${name}" style="width: 20px; height: 20px; vertical-align: middle;">`;
    }
    
    // It's a Unicode emoji
    return emojiValue;
}

/**
 * Initialize emoji preview buttons with current values
 */
function initEmojiPreviews() {
    // Find all emoji trigger buttons and set their initial preview
    document.querySelectorAll('.emoji-btn-trigger').forEach(btn => {
        const targetId = btn.dataset.target;
        const previewId = btn.dataset.preview;
        
        if (targetId) {
            const input = document.getElementById(targetId);
            if (input && input.value) {
                const preview = btn.querySelector('.emoji-preview') || document.getElementById(previewId);
                if (preview) {
                    preview.innerHTML = getEmojiDisplay(input.value, input.dataset.emojiUrl);
                }
            }
        }
    });
}

/**
 * Submit custom emoji from input field
 */
function submitCustomEmoji() {
    const input = document.getElementById('customEmojiInput');
    if (!input || !currentEmojiTarget) return;
    
    const value = input.value.trim();
    if (!value) {
        if (typeof showSnackbar === 'function') {
            showSnackbar('Please enter an emoji', 'error');
        }
        return;
    }
    
    // Check if it's a Discord custom emoji format
    const customMatch = value.match(/<(a?):([\w]+):(\d+)>/);
    if (customMatch) {
        const animated = customMatch[1] === 'a';
        const name = customMatch[2];
        const id = customMatch[3];
        const ext = animated ? 'gif' : 'png';
        const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;
        
        selectServerEmoji(id, name, animated, url);
        input.value = '';
        return;
    }
    
    // Check if it's a Unicode emoji
    if (/\p{Emoji}/u.test(value)) {
        selectUnicodeEmoji(value);
        input.value = '';
        return;
    }
    
    // Check if it's just an ID
    if (/^\d{17,19}$/.test(value)) {
        const url = `https://cdn.discordapp.com/emojis/${value}.png`;
        selectServerEmoji(value, 'emoji', false, url);
        input.value = '';
        return;
    }
    
    if (typeof showSnackbar === 'function') {
        showSnackbar('Invalid emoji format. Use <:name:id> or paste a unicode emoji.', 'error');
    }
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('emojiPickerModal');
    if (e.target === modal) {
        closeEmojiPicker();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEmojiPicker();
    }
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initEmojiPreviews);
