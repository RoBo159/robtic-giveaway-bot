const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String, default: null },
    guilds: { type: Array, required: true } // Storing basic guild info from Oauth
});

module.exports = mongoose.model('User', UserSchema);
