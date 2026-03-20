


function decodeHtmlEntities(str) {
    if (!str || typeof str !== 'string') return str;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
}


function parseEmoji(emojiValue) {
    if (!emojiValue || typeof emojiValue !== 'string') return null;
    let decoded = decodeHtmlEntities(emojiValue);
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


function getEmojiDisplay(emojiValue, size = 20) {
    if (!emojiValue) return '🎉';
    const parsed = parseEmoji(emojiValue);
    if (parsed) {
        return `<img src="${parsed.url}" alt=":${parsed.name}:" title=":${parsed.name}:" class="emoji-img" style="width: ${size}px; height: ${size}px;">`;
    }
    return emojiValue;
}


function isValidEmoji(value) {
    if (!value || typeof value !== 'string') return false;
    if (/<a?:[\w]+:\d+>/.test(value)) return true;
    if (/\p{Emoji}/u.test(value)) return true;
    
    return false;
}


function setEmojiContent(elementId, emojiValue, size = 20) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = getEmojiDisplay(emojiValue, size);
    }
}
