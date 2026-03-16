const mongoose = require('mongoose');

const GiveawaySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String }, // To track the message in Discord
    prize: { type: String, required: true },
    winnersCount: { type: Number, default: 1 },
    maxEntries: { type: Number, default: 0 }, // 0 means infinite
    endTime: { type: Date, required: true },
    hostId: { type: String, required: true },
    
    // Conditions / Targets
    requiredRole: { type: String, default: null }, // Role ID
    
    // Embed Configuration
    embedTitle: { type: String },
    embedDescription: { type: String },
    embedColor: { type: String },
    embedImage: { type: String }, // Path or URL to image
    thumbnail: { type: String },

    // Ended Embed Configuration
    endedEmbedTitle: { type: String, default: '🎉 Giveaway Ended!' },
    endedEmbedDescription: { type: String, default: 'Winner: {winners}\nPrize: {prize}' },
    endedEmbedColor: { type: String, default: '#2F3136' },
    endedEmbedImage: { type: String },
    
    // End Behavior
    endBehavior: { type: String, enum: ['disable', 'remove', 'keep'], default: 'disable' }, // What to do with buttons

    ended: { type: Boolean, default: false },
    entries: [{ type: String }], // User IDs
    winners: [{ type: String }] // Winner IDs
});

module.exports = mongoose.model('Giveaway', GiveawaySchema);
