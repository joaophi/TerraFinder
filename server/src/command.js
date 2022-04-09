import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v9"
import { SlashCommandBuilder } from "@discordjs/builders"

export const commands = async (db, discord) => {
    const commands = [
        new SlashCommandBuilder()
            .setName("watch")
            .setDescription("Add address to channel watchlist")
            .addStringOption(option =>
                option.setName("address")
                    .setDescription("The address to watch")
                    .setRequired(true)
            )
            .addNumberOption(option =>
                option.setName("minimum")
                    .setDescription("The minimum amount to notify")
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName("unwatch")
            .setDescription("Remove address from channel watchlist")
            .addStringOption(option =>
                option.setName("address")
                    .setDescription("The address to unwatch")
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName("watchlist")
            .setDescription("Show channel watchlist"),
    ].map(command => command.toJSON());

    const rest = new REST({ version: '9' }).setToken(process.env["DISCORD_TOKEN"]);

    rest.put(Routes.applicationGuildCommands("960307902453784606", "959199128259285093"), { body: commands })
        .then(() => console.log('Successfully registered application commands.'))
        .catch(console.error)

    discord.on("interactionCreate", async (interaction) => {
        if (!interaction.isCommand())
            return

        const { commandName } = interaction

        if (commandName == "watch") {
            await watchCommand(db, interaction)
        } else if (commandName == "unwatch") {
            await unwatchCommand(db, interaction)
        } else if (commandName == "watchlist") {
            await watchListCommand(db, interaction)
        }
    })
}

const watchCommand = async (db, interaction) => {
    const address = interaction.options.getString("address")
    const minimum = interaction.options.getNumber("minimum")
    await db.run(
        `INSERT OR REPLACE INTO watch (address, channel, minimum, type)
         VALUES ($address, $channel, $minimum, 'swap')`,
        {
            $address: address,
            $channel: interaction.channelId,
            $minimum: minimum
        }
    )
    await interaction.reply(`ADDED ${address} - ${minimum} UST`)
}

const unwatchCommand = async (db, interaction) => {
    const address = interaction.options.getString("address")
    await db.run(
        `DELETE FROM watch
         WHERE address = $address
           AND channel = $channel`,
        {
            $address: address,
            $channel: interaction.channelId,
        }
    )
    await interaction.reply(`REMOVED ${address}`)
}

const watchListCommand = async (db, interaction) => {
    const watches = await db.all(
        `SELECT address, minimum
         FROM watch
         WHERE channel = $channel`,
        {
            $channel: interaction.channelId,
        }
    )
    const reply = watches
        .map(({ address, minimum }) => `${address} - ${minimum} UST`)
        .join("\n")
    await interaction.reply(reply || "None")
}