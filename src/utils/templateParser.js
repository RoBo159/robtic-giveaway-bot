/**
 * Template Parser Utility
 * Centralizes all variable replacement logic for messages
 */

/**
 * Parse a template string and replace variables with actual values
 * 
 * Supported variables:
 * - {user}        → User mention
 * - {prize}       → Prize name
 * - {guildName}   → Server name
 * - {endTime}     → Giveaway end time (Discord timestamp)
 * - {winners}     → Winner count
 * - {emoji}       → The giveaway emoji (reaction or button)
 * - {#channelid}  → Channel mention
 * - {&roleid}     → Role mention
 * - {@userid}     → User mention by ID
 * 
 * @param {string} template - The template string with variables
 * @param {object} data - Data object containing values for replacement
 * @param {string} [data.userId] - User ID for {user} variable
 * @param {string} [data.prize] - Prize name for {prize} variable
 * @param {string} [data.guildName] - Server name for {guildName} variable
 * @param {Date|number} [data.endTime] - End time for {endTime} variable
 * @param {number} [data.winnersCount] - Winner count for {winners} variable
 * @param {string} [data.emoji] - Emoji for {emoji} variable
 * @returns {string} Parsed template with variables replaced
 */
function parseTemplate(template, data = {}) {
    if (!template || typeof template !== 'string') {
        return template || '';
    }

    let result = template;

    // Basic variables
    if (data.userId) {
        result = result.replace(/{user}/gi, `<@${data.userId}>`);
    }

    if (data.prize) {
        result = result.replace(/{prize}/gi, data.prize);
    }

    if (data.guildName) {
        result = result.replace(/{guildName}/gi, data.guildName);
        // Also support legacy {server} variable for backwards compatibility
        result = result.replace(/{server}/gi, data.guildName);
    }

    if (data.endTime) {
        const timestamp = data.endTime instanceof Date 
            ? Math.floor(data.endTime.getTime() / 1000) 
            : Math.floor(data.endTime / 1000);
        result = result.replace(/{endTime}/gi, `<t:${timestamp}:R>`);
    }

    if (data.winnersCount !== undefined) {
        result = result.replace(/{winners}/gi, String(data.winnersCount));
    }

    if (data.emoji) {
        result = result.replace(/{emoji}/gi, data.emoji);
    }

    // Channel mentions: {#channelid}
    result = result.replace(/{#(\d{17,20})}/g, (match, channelId) => {
        return `<#${channelId}>`;
    });

    // Role mentions: {&roleid}
    result = result.replace(/{&(\d{17,20})}/g, (match, roleId) => {
        return `<@&${roleId}>`;
    });

    // User mentions by ID: {@userid}
    result = result.replace(/{@(\d{17,20})}/g, (match, userId) => {
        return `<@${userId}>`;
    });

    return result;
}

/**
 * Get all available variables for documentation/tooltips
 * @returns {Array<{variable: string, description: string}>}
 */
function getAvailableVariables() {
    return [
        { variable: '{user}', description: 'Mention the user who triggered the action' },
        { variable: '{prize}', description: 'The giveaway prize name' },
        { variable: '{guildName}', description: 'The server name' },
        { variable: '{endTime}', description: 'When the giveaway ends (relative time)' },
        { variable: '{winners}', description: 'Number of winners' },
        { variable: '{emoji}', description: 'The giveaway emoji (reaction or button)' },
        { variable: '{#channelid}', description: 'Mention a channel (replace channelid with ID)' },
        { variable: '{&roleid}', description: 'Mention a role (replace roleid with ID)' },
        { variable: '{@userid}', description: 'Mention a specific user (replace userid with ID)' }
    ];
}

module.exports = {
    parseTemplate,
    getAvailableVariables
};
