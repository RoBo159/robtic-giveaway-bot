const express = require('express');
const router = express.Router();
const GuildConfig = require('../models/GuildConfig');
const Giveaway = require('../models/Giveaway');
const Template = require('../models/Template');

// Middleware to check if logged in
function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
}

// Permissions Check Helper (Manage Guild or Admin)
const MANAGE_GUILD = 0x20;
const ADMIN = 0x8;

// Helper to get user's manageable guilds for the server switcher
function getUserGuilds(req) {
    const userGuilds = req.user.guilds;
    const botGuilds = req.bot.guilds.cache;

    const manageableGuilds = userGuilds.filter(guild => {
        const perms = parseInt(guild.permissions);
        return (perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD;
    });

    return manageableGuilds.map(guild => ({
        ...guild,
        botIn: botGuilds.has(guild.id)
    }));
}

router.use(checkAuth);

// Dashboard Main: List Servers
router.get('/', async (req, res) => {
    try {
        const userGuilds = req.user.guilds;
        const botGuilds = req.bot.guilds.cache;

        const manageableGuilds = userGuilds.filter(guild => {
            const perms = parseInt(guild.permissions);
            return (perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD;
        });

        // Add 'botIn' property
        const guildsInfo = manageableGuilds.map(guild => ({
            ...guild,
            botIn: botGuilds.has(guild.id)
        }));

        res.render('dashboard', { user: req.user, guilds: guildsInfo });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Server Config / Bot Panel
router.get('/:guildId', async (req, res) => {
    const guildId = req.params.guildId;
    
    // Security Check: Is user admin in this guild?
    const userGuild = req.user.guilds.find(g => g.id === guildId);
    if (!userGuild) return res.status(403).send('Forbidden');
    const perms = parseInt(userGuild.permissions);
    if (!((perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD)) {
        return res.status(403).send('Forbidden');
    }

    // Check if bot is in guild
    if (!req.bot.guilds.cache.has(guildId)) {
        // Redirect to add bot page or show invite link
        const clientId = req.bot.user.id;
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot`;
        return res.render('add-bot', { inviteLink, guildName: userGuild.name });
    }

    res.redirect(`/dashboard/${guildId}/create`);
});

// Logs Panel
router.get('/:guildId/logs', async (req, res) => {
    const guildId = req.params.guildId;
    const guild = req.bot.guilds.cache.get(guildId);
    if (!guild) return res.redirect('/dashboard');

    // Pagination with configurable limit
    const page = parseInt(req.query.page) || 1;
    const allowedLimits = [10, 50, 100];
    let limit = parseInt(req.query.limit) || 10;
    if (!allowedLimits.includes(limit)) limit = 10;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalCount = await Giveaway.countDocuments({ guildId });
    const totalPages = Math.ceil(totalCount / limit);
    
    const giveawaysData = await Giveaway.find({ guildId })
        .sort({ endTime: -1 })
        .skip(skip)
        .limit(limit);

    // Enriched Data (fetch names)
    const giveaways = await Promise.all(giveawaysData.map(async (g) => {
        let hostName = g.hostId;
        let channelName = g.channelId;
        let roleName = 'Everyone';
        let winnerNames = [];

        try {
            // Get Host Name
            const user = await req.bot.users.fetch(g.hostId).catch(() => null);
            if (user) hostName = user.username;

            // Get Channel Name
            const channel = guild.channels.cache.get(g.channelId);
            if (channel) channelName = `#${channel.name}`;
            
            // Get Role Name
            if (g.requiredRole) {
                const role = guild.roles.cache.get(g.requiredRole);
                if (role) roleName = `@${role.name}`;
            }
            
            // Get Winner Names
            if (g.winners && g.winners.length > 0) {
                for (const winnerId of g.winners) {
                    try {
                        const winnerUser = await req.bot.users.fetch(winnerId).catch(() => null);
                        winnerNames.push(winnerUser ? winnerUser.username : winnerId);
                    } catch (e) {
                        winnerNames.push(winnerId);
                    }
                }
            }

        } catch (e) { console.error(e); }

        return {
            ...g.toObject(),
            hostName,
            channelName,
            roleName,
            winnerNames
        };
    }));

    res.render('logs', {
        user: req.user,
        guild,
        giveaways,
        currentPage: page,
        totalPages,
        totalCount,
        perPage: limit,
        navPage: 'logs',
        allGuilds: getUserGuilds(req)
    });
});

// Update Config
router.post('/:guildId/config', async (req, res) => {
    const guildId = req.params.guildId;
    const { 
        giveawayType, 
        embedColor, 
        reactionEmoji, 
        embedTitle, 
        embedDescription,
        buttonName,
        buttonEmoji,
        buttonColor
    } = req.body;
    
    const updatedConfig = {
        giveawayType, 
        embedColor, 
        reactionEmoji, 
        embedTitle, 
        embedDescription,
        buttonName: buttonName || 'Join Giveaway',
        buttonEmoji: buttonEmoji || '🎉',
        buttonColor: buttonColor || 'primary'
    };
    
    await GuildConfig.updateOne(
        { guildId }, 
        updatedConfig, 
        { upsert: true }
    );
    
    // Return JSON if request expects it (from popup)
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, config: updatedConfig });
    }
    
    res.redirect(`/dashboard/${guildId}/config`);
});

// Settings Panel
router.get('/:guildId/settings', async (req, res) => {
    const guildId = req.params.guildId;
    const guild = req.bot.guilds.cache.get(guildId);
    if (!guild) return res.redirect('/dashboard');

    let settings = await GuildConfig.findOne({ guildId });
    if (!settings) {
        settings = new GuildConfig({ guildId });
        await settings.save();
    }

    const channels = guild.channels.cache
        .filter(ch => ch.isDMBased() === false)
        .map(ch => ({ id: ch.id, name: ch.name }));

    const roles = guild.roles.cache
        .filter(r => r.name !== '@everyone')
        .map(r => ({ id: r.id, name: r.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    res.render('settings', { 
        user: req.user, 
        settings, 
        guild,
        channels,
        roles,
        page: 'settings',
        allGuilds: getUserGuilds(req)
    });
});

// Update Settings
router.post('/:guildId/settings', async (req, res) => {
    const guildId = req.params.guildId;
    const { 
        dmWinners, 
        dmWinnersMessage, 
        autoDeleteEndedGiveaways,
        enableLogging,
        loggingChannelId,
        joinMessage,
        alreadyInGiveawayMessage,
        mentionEnabled,
        mentionType,
        mentionRoleId,
        endedGiveawayMessage,
        endedEmbedTitle,
        endedEmbedDescription,
        endedEmbedColor
    } = req.body;

    await GuildConfig.updateOne(
        { guildId },
        {
            dmWinners: dmWinners === 'true',
            dmWinnersMessage: dmWinnersMessage || '',
            autoDeleteEndedGiveaways: autoDeleteEndedGiveaways === 'true',
            enableLogging: enableLogging === 'true',
            loggingChannelId: loggingChannelId || null,
            joinMessage: joinMessage || '',
            alreadyInGiveawayMessage: alreadyInGiveawayMessage || 'You are already in this giveaway!',
            mentionEnabled: mentionEnabled === 'true',
            mentionType: mentionType || 'everyone',
            mentionRoleId: mentionRoleId || null,
            endedGiveawayMessage: endedGiveawayMessage || '🎉 Congratulations {user}! You won **{prize}**!',
            endedEmbedTitle: endedEmbedTitle || '🎉 Giveaway Ended!',
            endedEmbedDescription: endedEmbedDescription || 'Winner: {winners}\nPrize: {prize}',
            endedEmbedColor: endedEmbedColor || '#808080'
        },
        { upsert: true }
    );

    res.redirect(`/dashboard/${guildId}/settings`);
});

// Create Giveaway Page
router.get('/:guildId/create', async (req, res) => {
    const guildId = req.params.guildId;
    const guild = req.bot.guilds.cache.get(guildId);
    if (!guild) return res.redirect('/dashboard');

    const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name }));
    const channels = guild.channels.cache
        .filter(ch => ch.isDMBased() === false)
        .map(ch => ({ id: ch.id, name: ch.name }));

    const templates = await Template.find({ guildId });
    
    // Get config for preview
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
        config = new GuildConfig({ guildId });
        await config.save();
    }
    
    // Get server emojis for emoji picker
    const serverEmojis = guild.emojis.cache.map(e => ({
        id: e.id,
        name: e.name,
        animated: e.animated,
        url: e.imageURL()
    }));

    console.log(req.user)

    res.render('create-giveaway', { 
        user: req.user, 
        guild, 
        roles, 
        channels, 
        templates, 
        config,
        serverEmojis,
        page: 'create', 
        allGuilds: getUserGuilds(req) 
    });
});

// Create Giveaway Action
router.post('/:guildId/create', async (req, res) => {
    const guildId = req.params.guildId;
    const { prize, duration, channelId, requiredRole, winnersCount, maxEntries } = req.body;
    
    // Simple duration parsing (assuming minutes for demo, user can improve)
    // In production, use 'ms' package or similar.
    const endTime = new Date(Date.now() + parseInt(duration) * 60000);
    
    const config = await GuildConfig.findOne({ guildId }) || {};
    const { parseTemplate } = require('../utils/templateParser');

    // Send to Discord
    const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
    
    // Map button color to ButtonStyle
    const buttonStyleMap = {
        'primary': ButtonStyle.Primary,
        'success': ButtonStyle.Success,
        'danger': ButtonStyle.Danger,
        'secondary': ButtonStyle.Secondary
    };
    
    // Prepare template data for description parsing
    const templateData = {
        prize,
        userId: req.user.discordId,
        guildName: req.bot.guilds.cache.get(guildId)?.name || 'Server',
        endTime,
        winnersCount: parseInt(winnersCount) || 1
    };
    
    // Parse embed description with template variables
    let descriptionTemplate = config.embedDescription || 'React to enter!';
    let description = parseTemplate(descriptionTemplate, templateData);
    description += `\n\n**Prize:** ${prize}\n**Ends:** <t:${Math.floor(endTime.getTime()/1000)}:R>`;
    
    if (parseInt(winnersCount) > 1) {
        description += `\n**Winners:** ${winnersCount}`;
    }
    if (parseInt(maxEntries) > 0) {
        description += `\n**Max Entries:** ${maxEntries}`;
    }

    const embed = new EmbedBuilder()
        .setTitle(parseTemplate(config.embedTitle || 'New Giveaway!', templateData))
        .setDescription(description)
        .setColor(config.embedColor || '#00FF00');

    if (requiredRole) {
        embed.addFields({ name: 'Requirement', value: `<@&${requiredRole}>` });
    }

    try {
        const channel = await req.bot.channels.fetch(channelId);
        let message;
        
        // Send mention before embed if enabled
        if (config.mentionEnabled) {
            let mentionText = '';
            switch (config.mentionType) {
                case 'everyone':
                    mentionText = '@everyone';
                    break;
                case 'here':
                    mentionText = '@here';
                    break;
                case 'role':
                    if (config.mentionRoleId) {
                        mentionText = `<@&${config.mentionRoleId}>`;
                    }
                    break;
            }
            if (mentionText) {
                await channel.send(mentionText);
            }
        }
        
        if (config.giveawayType === 'button') {
            const joinBtn = new ButtonBuilder()
                .setCustomId('join_giveaway')
                .setLabel(config.buttonName || 'Enter Giveaway')
                .setStyle(buttonStyleMap[config.buttonColor] || ButtonStyle.Primary);
            
            // Add emoji if configured
            if (config.buttonEmoji) {
                joinBtn.setEmoji(config.buttonEmoji);
            }

            const row = new ActionRowBuilder().addComponents(joinBtn);
            message = await channel.send({ embeds: [embed], components: [row] });
        } else {
            // Reaction
            message = await channel.send({ embeds: [embed] });
            await message.react(config.reactionEmoji || '🎉');
        }

        const newGiveaway = new Giveaway({
            guildId,
            channelId,
            messageId: message.id,
            prize,
            winnersCount: parseInt(winnersCount) || 1,
            maxEntries: parseInt(maxEntries) || 0,
            endTime,
            hostId: req.user.discordId,
            requiredRole: requiredRole || null
        });

        await newGiveaway.save();

        // Log giveaway creation
        if (req.logGiveawayEvent) {
            await req.logGiveawayEvent(guildId, 'create', {
                prize,
                endTime,
                guildName: req.bot.guilds.cache.get(guildId)?.name || 'Unknown'
            });
        }
    } catch (err) {
        console.error("Failed to send giveaway message:", err);
    }
    
    res.redirect(`/dashboard/${guildId}/logs`);
});

// Delete Giveaway
router.delete('/:guildId/giveaway/:id', async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const giveawayId = req.params.id;

        // Check if user is guild owner or has admin permissions
        const guild = req.bot.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const member = guild.members.cache.get(req.user.discordId);
        if (!member || (!member.permissions.has('Administrator') && guild.ownerId !== req.user.discordId)) {
            return res.status(403).json({ error: 'You do not have permission to delete this giveaway' });
        }

        // Find and delete the giveaway
        const giveaway = await Giveaway.findByIdAndDelete(giveawayId);
        if (!giveaway) {
            return res.status(404).json({ error: 'Giveaway not found' });
        }

        // Try to delete the Discord message if it exists
        try {
            const channel = await req.bot.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);
            await message.delete();
        } catch (e) {
            console.log('Could not delete Discord message:', e.message);
        }

        res.json({ success: true, message: 'Giveaway deleted successfully' });
    } catch (error) {
        console.error('Error deleting giveaway:', error);
        res.status(500).json({ error: 'Failed to delete giveaway' });
    }
});

// Create Template
router.post('/:guildId/templates', async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const { name, prize, duration, winnersCount, maxEntries, channelId, requiredRole } = req.body;
        
        await Template.create({
            guildId,
            name: name || prize,
            prize,
            duration: parseInt(duration),
            winnersCount: parseInt(winnersCount),
            maxEntries: parseInt(maxEntries) || 0,
            channelId,
            requiredRole
        });
        
        res.redirect(`/dashboard/${guildId}/create`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating template');
    }
});

// Stop Giveaway (End it and declare winners)
router.post('/:guildId/giveaway/:id/stop', async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const giveawayId = req.params.id;

        // Check if user is guild owner or has admin permissions
        const guild = req.bot.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const member = guild.members.cache.get(req.user.discordId);
        if (!member || (!member.permissions.has('Administrator') && guild.ownerId !== req.user.discordId)) {
            return res.status(403).json({ error: 'You do not have permission to stop this giveaway' });
        }

        // Find the giveaway
        const giveaway = await Giveaway.findById(giveawayId);
        if (!giveaway) {
            return res.status(404).json({ error: 'Giveaway not found' });
        }

        // Randomly select winners from entries
        let winners = [];
        if (giveaway.entries.length > 0) {
            const winnerCount = Math.min(giveaway.winnersCount, giveaway.entries.length);
            const shuffled = [...giveaway.entries].sort(() => 0.5 - Math.random());
            winners = shuffled.slice(0, winnerCount);
        }

        // Update giveaway
        giveaway.ended = true;
        giveaway.winners = winners;
        await giveaway.save();

        // Try to update the Discord message
        try {
            const channel = await req.bot.channels.fetch(giveaway.channelId);
            const message = await channel.messages.fetch(giveaway.messageId);
            
            let content = `🎉 **Giveaway Ended!** 🎉\n\n`;
            if (winners.length > 0) {
                const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
                content += `**Winners:** ${winnerMentions}\n\n`;
            } else {
                content += `**No winners** - Not enough participants!\n\n`;
            }
            content += `**Prize:** ${giveaway.prize}`;

            await message.reply({ content });
        } catch (e) {
            console.log('Could not update Discord message:', e.message);
        }

        res.json({ success: true, winnerCount: winners.length });
    } catch (error) {
        console.error('Error stopping giveaway:', error);
        res.status(500).json({ error: 'Failed to stop giveaway' });
    }
});

module.exports = router;
