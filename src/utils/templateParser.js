


function parseTemplate(template, data = {}) {
    if (!template || typeof template !== 'string') {
        return template || '';
    }

    let result = template;
    if (data.userId) {
        result = result.replace(/{user}/gi, `<@${data.userId}>`);
    }

    if (data.prize) {
        result = result.replace(/{prize}/gi, data.prize);
    }

    if (data.guildName) {
        result = result.replace(/{guildName}/gi, data.guildName);
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
    result = result.replace(/{#(\d{17,20})}/g, (match, channelId) => {
        return `<#${channelId}>`;
    });
    result = result.replace(/{&(\d{17,20})}/g, (match, roleId) => {
        return `<@&${roleId}>`;
    });
    result = result.replace(/{@(\d{17,20})}/g, (match, userId) => {
        return `<@${userId}>`;
    });

    return result;
}


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
