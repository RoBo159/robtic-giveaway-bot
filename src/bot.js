const { Client, GatewayIntentBits, Partials } = require("discord.js");
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

const processedInteractionIds = new Map();

function markInteractionProcessed(interactionId) {
  processedInteractionIds.set(interactionId, Date.now());
  setTimeout(() => {
    processedInteractionIds.delete(interactionId);
  }, 5 * 60 * 1000);
}

client.once("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

async function safeInteractionRespond(interaction, content) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content });
      return;
    }

    await interaction.reply({
      content,
      flags: 64,
    });
  } catch (err) {
    if (err?.code === 10062 || err?.code === 40060) {
      return;
    }
    throw err;
  }
}

async function findActiveGiveawayByMessageIds(messageIds) {
  const attempts = 6;
  const delayMs = 350;

  for (let i = 0; i < attempts; i += 1) {
    const giveaway = await Giveaway.findOne({
      messageId: { $in: messageIds },
      ended: false,
    }).sort({ _id: -1 });

    if (giveaway) return giveaway;
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId.startsWith("join_giveaway")) {
    if (processedInteractionIds.has(interaction.id)) {
      return;
    }
    markInteractionProcessed(interaction.id);

    try {
      if (!interaction.deferred && !interaction.replied) {
        try {
          await interaction.deferReply({ flags: 64 });
        } catch (ackErr) {
          if (ackErr?.code !== 10062 && ackErr?.code !== 40060) {
            throw ackErr;
          }
        }
      }

      const customMessageId = interaction.customId.includes(":")
        ? interaction.customId.split(":")[1]
        : null;
      const candidateMessageIds = [interaction.message.id];
      if (customMessageId) {
        candidateMessageIds.unshift(customMessageId);
      }

      const giveaway = await findActiveGiveawayByMessageIds(candidateMessageIds);

      if (!giveaway)
        return safeInteractionRespond(
          interaction,
          "This giveaway is over or invalid.",
        );

      const guildConfig =
        (await GuildConfig.findOne({ guildId: giveaway.guildId })) || {};
      const templateData = {
        userId: interaction.user.id,
        prize: giveaway.prize,
        guildName: interaction.guild.name,
        endTime: giveaway.endTime,
        winnersCount: giveaway.winnersCount,
      };

      if (giveaway.entries.includes(interaction.user.id)) {
        const alreadyMessage = parseTemplate(
          guildConfig.alreadyInGiveawayMessage ||
            "You are already in this giveaway!",
          templateData,
        );
        return safeInteractionRespond(interaction, alreadyMessage);
      }

      if (
        giveaway.maxEntries > 0 &&
        giveaway.entries.length >= giveaway.maxEntries
      ) {
        return safeInteractionRespond(
          interaction,
          "This giveaway has reached the maximum number of entries!",
        );
      }

      if (giveaway.requiredRole) {
        const guild = interaction.guild;
        if (!guild) {
          return safeInteractionRespond(
            interaction,
            "This giveaway is over or invalid.",
          );
        }

        const member =
          interaction.member && interaction.member.roles
            ? interaction.member
            : await guild.members.fetch(interaction.user.id).catch(() => null);

        if (!member || !member.roles?.cache?.has(giveaway.requiredRole)) {
          return safeInteractionRespond(
            interaction,
            "You do not have the required role to enter.",
          );
        }
      }

      const entryFilter = {
        _id: giveaway._id,
        ended: false,
        entries: { $ne: interaction.user.id },
      };

      if (giveaway.maxEntries > 0) {
        entryFilter.$expr = {
          $lt: [{ $size: "$entries" }, giveaway.maxEntries],
        };
      }

      const updatedGiveaway = await Giveaway.findOneAndUpdate(
        entryFilter,
        { $addToSet: { entries: interaction.user.id } },
        { new: true },
      );

      if (!updatedGiveaway) {
        const latestGiveaway = await Giveaway.findById(giveaway._id);
        if (!latestGiveaway || latestGiveaway.ended) {
          return safeInteractionRespond(
            interaction,
            "This giveaway is over or invalid.",
          );
        }

        if (latestGiveaway.entries.includes(interaction.user.id)) {
          const alreadyMessage = parseTemplate(
            guildConfig.alreadyInGiveawayMessage ||
              "You are already in this giveaway!",
            templateData,
          );
          return safeInteractionRespond(interaction, alreadyMessage);
        }

        if (
          latestGiveaway.maxEntries > 0 &&
          latestGiveaway.entries.length >= latestGiveaway.maxEntries
        ) {
          return safeInteractionRespond(
            interaction,
            "This giveaway has reached the maximum number of entries!",
          );
        }

        return safeInteractionRespond(
          interaction,
          "Could not enter giveaway. Please try again.",
        );
      }

      const joinMessage = guildConfig.joinMessage
        ? parseTemplate(guildConfig.joinMessage, templateData)
        : "You have entered the giveaway!";

      await safeInteractionRespond(interaction, joinMessage);

      await logGiveawayEvent(giveaway.guildId, "entry", {
        userId: interaction.user.id,
        prize: giveaway.prize,
        guildName: interaction.guild.name,
      });
    } catch (err) {
      if (err?.code === 10062 || err?.code === 40060) {
        return;
      }
      console.error("Error handling join_giveaway interaction:", err);
    }
  }
});

client.on("error", (err) => {
  console.error("Discord client error:", err);
});

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
    if (
      giveaway.maxEntries > 0 &&
      giveaway.entries.length >= giveaway.maxEntries
    ) {
      reaction.users.remove(user.id);
      return;
    }

    if (giveaway.requiredRole) {
      const guild = reaction.message.guild;
      try {
        const member = await guild.members.fetch(user.id);
        if (!member.roles.cache.has(giveaway.requiredRole)) {
          reaction.users.remove(user.id);
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    giveaway.entries.push(user.id);
    await giveaway.save();

    await logGiveawayEvent(giveaway.guildId, "entry", {
      userId: user.id,
      prize: giveaway.prize,
      guildName: reaction.message.guild.name,
    });
  }
});

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

    const entries = giveaway.entries;
    const winnersCount = giveaway.winnersCount || 1;

    let winners = [];
    if (entries.length > 0) {
      const shuffled = entries.sort(() => 0.5 - Math.random());
      winners = shuffled.slice(0, winnersCount);
    }

    giveaway.winners = winners;
    await giveaway.save();

    try {
      const guild = await client.guilds.fetch(giveaway.guildId);
      const channel = await guild.channels.fetch(giveaway.channelId);

      const guildConfig =
        (await GuildConfig.findOne({ guildId: giveaway.guildId })) || {};

      let giveawayMessage = null;

      try {
        giveawayMessage = await channel.messages.fetch(giveaway.messageId);
        const {
          EmbedBuilder,
          ButtonBuilder,
          ActionRowBuilder,
        } = require("discord.js");
        const path = require("path");

        const winnerMentions =
          winners.length > 0
            ? winners.map((w) => `<@${w}>`).join(", ")
            : "No winners";
        const templateData = {
          prize: giveaway.prize,
          winners: winnerMentions,
          count: winners.length,
          winnersCount: giveaway.winnersCount,
          guildName: guild.name,
          endTime: giveaway.endTime,
        };

        const endedTitle = parseTemplate(
          giveaway.endedEmbedTitle ||
            guildConfig.endedEmbedTitle ||
            "🎉 Giveaway Ended!",
          templateData,
        );
        const endedDescription = parseTemplate(
          giveaway.endedEmbedDescription ||
            guildConfig.endedEmbedDescription ||
            "Winner: {winners}\nPrize: {prize}",
          templateData,
        );
        const endedColor =
          giveaway.endedEmbedColor || guildConfig.endedEmbedColor || "#2F3136";

        const newEmbed = new EmbedBuilder(giveawayMessage.embeds[0].data)
          .setColor(endedColor)
          .setTitle(endedTitle)
          .setDescription(endedDescription)
          .setThumbnail(null);

        let files = [];

        if (giveaway.endedEmbedImage) {
          if (/^https?:\/\//i.test(giveaway.endedEmbedImage)) {
            newEmbed.setImage(giveaway.endedEmbedImage);
          } else {
            const fileName = giveaway.endedEmbedImage.startsWith("/uploads/")
              ? decodeURIComponent(
                  giveaway.endedEmbedImage.replace("/uploads/", ""),
                )
              : giveaway.endedEmbedImage;
            const imagePath = path.join(__dirname, "public/uploads", fileName);
            files.push({
              attachment: imagePath,
              name: fileName,
            });
            newEmbed.setImage(`attachment://${fileName}`);
          }
        } else {
          newEmbed.setImage(null);
        }

        const endBehavior =
          giveaway.endBehavior === "remove" ? "remove" : "disable";
        let components = [];

        if (giveawayMessage.components.length > 0) {
          if (endBehavior === "disable") {
            const oldRow = giveawayMessage.components[0];
            const newComponents = oldRow.components.map((c) =>
              ButtonBuilder.from(c).setDisabled(true),
            );
            components = [new ActionRowBuilder().addComponents(newComponents)];
          }
        }

        await giveawayMessage.edit({
          embeds: [newEmbed],
          components: components,
          files: files.length > 0 ? files : [],
        });
      } catch (e) {
        console.log("Could not update original message", e);
      }

      if (winners.length > 0) {
        const templateData = {
          prize: giveaway.prize,
          guildName: guild.name,
          endTime: giveaway.endTime,
          winnersCount: giveaway.winnersCount,
        };

        const endedMessageTemplate =
          guildConfig.endedGiveawayMessage ||
          "🎉 Congratulations {user}! You won **{prize}**!";
        const winnerMentions = winners.map((w) => `<@${w}>`).join(", ");
        const endedMessage = parseTemplate(endedMessageTemplate, {
          ...templateData,
          userId: winners[0],
        }).replace(/{user}/gi, winnerMentions); // Replace {user} with all winner mentions

        await channel.send(endedMessage);

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

        await logGiveawayEvent(giveaway.guildId, "end", {
          prize: giveaway.prize,
          guildName: guild.name,
          winners: winners,
        });
      } else {
        await channel.send(
          `Giveaway for **${giveaway.prize}** ended, but no one entered!`,
        );

        await logGiveawayEvent(giveaway.guildId, "end", {
          prize: giveaway.prize,
          guildName: guild.name,
          winners: [],
        });
      }

      if (guildConfig.autoDeleteEndedGiveaways && giveawayMessage) {
        try {
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

async function logGiveawayEvent(guildId, eventType, data) {
  try {
    const guildConfig = await GuildConfig.findOne({ guildId });

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
