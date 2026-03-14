const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
    done(null, user.discordId);
});

passport.deserializeUser(async (discordId, done) => {
    try {
        const user = await User.findOne({ discordId });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ discordId: profile.id });
        if (user) {
            // Update guilds and avatar
            user.username = profile.username;
            user.avatar = profile.avatar;
            user.guilds = profile.guilds;
            await user.save();
        } else {
            user = await User.create({
                discordId: profile.id,
                username: profile.username,
                avatar: profile.avatar,
                guilds: profile.guilds
            });
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
}));
