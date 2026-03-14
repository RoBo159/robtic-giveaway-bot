const { Client, GatewayIntentBits, Partials } = require("discord.js");
const mongoose = require("mongoose");
const Giveaway = require("./models/Giveaway");
const GuildConfig = require("./models/GuildConfig");
const { parseTemplate } = require("./utils/templateParser");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// Handle Buttons
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId === "join_giveaway") {
    const giveaway = await Giveaway.findOne({
      messageId: interaction.message.id,
    });
    if (!giveaway || giveaway.ended)
      return interaction.reply({
        content: "This giveaway is over or invalid.",
        ephemeral: true,
      });

    // Get guild config for custom messages
    const guildConfig =
      (await GuildConfig.findOne({ guildId: giveaway.guildId })) || {};
    const templateData = {
      userId: interaction.user.id,
      prize: giveaway.prize,
      guildName: interaction.guild.name,
      endTime: giveaway.endTime,
      winnersCount: giveaway.winnersCount,
    };

    // Check DB entries
    if (giveaway.entries.includes(interaction.user.id)) {
      const alreadyMessage = parseTemplate(
        guildConfig.alreadyInGiveawayMessage ||
          "You are already in this giveaway!",
        templateData,
      );
      return interaction.reply({ content: alreadyMessage, ephemeral: true });
    }

    // Check Max Entries
    if (
      giveaway.maxEntries > 0 &&
      giveaway.entries.length >= giveaway.maxEntries
    ) {
      return interaction.reply({
        content: "This giveaway has reached the maximum number of entries!",
        ephemeral: true,
      });
    }

    // Check Role Requirement
    if (giveaway.requiredRole) {
      if (!interaction.member.roles.cache.has(giveaway.requiredRole)) {
        return interaction.reply({
          content: "You do not have the required role to enter.",
          ephemeral: true,
        });
      }
    }

    giveaway.entries.push(interaction.user.id);
    await giveaway.save();

    // Send join message using template
    const joinMessage = guildConfig.joinMessage
      ? parseTemplate(guildConfig.joinMessage, templateData)
      : "You have entered the giveaway!";

    await interaction.reply({ content: joinMessage, ephemeral: true });

    // Log giveaway entry if logging enabled
    await logGiveawayEvent(giveaway.guildId, "entry", {
      userId: interaction.user.id,
      prize: giveaway.prize,
      guildName: interaction.guild.name,
    });
  }
});

// Handle Reactions
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Something went wrong when fetching the message:", error);
      return;
    }
  }

  const giveaway = await Giveaway.findOne({ messageId: reaction.message.id });
  if (!giveaway || giveaway.ended) return;

  if (!giveaway.entries.includes(user.id)) {
    // Check Max Entries
    if (
      giveaway.maxEntries > 0 &&
      giveaway.entries.length >= giveaway.maxEntries
    ) {
      // Remove reaction if full
      reaction.users.remove(user.id);
      return;
    }

    // Basic check, might need to fetch member for role check
    // Check Role if configured
    if (giveaway.requiredRole) {
      const guild = reaction.message.guild;
      try {
        const member = await guild.members.fetch(user.id);
        if (!member.roles.cache.has(giveaway.requiredRole)) {
          // Can't really reply to reaction add easily without DM, just ignore or remove reaction
          reaction.users.remove(user.id);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    giveaway.entries.push(user.id);
    await giveaway.save();

    // Log giveaway entry
    await logGiveawayEvent(giveaway.guildId, "entry", {
      userId: user.id,
      prize: giveaway.prize,
      guildName: reaction.message.guild.name,
    });
  }
});

// Giveaway Checker Interval (Runs every 10 seconds)
setInterval(async () => {
  try {
    const endedGiveaways = await Giveaway.find({
      ended: false,
      endTime: { $lt: new Date() },
    });

    for (const giveaway of endedGiveaways) {
      await endGiveaway(giveaway);
    }
  } catch (err) {
    console.error("Error in giveaway interval:", err);
  }
}, 10 * 1000);

async function endGiveaway(giveaway) {
  try {
    giveaway.ended = true;

    // Pick Winners
    // Filter out bot IDs if any sneaked in, though we check on entry
    const entries = giveaway.entries;
    const winnersCount = giveaway.winnersCount || 1;

    let winners = [];
    if (entries.length > 0) {
      // Shuffle
      const shuffled = entries.sort(() => 0.5 - Math.random());
      winners = shuffled.slice(0, winnersCount);
    }

    giveaway.winners = winners;
    await giveaway.save();

    // Notify Discord
    try {
      const guild = await client.guilds.fetch(giveaway.guildId);
      const channel = await guild.channels.fetch(giveaway.channelId);

      // Get guild config for all settings
      const guildConfig =
        (await GuildConfig.findOne({ guildId: giveaway.guildId })) || {};

      let giveawayMessage = null;

      // Fetch original message to edit it (mark as ended)
      try {
        giveawayMessage = await channel.messages.fetch(giveaway.messageId);
        const { EmbedBuilder } = require("discord.js");

        const oldEmbed = giveawayMessage.embeds[0];
        const newEmbed = new EmbedBuilder(oldEmbed.data)
          .setColor("#2F3136") // Dark/Ended color
          .setTitle(giveaway.endedEmbedTitle || "🎉 Giveaway Ended!")
          .setDescription(
            parseTemplate(giveaway.endedEmbedDescription || "Winner: {winners}\nPrize: {prize}", {
              prize: giveaway.prize,
              winners: winners.length > 0 ? winners.map((w) => `<@${w}>`).join(", ") : "No winners",
            }),
          );

        // Disable components/buttons
        const {
          ActionRowBuilder,
          ButtonBuilder,
          ButtonStyle,
        } = require("discord.js");
        if (giveawayMessage.components.length > 0) {
          const oldRow = giveawayMessage.components[0];
          const newComponents = oldRow.components.map((c) =>
            ButtonBuilder.from(c).setDisabled(true),
          );
          const newRow = new ActionRowBuilder().addComponents(newComponents);
          await giveawayMessage.edit({
            embeds: [newEmbed],
            components: [newRow],
          });
        } else {
          await giveawayMessage.edit({ embeds: [newEmbed] });
        }
      } catch (e) {
        console.log("Could not update original message", e);
      }

      // Send New Message
      if (winners.length > 0) {
        // Use custom ended giveaway message with template parsing
        const templateData = {
          prize: giveaway.prize,
          guildName: guild.name,
          endTime: giveaway.endTime,
          winnersCount: giveaway.winnersCount,
        };

        // Send ended message for each winner (or combined)
        const endedMessageTemplate =
          guildConfig.endedGiveawayMessage ||
          "🎉 Congratulations {user}! You won **{prize}**!";
        const winnerMentions = winners.map((w) => `<@${w}>`).join(", ");
        const endedMessage = parseTemplate(endedMessageTemplate, {
          ...templateData,
          userId: winners[0],
        }).replace(/{user}/gi, winnerMentions); // Replace {user} with all winner mentions

        await channel.send(endedMessage);

        // DM Winners if enabled in guild config
        if (guildConfig.dmWinners) {
          for (const winnerId of winners) {
            try {
              const user = await client.users.fetch(winnerId);
              const dmMessage = parseTemplate(
                guildConfig.dmWinnersMessage ||
                  "Congratulations! You won {prize}!",
                { ...templateData, userId: winnerId },
              );
              await user.send(`🎉 ${dmMessage}\n\n*From: ${guild.name}*`);
            } catch (dmErr) {
              // Handle cases where user has DMs closed
              if (dmErr.code === 50007) {
                console.log(
                  `Cannot DM winner ${winnerId}: User has DMs disabled`,
                );
              } else {
                console.log(`Could not DM winner ${winnerId}:`, dmErr.message);
              }
            }
          }
        }

        // Log giveaway end
        await logGiveawayEvent(giveaway.guildId, "end", {
          prize: giveaway.prize,
          guildName: guild.name,
          winners: winners,
        });
      } else {
        await channel.send(
          `Giveaway for **${giveaway.prize}** ended, but no one entered!`,
        );

        // Log giveaway end with no winners
        await logGiveawayEvent(giveaway.guildId, "end", {
          prize: giveaway.prize,
          guildName: guild.name,
          winners: [],
        });
      }

      // Auto-delete original giveaway message if enabled
      if (guildConfig.autoDeleteEndedGiveaways && giveawayMessage) {
        try {
          // Wait 10 seconds before deleting so users can see the result
          setTimeout(async () => {
            try {
              await giveawayMessage.delete();
            } catch (deleteErr) {
              console.log(
                "Could not auto-delete giveaway message:",
                deleteErr.message,
              );
            }
          }, 10000);
        } catch (e) {
          console.log("Error scheduling message deletion:", e.message);
        }
      }
    } catch (err) {
      console.error(`Failed to handle end of giveaway ${giveaway._id}:`, err);
    }
  } catch (err) {
    console.error("Error ending giveaway:", err);
  }
}

/**
 * Log giveaway events to the configured logging channel
 * @param {string} guildId - Guild ID
 * @param {string} eventType - Event type: 'entry', 'end', 'create'
 * @param {object} data - Event data
 */
async function logGiveawayEvent(guildId, eventType, data) {
  try {
    const guildConfig = await GuildConfig.findOne({ guildId });

    // Check if logging is enabled and channel is set
    if (
      !guildConfig ||
      !guildConfig.enableLogging ||
      !guildConfig.loggingChannelId
    ) {
      return;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const logChannel = guild.channels.cache.get(guildConfig.loggingChannelId);
    if (!logChannel) return;

    const { EmbedBuilder } = require("discord.js");
    let embed;

    switch (eventType) {
      case "entry":
        embed = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("📥 Giveaway Entry")
          .setDescription(
            `<@${data.userId}> entered the giveaway for **${data.prize}**`,
          )
          .setTimestamp();
        break;

      case "end":
        embed = new EmbedBuilder()
          .setColor("#FF6B6B")
          .setTitle("🏆 Giveaway Ended")
          .setDescription(
            `**Prize:** ${data.prize}\n**Winners:** ${data.winners.length > 0 ? data.winners.map((w) => `<@${w}>`).join(", ") : "No winners"}`,
          )
          .setTimestamp();
        break;

      case "create":
        embed = new EmbedBuilder()
          .setColor("#7289DA")
          .setTitle("🎉 Giveaway Created")
          .setDescription(
            `**Prize:** ${data.prize}\n**Ends:** <t:${Math.floor(data.endTime.getTime() / 1000)}:R>`,
          )
          .setTimestamp();
        break;

      default:
        return;
    }

    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Failed to log giveaway event:", err.message);
  }
}

module.exports = { client, logGiveawayEvent };
