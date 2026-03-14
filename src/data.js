/**
 * Centralized Data Configuration
 * Edit this file to customize all default messages, templates, colors, and settings
 */

module.exports = {
    // =============================================
    // DEFAULT TEMPLATES (Shown in Create Giveaway)
    // =============================================
    defaultTemplates: {
        nitro: {
            name: 'Discord Nitro',
            prize: 'Discord Nitro Classic (1 Month)',
            duration: 120, // minutes
            winnersCount: 1,
            maxEntries: 0 // 0 = unlimited
        },
        steam: {
            name: 'Steam Gift Card',
            prize: 'Steam Gift Card ($25)',
            duration: 120,
            winnersCount: 1,
            maxEntries: 0
        }
    },

    // =============================================
    // DEFAULT MESSAGES
    // =============================================
    messages: {
        // Giveaway Entry Messages
        alreadyInGiveaway: 'You are already in this giveaway!',
        joinSuccess: 'You have entered the giveaway!',
        maxEntriesReached: 'This giveaway has reached the maximum number of entries!',
        noRequiredRole: 'You do not have the required role to enter.',
        giveawayInvalid: 'This giveaway is over or invalid.',

        // Giveaway End Messages
        giveawayEnded: '🎉 Congratulations {user}! You won **{prize}**!',
        noWinners: 'Giveaway for **{prize}** ended, but no one entered!',

        // DM Messages
        dmWinner: 'Congratulations! You won {prize}!',
        dmFooter: '*From: {guildName}*',
    },

    // =============================================
    // EMBED DEFAULTS
    // =============================================
    embeds: {
        // Active Giveaway Embed
        active: {
            title: 'New Giveaway!',
            description: 'React to enter!',
            color: '#0057ff'
        },

        // Ended Giveaway Embed
        ended: {
            title: '🎉 Giveaway Ended!',
            description: 'Winner: {winners}\nPrize: {prize}',
            color: '#808080' // Gray for ended
        },

        // Logging Embed Colors
        logging: {
            entry: '#00FF00',   // Green
            end: '#FF6B6B',     // Red
            create: '#7289DA'   // Discord Blue
        }
    },

    // =============================================
    // BUTTON DEFAULTS
    // =============================================
    buttons: {
        name: 'Enter Giveaway',
        emoji: '🎁',
        color: 'primary' // primary, success, danger, secondary
    },

    // =============================================
    // REACTION DEFAULTS
    // =============================================
    reactions: {
        emoji: '🎉'
    },

    // =============================================
    // GIVEAWAY SETTINGS
    // =============================================
    giveawaySettings: {
        checkInterval: 10 * 1000, // 10 seconds - how often to check for ended giveaways
        autoDeleteDelay: 10000,   // 10 seconds - delay before auto-deleting ended giveaway message
        sessionDuration: 14 * 24 * 60 * 60 * 1000 // 14 days - session cookie duration
    },

    // =============================================
    // LOGGING EMBED TEMPLATES
    // =============================================
    loggingEmbeds: {
        entry: {
            color: '#00FF00',
            title: '📥 Giveaway Entry',
            description: '<@{userId}> entered the giveaway for **{prize}**'
        },
        end: {
            color: '#FF6B6B',
            title: '🏆 Giveaway Ended',
            description: '**Prize:** {prize}\n**Winners:** {winners}'
        },
        create: {
            color: '#7289DA',
            title: '🎉 Giveaway Created',
            description: '**Prize:** {prize}\n**Ends:** <t:{endTimestamp}:R>'
        }
    },

    // =============================================
    // VARIABLE DESCRIPTIONS (for info tooltips)
    // =============================================
    variables: {
        '{user}': 'Mentions the winner(s)',
        '{prize}': 'The giveaway prize',
        '{guildName}': 'The server name',
        '{endTime}': 'When the giveaway ended',
        '{winners}': 'List of all winners',
        '{winnersCount}': 'Number of winners',
        '{emoji}': 'The configured emoji',
        '{#channelId}': 'Mention a channel',
        '{&roleId}': 'Mention a role',
        '{@userId}': 'Mention a user'
    },

    // =============================================
    // PAGINATION DEFAULTS
    // =============================================
    pagination: {
        defaultLimit: 10,
        allowedLimits: [10, 50, 100]
    }
};
