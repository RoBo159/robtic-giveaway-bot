/**
 * Create Giveaway Page JavaScript
 * Handles live preview updates, template loading, and form submission
 */

// Role name mapping - populated from EJS (use var for global scope)
var roleMap = {};

// Config object - populated from EJS
var config = {};

// Templates - populated from EJS
var templates = {};

/**
 * Update the live preview panel
 */
function updatePreview() {
    const prize = document.getElementById('prizeInput').value || '[Enter prize]';
    const duration = parseInt(document.getElementById('durationInput').value) || 60;
    const winnersCount = parseInt(document.getElementById('winnersInput').value) || 1;
    const maxEntries = parseInt(document.getElementById('maxEntriesInput').value) || 0;
    const requiredRole = document.getElementById('requiredRoleSelect').value;
    
    // Calculate relative time
    let timeStr = '';
    if (duration >= 60) {
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        timeStr = hours + ' hour' + (hours > 1 ? 's' : '');
        if (mins > 0) timeStr += ' ' + mins + ' min';
    } else {
        timeStr = duration + ' minute' + (duration > 1 ? 's' : '');
    }
    
    // Build description
    let desc = (config.embedDescription || 'React to enter!')
        .replace(/{prize}/gi, prize)
        .replace(/{guildName}/gi, config.guildName || 'Server');
    
    desc += `\n\n**Prize:** ${prize}`;
    desc += `\n**Ends:** in ${timeStr}`;
    
    if (winnersCount > 1) {
        desc += `\n**Winners:** ${winnersCount}`;
    }
    if (maxEntries > 0) {
        desc += `\n**Max Entries:** ${maxEntries}`;
    }
    
    document.getElementById('previewDescription').innerHTML = desc
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    
    // Update requirement field
    const reqField = document.getElementById('previewRequirement');
    if (reqField) {
        if (requiredRole && roleMap[requiredRole]) {
            reqField.style.display = 'block';
            document.getElementById('previewRoleValue').textContent = '@' + roleMap[requiredRole];
        } else {
            reqField.style.display = 'none';
        }
    }
}

/**
 * Load a preset template
 * @param {string} templateName - Name of the template to load
 */
function loadTemplate(templateName) {
    const template = templates[templateName];
    if (!template) return;
    loadDbTemplate(templateName, template.prize, template.duration, template.winnersCount, template.maxEntries, '', '');
}

/**
 * Load template values into the form
 * @param {string} name - Template name
 * @param {string} prize - Prize value
 * @param {number} duration - Duration in minutes
 * @param {number} winners - Number of winners
 * @param {number} maxEntries - Max entries (0 = unlimited)
 * @param {string} channelId - Channel ID
 * @param {string} roleId - Required role ID
 */
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

/**
 * Save current form as a template
 */
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

    // Get the current action to restore later
    const guildId = form.action.split('/dashboard/')[1].split('/')[0];
    form.action = `/dashboard/${guildId}/templates`;
    form.submit();
}

/**
 * Initialize the page
 */
function initCreateGiveawayPage() {
    // Check for template parameters from URL (Remake feature)
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
    
    // Initialize preview
    updatePreview();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initCreateGiveawayPage);
