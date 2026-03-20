
var roleMap = {};
var config = {};
var templates = {};
let currentTab = 'active';
let activeImagePreview = null;
let endedImagePreview = null;
window.currentTab = currentTab;

function switchEmbedTab(tab) {
    currentTab = tab;
    window.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const mainTab = document.getElementById(`tab-${tab}`);
    if (mainTab) mainTab.classList.add('active');
    const popupTab = document.getElementById(`popup-tab-${tab}`);
    if (popupTab) popupTab.classList.add('active');
    const activeConfig = document.getElementById('active-embed-config');
    const endedConfig = document.getElementById('ended-embed-config');
    if (activeConfig) activeConfig.style.display = tab === 'active' ? 'block' : 'none';
    if (endedConfig) endedConfig.style.display = tab === 'ended' ? 'block' : 'none';
    const header = document.querySelector('.preview-header h3');
    if (header) {
        header.textContent = tab === 'active' ? 'Live Preview (Active)' : 'Live Preview (Ended)';
    }

    updatePreview();
}

function previewImage(input, targetTab) {
    const file = input.files[0];
    const tab = targetTab || currentTab;
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (tab === 'active') {
                activeImagePreview = e.target.result;
            } else {
                endedImagePreview = e.target.result;
            }
            updatePreview();
        };
        reader.readAsDataURL(file);
    } else {
        if (tab === 'active') {
            activeImagePreview = null;
        } else {
            endedImagePreview = null;
        }
        updatePreview();
    }
}

function parseMarkdown(text) {
    if (!text) return '';
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    text = text.replace(/&lt;:(\w+):(\d+)&gt;/g, '<img src="https://cdn.discordapp.com/emojis/$2.png?v=1" alt=":$1:" style="width: 1.375em; height: 1.375em; vertical-align: bottom;" onerror="this.style.display=\'none\'">');
    text = text
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>')
        .replace(/~~(.*?)~~/g, '<del>$1</del>')
        .replace(/`([^`]+)`/g, '<code style="background:#2f3136; padding:2px 4px; border-radius:3px;">$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#00b0f4;">$1</a>')
        .replace(/\n/g, '<br>');
        
    return text;
}


function updatePreview() {
    const prize = document.getElementById('prizeInput').value || '[Prize Name]';
    const duration = parseInt(document.getElementById('durationInput').value) || 60;
    const winnersCount = parseInt(document.getElementById('winnersInput').value) || 1;
    const maxEntries = parseInt(document.getElementById('maxEntriesInput').value) || 0;
    const requiredRole = document.getElementById('requiredRoleSelect').value;
    
    let title, description, imageSrc;
    const embedTitleEl = document.getElementById('previewTitle');
    const embedDescEl = document.getElementById('previewDescription');
    let imgContainer = document.querySelector('.embed-image-container');
    if (!imgContainer) {
        imgContainer = document.createElement('div');
        imgContainer.className = 'embed-image-container';
        imgContainer.style.marginTop = '10px';
        imgContainer.innerHTML = '<img id="previewImage" style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 4px; display: none;">';
        const embedBody = document.querySelector('.embed-body');
        if (embedBody) {
            embedBody.appendChild(imgContainer);
        }
    }
    const imgEl = document.getElementById('previewImage');

    if (currentTab === 'active') {
        title = document.getElementById('embedTitleInput').value.trim() || config.embedTitle || 'New Giveaway!';
        let rawDesc = document.getElementById('embedDescriptionInput').value;
        if (!rawDesc) {
             rawDesc = "React to enter!";
        }
        let timeStr = '';
        if (duration >= 60) {
            const hours = Math.floor(duration / 60);
            const mins = duration % 60;
            timeStr = hours + ' hour' + (hours > 1 ? 's' : '');
            if (mins > 0) timeStr += ' ' + mins + ' min';
        } else {
            timeStr = duration + ' minute' + (duration > 1 ? 's' : '');
        }
        description = rawDesc
            .replace(/{prize}/gi, prize)
            .replace(/{winners}/gi, winnersCount)
            .replace(/{guildName}/gi, config.guildName || 'Server')
            .replace(/{duration}/gi, timeStr); // Approximate
        
        imageSrc = activeImagePreview || config.embedImage || null;

    } else {
        title = document.getElementById('endedEmbedTitleInput').value.trim() || '🎉 Giveaway Ended!';
        let rawDesc = document.getElementById('endedEmbedDescriptionInput').value;
        if (!rawDesc) rawDesc = "Winner: {winners}\nPrize: {prize}";
        
        description = rawDesc
            .replace(/{prize}/gi, prize)
            .replace(/{winners}/gi, winnersCount > 1 ? `${winnersCount} Users` : 'User')
            .replace(/{count}/gi, winnersCount)
            .replace(/{guildName}/gi, config.guildName || 'Server');
            
        imageSrc = endedImagePreview || config.endedEmbedImage || null;
    }
    
    embedTitleEl.innerHTML = parseMarkdown(title);
    embedDescEl.innerHTML = parseMarkdown(description);
    
    if (imageSrc) {
        imgEl.src = imageSrc;
        imgEl.style.display = 'block';
    } else {
        imgEl.style.display = 'none';
        imgEl.removeAttribute('src');
    }
    const btnPreview = document.getElementById('previewButton');
    const reactionPreview = document.querySelector('.preview-reaction');
    const endBehavior = document.getElementById('endBehaviorSelect').value;
    
    if (currentTab === 'ended') {
        if (config.giveawayType === 'button') {
            if (endBehavior === 'remove') {
                 if (btnPreview) btnPreview.style.display = 'none';
            } else {
                 if (btnPreview) {
                     btnPreview.style.display = 'inline-flex';
                     btnPreview.style.opacity = '0.5';
                     btnPreview.style.cursor = 'not-allowed';
                 }
            }
        } else {
            if (reactionPreview) reactionPreview.style.display = 'flex';
        }
    } else {
        if (config.giveawayType === 'button') {
             if (btnPreview) {
                 btnPreview.style.display = 'inline-flex';
                 btnPreview.style.opacity = '1';
                 btnPreview.style.cursor = 'pointer';
             }
        }
    }

    if (typeof window.markPopupDirtyFromInputs === 'function') {
        window.markPopupDirtyFromInputs();
    }
}


function loadTemplate(templateName) {
    const template = templates[templateName];
    if (!template) return;
    loadDbTemplate(templateName, template.prize, template.duration, template.winnersCount, template.maxEntries, '', '');
}


function loadDbTemplate(name, prize, duration, winners, maxEntries, channelId, roleId) {
    document.getElementById('prizeInput').value = prize;
    document.getElementById('durationInput').value = duration;
    document.getElementById('winnersInput').value = winners;
    document.getElementById('maxEntriesInput').value = maxEntries;
    
    if (channelId) {
        const ch = document.getElementById('channelSelect');
        if (ch) ch.value = channelId;
    }
    if (roleId) {
        const r = document.getElementById('requiredRoleSelect');
        if (r) r.value = roleId;
    }

    updatePreview();
    document.getElementById('prizeInput').focus();
}


function saveTemplate() {
    const name = prompt("Enter a name for this template:");
    if (!name) return;

    const form = document.getElementById('createForm');
    let input = document.getElementById('tempNameInput');
    if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.id = 'tempNameInput';
        input.name = 'name';
        form.appendChild(input);
    }
    input.value = name;
    const guildId = form.action.split('/dashboard/')[1].split('/')[0];
    form.action = `/dashboard/${guildId}/templates`;
    form.submit();
}


function initCreateGiveawayPage() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('prize')) {
        document.getElementById('prizeInput').value = params.get('prize');
        document.getElementById('durationInput').value = params.get('duration') || 60;
        document.getElementById('winnersInput').value = params.get('winnersCount') || 1;
        document.getElementById('maxEntriesInput').value = params.get('maxEntries') || 0;
        if (params.has('channelId')) {
            document.getElementById('channelSelect').value = params.get('channelId');
        }
        if (params.has('requiredRole')) {
            document.getElementById('requiredRoleSelect').value = params.get('requiredRole');
        }
    }
    updatePreview();
}
document.addEventListener('DOMContentLoaded', initCreateGiveawayPage);
