const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    name: { type: String, required: true },
    prize: { type: String, required: true },
    duration: { type: Number, default: 60 }, // in minutes
    winnersCount: { type: Number, default: 1 },
    maxEntries: { type: Number, default: 0 },
    channelId: { type: String, default: '' },
    requiredRole: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Template', TemplateSchema);
