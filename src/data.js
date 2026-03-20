

module.exports = {
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
    messages: {
        alreadyInGiveaway: 'You are already in this giveaway!',
        joinSuccess: 'You have entered the giveaway!',
        maxEntriesReached: 'This giveaway has reached the maximum number of entries!',
        noRequiredRole: 'You do not have the required role to enter.',
        giveawayInvalid: 'This giveaway is over or invalid.',
        giveawayEnded: '🎉 Congratulations {user}! You won **{prize}**!',
        noWinners: 'Giveaway for **{prize}** ended, but no one entered!',
        dmWinner: 'Congratulations! You won {prize}!',
        dmFooter: '*From: {guildName}*',
    },
    embeds: {
        active: {
            title: 'New Giveaway!',
            description: 'React to enter!',
            color: '#0057ff'
        },
        ended: {
            title: '🎉 Giveaway Ended!',
            description: 'Winner: {winners}\nPrize: {prize}',
            color: '#808080' // Gray for ended
        },
        logging: {
            entry: '#00FF00',   // Green
            end: '#FF6B6B',     // Red
            create: '#7289DA'   // Discord Blue
        }
    },
    buttons: {
        name: 'Enter Giveaway',
        emoji: '🎁',
        color: 'primary' // primary, success, danger, secondary
    },
    reactions: {
        emoji: '🎉'
    },
    giveawaySettings: {
        checkInterval: 10 * 1000, // 10 seconds - how often to check for ended giveaways
        autoDeleteDelay: 10000,   // 10 seconds - delay before auto-deleting ended giveaway message
        sessionDuration: 14 * 24 * 60 * 60 * 1000 // 14 days - session cookie duration
    },
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
    pagination: {
        defaultLimit: 10,
        allowedLimits: [10, 50, 100]
    }
};
