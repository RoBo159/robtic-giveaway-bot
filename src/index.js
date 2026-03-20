require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const passport = require('passport');
const path = require('path');
const pkg = require('../package.json');
const { client: bot, logGiveawayEvent } = require('./bot');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard'); // Will create this next
const indexRoutes = require('./routes/index'); // Home page

const app = express();
const PORT = process.env.PORT || 3000;
const ASSET_VERSION = process.env.ASSET_VERSION || pkg.version;
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error(err));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use((req, res, next) => {
    res.locals.assetVersion = ASSET_VERSION;
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 14 * 24 * 60 * 60, // 14 days
        autoRemove: 'native'
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 14 // 14 days
    }
}));
require('./strategies/discord');
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    req.bot = bot;
    req.logGiveawayEvent = logGiveawayEvent;
    next();
});
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/', indexRoutes);
app.use((req, res, next) => {
    res.status(404).render('error', { 
        message: 'Page Not Found',
        error: {}
    });
});
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error', { 
        message: 'Internal Server Error',
        error: err
    });
});
bot.login(process.env.DISCORD_BOT_TOKEN);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
