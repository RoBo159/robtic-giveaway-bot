

let currentEmojiTarget = null; // Tracks which input is being targeted


function openEmojiPicker(targetId, previewId) {
    currentEmojiTarget = { targetId, previewId };
    const modal = document.getElementById('emojiPickerModal');
    const searchInput = document.getElementById('emojiSearch');
    
    modal.classList.add('show');
    searchInput.value = '';
    filterEmojis(); // Reset filter
    searchInput.focus();
}


function closeEmojiPicker() {
    const modal = document.getElementById('emojiPickerModal');
    modal.classList.remove('show');
    currentEmojiTarget = null;
}


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
    if (typeof updatePreview === 'function') updatePreview();
    if (typeof updateButtonPreview === 'function') updateButtonPreview();
    if (typeof updateReactionPreview === 'function') updateReactionPreview();
}


function selectServerEmoji(id, name, animated, url) {
    if (!currentEmojiTarget) return;
    
    const targetInput = document.getElementById(currentEmojiTarget.targetId);
    const previewEl = document.getElementById(currentEmojiTarget.previewId);
    const emojiFormat = animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`;
    
    if (targetInput) {
        targetInput.value = emojiFormat;
        targetInput.dataset.emojiUrl = url;
        targetInput.dataset.emojiName = name;
    }

    console.log('Selected server emoji:', { id, name, animated, url });
    if (previewEl) {
        previewEl.innerHTML = `<img src="${url}" alt="${name}" style="width: 20px; height: 20px; vertical-align: middle;">`;
    }
    
    closeEmojiPicker();
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


function getEmojiDisplay(emojiValue) {
    if (!emojiValue) return '🎉';
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
    return emojiValue;
}


function initEmojiPreviews() {
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
    if (/\p{Emoji}/u.test(value)) {
        selectUnicodeEmoji(value);
        input.value = '';
        return;
    }
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
document.addEventListener('click', (e) => {
    const modal = document.getElementById('emojiPickerModal');
    if (e.target === modal) {
        closeEmojiPicker();
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEmojiPicker();
    }
});
document.addEventListener('DOMContentLoaded', initEmojiPreviews);
