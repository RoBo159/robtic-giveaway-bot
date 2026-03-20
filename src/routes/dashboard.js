const express = require('express');
const router = express.Router();
const GuildConfig = require('../models/GuildConfig');
const Giveaway = require('../models/Giveaway');
const Template = require('../models/Template');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

function getLocalPublicUploadUrl(fileName) {
    return `/uploads/${encodeURIComponent(fileName)}`;
}

async function uploadToFreeImageHost(localPath, originalName, mimeType) {
    const buffer = await fs.promises.readFile(localPath);
    const fileName = originalName || path.basename(localPath);
    const errors = [];

    try {
        const form0x0 = new FormData();
        form0x0.append('file', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), fileName);
        const response0x0 = await fetch('https://0x0.st', {
            method: 'POST',
            body: form0x0,
        });
        if (response0x0.ok) {
            const url = (await response0x0.text()).trim();
            if (/^https?:\/\//i.test(url)) return url;
        }
        errors.push(`0x0.st status ${response0x0.status}`);
    } catch (e) {
        errors.push(`0x0.st error: ${e.message}`);
    }

    try {
        const formCatbox = new FormData();
        formCatbox.append('reqtype', 'fileupload');
        formCatbox.append('fileToUpload', new Blob([buffer], { type: mimeType || 'application/octet-stream' }), fileName);
        const responseCatbox = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: formCatbox,
        });
        if (responseCatbox.ok) {
            const url = (await responseCatbox.text()).trim();
            if (/^https?:\/\//i.test(url)) return url;
        }
        errors.push(`catbox.moe status ${responseCatbox.status}`);
    } catch (e) {
        errors.push(`catbox.moe error: ${e.message}`);
    }

    throw new Error(`All image hosts failed: ${errors.join(' | ')}`);
}

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
}

const MANAGE_GUILD = 0x20;
const ADMIN = 0x8;

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

router.get('/', async (req, res) => {
    try {
        const userGuilds = req.user.guilds;
        const botGuilds = req.bot.guilds.cache;

        const manageableGuilds = userGuilds.filter(guild => {
            const perms = parseInt(guild.permissions);
            return (perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD;
        });

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

router.get('/:guildId', async (req, res) => {
    const guildId = req.params.guildId;

    const userGuild = req.user.guilds.find(g => g.id === guildId);
    if (!userGuild) return res.status(403).send('Forbidden');
    const perms = parseInt(userGuild.permissions);
    if (!((perms & ADMIN) === ADMIN || (perms & MANAGE_GUILD) === MANAGE_GUILD)) {
        return res.status(403).send('Forbidden');
    }

    if (!req.bot.guilds.cache.has(guildId)) {

        const clientId = req.bot.user.id;
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot`;
        return res.render('add-bot', { inviteLink, guildName: userGuild.name });
    }

    res.redirect(`/dashboard/${guildId}/create`);
});

router.get('/:guildId/logs', async (req, res) => {
    const guildId = req.params.guildId;
    const guild = req.bot.guilds.cache.get(guildId);
    if (!guild) return res.redirect('/dashboard');

    const page = parseInt(req.query.page) || 1;
    const allowedLimits = [10, 50, 100];
    let limit = parseInt(req.query.limit) || 10;
    if (!allowedLimits.includes(limit)) limit = 10;
    const skip = (page - 1) * limit;

    const totalCount = await Giveaway.countDocuments({ guildId });
    const totalPages = Math.ceil(totalCount / limit);
    
    const giveawaysData = await Giveaway.find({ guildId })
        .sort({ endTime: -1 })
        .skip(skip)
        .limit(limit);

    const giveaways = await Promise.all(giveawaysData.map(async (g) => {
        let hostName = g.hostId;
        let channelName = g.channelId;
        let roleName = 'Everyone';
        let winnerNames = [];

        try {

            const user = await req.bot.users.fetch(g.hostId).catch(() => null);
            if (user) hostName = user.username;

            const channel = guild.channels.cache.get(g.channelId);
            if (channel) channelName = `#${channel.name}`;

            if (g.requiredRole) {
                const role = guild.roles.cache.get(g.requiredRole);
                if (role) roleName = `@${role.name}`;
            }

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

router.post('/:guildId/config', upload.fields([
    { name: 'embedImage', maxCount: 1 },
    { name: 'endedEmbedImage', maxCount: 1 }
]), async (req, res) => {
    const guildId = req.params.guildId;
    const { 
        giveawayType, 
        embedColor, 
        reactionEmoji, 
        embedTitle, 
        embedDescription,
        buttonName,
        buttonEmoji,
        buttonColor,
        endedEmbedTitle,
        endedEmbedDescription,
        endBehavior,
        embedImage,
        endedEmbedImage
    } = req.body;

    const existingConfig = await GuildConfig.findOne({ guildId });
    const resolvedGiveawayType = (giveawayType === 'button' || giveawayType === 'reaction')
        ? giveawayType
        : (existingConfig?.giveawayType || 'reaction');

    let activeImageUrl = embedImage || existingConfig?.embedImage || null;
    let endedImageUrl = endedEmbedImage || existingConfig?.endedEmbedImage || null;

    if (req.files?.embedImage?.[0]) {
        const file = req.files.embedImage[0];
        try {
            activeImageUrl = await uploadToFreeImageHost(file.path, file.originalname, file.mimetype);
            await fs.promises.unlink(file.path).catch(() => null);
        } catch (error) {
            console.error('Failed remote upload for active image; using local fallback:', error.message);
            activeImageUrl = getLocalPublicUploadUrl(file.filename);
        }
    }

    if (req.files?.endedEmbedImage?.[0]) {
        const file = req.files.endedEmbedImage[0];
        try {
            endedImageUrl = await uploadToFreeImageHost(file.path, file.originalname, file.mimetype);
            await fs.promises.unlink(file.path).catch(() => null);
        } catch (error) {
            console.error('Failed remote upload for ended image; using local fallback:', error.message);
            endedImageUrl = getLocalPublicUploadUrl(file.filename);
        }
    }
    
    const updatedConfig = {
        giveawayType: resolvedGiveawayType,
        embedColor, 
        reactionEmoji, 
        embedTitle, 
        embedDescription,
        embedImage: activeImageUrl,
        endedEmbedImage: endedImageUrl,
        endedEmbedTitle: endedEmbedTitle || existingConfig?.endedEmbedTitle || '🎉 Giveaway Ended!',
        endedEmbedDescription: endedEmbedDescription || existingConfig?.endedEmbedDescription || 'Winner: {winners}\nPrize: {prize}',
        endBehavior: resolvedGiveawayType === 'button'
            ? ((endBehavior === 'remove' || endBehavior === 'disable') ? endBehavior : (existingConfig?.endBehavior || 'disable'))
            : 'disable',
        buttonName: buttonName || 'Join Giveaway',
        buttonEmoji: buttonEmoji || '🎉',
        buttonColor: buttonColor || 'primary'
    };
    
    await GuildConfig.updateOne(
        { guildId }, 
        updatedConfig, 
        { upsert: true }
    );

    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, config: updatedConfig });
    }
    
    res.redirect(`/dashboard/${guildId}/config`);
});

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

    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true });
    }

    res.redirect(`/dashboard/${guildId}/settings`);
});

router.get('/:guildId/create', async (req, res) => {
    const guildId = req.params.guildId;
    const guild = req.bot.guilds.cache.get(guildId);
    if (!guild) return res.redirect('/dashboard');

    const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name }));
    const channels = guild.channels.cache
        .filter(ch => ch.isDMBased() === false)
        .map(ch => ({ id: ch.id, name: ch.name }));

    const templates = await Template.find({ guildId });

    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
        config = new GuildConfig({ guildId });
        await config.save();
    }

    const serverEmojis = guild.emojis.cache.map(e => ({
        id: e.id,
        name: e.name,
        animated: e.animated,
        url: e.imageURL()
    }));

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

router.post('/:guildId/create', upload.fields([
    { name: 'embedImage', maxCount: 1 },
    { name: 'endedEmbedImage', maxCount: 1 }
]), async (req, res) => {
    const guildId = req.params.guildId;
    const { 
        prize, 
        duration, 
        channelId, 
        requiredRole, 
        winnersCount, 
        maxEntries,
        embedTitle,
        embedDescription,
        endedEmbedTitle,
        endedEmbedDescription,
        endBehavior
    } = req.body;
    
    const config = await GuildConfig.findOne({ guildId }) || {};

    let activeImageUrl = config.embedImage || null;
    let endedImageUrl = config.endedEmbedImage || null;
    
    if (req.files) {
        if (req.files['embedImage'] && req.files['embedImage'][0]) {
            const file = req.files['embedImage'][0];
            try {
                activeImageUrl = await uploadToFreeImageHost(file.path, file.originalname, file.mimetype);
                await fs.promises.unlink(file.path).catch(() => null);
            } catch (uploadErr) {
                console.error('Failed remote upload for active giveaway image; using local fallback:', uploadErr.message);
                activeImageUrl = getLocalPublicUploadUrl(file.filename);
            }
        }
        if (req.files['endedEmbedImage'] && req.files['endedEmbedImage'][0]) {
            const file = req.files['endedEmbedImage'][0];
            try {
                endedImageUrl = await uploadToFreeImageHost(file.path, file.originalname, file.mimetype);
                await fs.promises.unlink(file.path).catch(() => null);
            } catch (uploadErr) {
                console.error('Failed remote upload for ended giveaway image; using local fallback:', uploadErr.message);
                endedImageUrl = getLocalPublicUploadUrl(file.filename);
            }
        }
    }

    const endTime = new Date(Date.now() + parseInt(duration) * 60000);
    
    const { parseTemplate } = require('../utils/templateParser');

    const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

    const buttonStyleMap = {
        'primary': ButtonStyle.Primary,
        'success': ButtonStyle.Success,
        'danger': ButtonStyle.Danger,
        'secondary': ButtonStyle.Secondary
    };

    const templateData = {
        prize,
        userId: req.user.discordId,
        guildName: req.bot.guilds.cache.get(guildId)?.name || 'Server',
        endTime,
        winnersCount: parseInt(winnersCount) || 1
    };


    let descriptionTemplate = embedDescription || config.embedDescription || 'React to enter!';
    let description = parseTemplate(descriptionTemplate, templateData);












    if (!description.includes(prize) && !descriptionTemplate.includes('{prize}')) {
         description += `\n\n**Prize:** ${prize}`;
    }


    if (!descriptionTemplate.includes('{duration}') && !descriptionTemplate.includes('{endTime}')) {
         description += `\n**Ends:** <t:${Math.floor(endTime.getTime()/1000)}:R>`;
    }

    if (parseInt(winnersCount) > 1 && !descriptionTemplate.includes('{winners}')) {
        description += `\n**Winners:** ${winnersCount}`;
    }
    if (parseInt(maxEntries) > 0) {
        description += `\n**Max Entries:** ${maxEntries}`;
    }

    const title = parseTemplate(embedTitle || config.embedTitle || 'New Giveaway!', templateData);
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(config.embedColor || '#00FF00')
        .setThumbnail(null);

    if (requiredRole) {
        embed.addFields({ name: 'Requirement', value: `<@&${requiredRole}>` });
    }
    
    const attachmentFiles = [];
    if (activeImageUrl) {
        if (/^https?:\/\//i.test(activeImageUrl)) {
            embed.setImage(activeImageUrl);
        } else if (activeImageUrl.startsWith('/uploads/')) {
            const fileName = decodeURIComponent(activeImageUrl.replace('/uploads/', ''));
            embed.setImage(`attachment://${fileName}`);
            attachmentFiles.push({
                attachment: path.join(__dirname, '../public/uploads', fileName),
                name: fileName
            });
        }
    }

    try {
        const channel = await req.bot.channels.fetch(channelId);
        let message;

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
        
        const messageOptions = { embeds: [embed] };
        if (attachmentFiles.length > 0) {
            messageOptions.files = attachmentFiles;
        }
        
        if (config.giveawayType === 'button') {
            const joinBtn = new ButtonBuilder()
                .setCustomId('join_giveaway')
                .setLabel(config.buttonName || 'Enter Giveaway')
                .setStyle(buttonStyleMap[config.buttonColor] || ButtonStyle.Primary);

            if (config.buttonEmoji) {
                joinBtn.setEmoji(config.buttonEmoji);
            }

            const row = new ActionRowBuilder().addComponents(joinBtn);
            messageOptions.components = [row];
            message = await channel.send(messageOptions);
        } else {

            message = await channel.send(messageOptions);
            await message.react(config.reactionEmoji || '🎉');
        }

        const resolvedEndBehavior = config.giveawayType === 'button'
            ? ((endBehavior === 'remove' || endBehavior === 'disable') ? endBehavior : (config.endBehavior || 'disable'))
            : 'disable';

        const newGiveaway = new Giveaway({
            guildId,
            channelId,
            messageId: message.id,
            prize,
            winnersCount: parseInt(winnersCount) || 1,
            maxEntries: parseInt(maxEntries) || 0,
            endTime,
            hostId: req.user.discordId,
            requiredRole: requiredRole || null,

            embedTitle: embedTitle || config.embedTitle,
            embedDescription: embedDescription || config.embedDescription,
            embedImage: activeImageUrl,
            
            endedEmbedTitle: endedEmbedTitle || config.endedEmbedTitle,
            endedEmbedDescription: endedEmbedDescription || config.endedEmbedDescription,
            endedEmbedImage: endedImageUrl,
            endBehavior: resolvedEndBehavior
        });

        await newGiveaway.save();

        if (config.giveawayType === 'button') {
            try {
                const scopedJoinBtn = new ButtonBuilder()
                    .setCustomId(`join_giveaway:${message.id}`)
                    .setLabel(config.buttonName || 'Enter Giveaway')
                    .setStyle(buttonStyleMap[config.buttonColor] || ButtonStyle.Primary);

                if (config.buttonEmoji) {
                    scopedJoinBtn.setEmoji(config.buttonEmoji);
                }

                const scopedRow = new ActionRowBuilder().addComponents(scopedJoinBtn);
                await message.edit({ components: [scopedRow] });
            } catch (editError) {
                console.error('Failed to scope giveaway button customId:', editError.message);
            }
        }

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

router.delete('/:guildId/giveaway/:id', async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const giveawayId = req.params.id;

        const guild = req.bot.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const member = guild.members.cache.get(req.user.discordId);
        if (!member || (!member.permissions.has('Administrator') && guild.ownerId !== req.user.discordId)) {
            return res.status(403).json({ error: 'You do not have permission to delete this giveaway' });
        }

        const giveaway = await Giveaway.findByIdAndDelete(giveawayId);
        if (!giveaway) {
            return res.status(404).json({ error: 'Giveaway not found' });
        }

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

router.post('/:guildId/templates', upload.none(), async (req, res) => {
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

router.post('/:guildId/giveaway/:id/stop', async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const giveawayId = req.params.id;

        const guild = req.bot.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }

        const member = guild.members.cache.get(req.user.discordId);
        if (!member || (!member.permissions.has('Administrator') && guild.ownerId !== req.user.discordId)) {
            return res.status(403).json({ error: 'You do not have permission to stop this giveaway' });
        }

        const giveaway = await Giveaway.findById(giveawayId);
        if (!giveaway) {
            return res.status(404).json({ error: 'Giveaway not found' });
        }

        let winners = [];
        if (giveaway.entries.length > 0) {
            const winnerCount = Math.min(giveaway.winnersCount, giveaway.entries.length);
            const shuffled = [...giveaway.entries].sort(() => 0.5 - Math.random());
            winners = shuffled.slice(0, winnerCount);
        }

        giveaway.ended = true;
        giveaway.winners = winners;
        await giveaway.save();

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
