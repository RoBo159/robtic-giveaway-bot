const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    giveawayType: { type: String, enum: ['reaction', 'button'], default: 'reaction' },
    embedColor: { type: String, default: '#0057ff' },
    reactionEmoji: { type: String, default: '🎉' },
    embedTitle: { type: String, default: 'New Giveaway!' },
    embedDescription: { type: String, default: 'React to enter!' },
    embedImage: { type: String, default: null },
    
    // Button Configuration
    buttonName: { type: String, default: 'Enter Giveaway' },
    buttonEmoji: { type: String, default: '🎁' },
    buttonColor: { type: String, enum: ['primary', 'success', 'danger', 'secondary'], default: 'primary' },
    
    // Mention Settings
    mentionEnabled: { type: Boolean, default: false },
    mentionType: { type: String, enum: ['everyone', 'here', 'role'], default: 'everyone' },
    mentionRoleId: { type: String, default: null },
    
    // Settings
    dmWinners: { type: Boolean, default: true },
    dmWinnersMessage: { type: String, default: 'Congratulations! You won {prize}!' },
    autoDeleteEndedGiveaways: { type: Boolean, default: false },
    joinMessage: { type: String, default: 'You have entered the giveaway!' },
    alreadyInGiveawayMessage: { type: String, default: 'You are already in this giveaway!' },
    endedGiveawayMessage: { type: String, default: '🎉 Congratulations {user}! You won **{prize}**!' },
    loggingChannelId: { type: String, default: null },
    enableLogging: { type: Boolean, default: false },
    
    // Ended Embed Customization
    endedEmbedTitle: { type: String, default: '🎉 Giveaway Ended!' },
    endedEmbedDescription: { type: String, default: 'Winner: {winners}\nPrize: {prize}' },
    endedEmbedColor: { type: String, default: '#808080' },
    endedEmbedImage: { type: String, default: null }
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);

