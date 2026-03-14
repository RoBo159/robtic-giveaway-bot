# CheckBot Dashboard

![License](https://img.shields.io/github/license/RoBoDev/CheckBot)
![Node Version](https://img.shields.io/node/v/checkbot-dashboard)

A robust Discord Giveaway Bot featuring a comprehensive web dashboard for managing giveaways, customizing templates, and viewing real-time logs. Built with Node.js, Express, Discord.js, and MongoDB.

## Features

-   **Web Dashboard**: Intuitive interface for creating and managing giveaways.
-   **Custom Templates**: Define and reuse giveaway message templates.
-   **Role Integration**: User role management and permissions.
-   **Real-time Logs**: Track giveaway events and interactions.
-   **Discord OAuth2**: Secure login via Discord.
-   **Guild Configuration**: Per-guild settings managed through the database.
-   **Responsive Design**: Mobile-friendly dashboard using EJS templates.

## specific Project Structure

```
src/
├── bot.js          # Discord bot initialization and logic
├── data.js         # application specific global data/constants
├── index.js        # Express server entry point
├── models/         # Mongoose schemas (Giveaway, User, GuildConfig)
├── public/         # Static assets (CSS, JS)
├── routes/         # Express routes (Auth, Dashboard, API)
├── strategies/     # Passport authentication strategies
├── utils/          # Helper utilities (Template parser)
└── views/          # EJS templates for the dashboard
```

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v16.9.0 or higher recommended for Discord.js v14)
-   [MongoDB](https://www.mongodb.com/) (Local or Atlas)
-   Discord Application with Bot Token and OAuth2 Client ID/Secret

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/checkbot-dashboard.git
    cd checkbot-dashboard
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory based on the following template:

    ```env
    # Server Configuration
    PORT=3000
    
    # Database
    MONGODB_URI=mongodb://localhost:27017/checkbot

    # Discord Application Credentials
    DISCORD_CLIENT_ID=your_client_id
    DISCORD_CLIENT_SECRET=your_client_secret
    DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback
    
    # Discord Bot Token
    DISCORD_BOT_TOKEN=your_bot_token

    # Session Security
    SESSION_SECRET=your_session_secret_key
    ```

4.  **Run the application**
    
    Development mode (with nodemon):
    ```bash
    npm run dev
    ```

    Production mode:
    ```bash
    npm start
    ```

5.  **Access the Dashboard**
    Open your browser and navigate to `http://localhost:3000`.

## Usage

1.  **Login**: Use your Discord account to log in to the dashboard.
2.  **Select Guild**: Choose a server where you have administrative permissions.
3.  **Create Giveaway**: Navigate to the dashboard to set up a new giveaway.
4.  **Manage**: View active giveaways, end them early, or reroll winners directly from the web interface.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
