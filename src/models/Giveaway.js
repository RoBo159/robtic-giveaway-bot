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
    
    ended: { type: Boolean, default: false },
    entries: [{ type: String }], // User IDs
    winners: [{ type: String }] // Winner IDs
});

module.exports = mongoose.model('Giveaway', GiveawaySchema);
