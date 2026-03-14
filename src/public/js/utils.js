/**
 * Shared utility functions for client-side JavaScript
 */

/**
 * Decode HTML entities in a string
 * @param {string} str - String with potential HTML entities
 * @returns {string} Decoded string
 */
function decodeHtmlEntities(str) {
    if (!str || typeof str !== 'string') return str;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
}

/**
 * Parse an emoji string and extract info
 * @param {string} emojiValue - The emoji value (Unicode or Discord format)
 * @returns {object|null} Object with {animated, name, id, url} or null for unicode/invalid
 */
function parseEmoji(emojiValue) {
    if (!emojiValue || typeof emojiValue !== 'string') return null;
    
    // Decode HTML entities first (in case value came from HTML attributes)
    let decoded = decodeHtmlEntities(emojiValue);
    
    // Match Discord custom emoji format: <:name:id> or <a:name:id>
    const match = decoded.match(/<(a?):([\w]+):(\d+)>/);
    if (match) {
        const animated = match[1] === 'a';
        const name = match[2];
        const id = match[3];
        const ext = animated ? 'gif' : 'webp';
        return {
            animated,
            name,
            id,
            url: `https://cdn.discordapp.com/emojis/${id}.${ext}?size=96&quality=lossless`
        };
    }
    
    // Also try matching just the ID (in case only ID was stored)
    const idMatch = decoded.match(/^(\d{17,20})$/);
    if (idMatch) {
        return {
            animated: false,
            name: 'emoji',
            id: idMatch[1],
            url: `https://cdn.discordapp.com/emojis/${idMatch[1]}.png?size=96&quality=lossless`
        };
    }
    
    return null; // Unicode emoji or invalid
}

/**
 * Parse emoji value and return display HTML
 * Handles both Unicode and Discord custom emoji formats
 * @param {string} emojiValue - The emoji value (Unicode or Discord format like <:name:id> or <a:name:id>)
 * @param {number} size - Size in pixels (default: 20)
 * @returns {string} HTML to display the emoji
 */
function getEmojiDisplay(emojiValue, size = 20) {
    if (!emojiValue) return '🎉';
    
    // Check if it's a Discord custom emoji format: <:name:id> or <a:name:id>
    const parsed = parseEmoji(emojiValue);
    if (parsed) {
        return `<img src="${parsed.url}" alt=":${parsed.name}:" title=":${parsed.name}:" class="emoji-img" style="width: ${size}px; height: ${size}px;">`;
    }
    
    // It's a Unicode emoji - return as-is
    return emojiValue;
}

/**
 * Check if a string is a valid emoji (Unicode or Discord format)
 * @param {string} value - The value to check
 * @returns {boolean}
 */
function isValidEmoji(value) {
    if (!value || typeof value !== 'string') return false;
    
    // Check Discord custom format
    if (/<a?:[\w]+:\d+>/.test(value)) return true;
    
    // Check for unicode emoji (basic check)
    if (/\p{Emoji}/u.test(value)) return true;
    
    return false;
}

/**
 * Update an element's content with proper emoji rendering
 * @param {string} elementId - ID of the element to update
 * @param {string} emojiValue - The emoji value
 * @param {number} size - Size in pixels
 */
function setEmojiContent(elementId, emojiValue, size = 20) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = getEmojiDisplay(emojiValue, size);
    }
}
