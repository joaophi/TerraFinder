import { Client, Intents } from "discord.js"
import format from "./format.js"
import getTxActions from "./format/index.js"

const client = new Client({ intents: [Intents.FLAGS.GUILDS] })
await client.login(process.env["DISCORD_TOKEN"])

export const notifyTx = async (tx, channelId) => {
    const channel = await client.channels.fetch(channelId)
    const embeds = {
        fields: [
            {
                name: "ACCOUNT",
                value: `[${tx.account}](https://finder.terra.money//mainnet/address/${tx.account})`,
            },
            {
                name: `VALUE ${tx.amountIn.length ? "RECEIVED" : "SENT"}`,
                value: `${format.amount(tx.totalAmount, 0)} UST`,
            },
            {
                name: "CRYPTOS TRADED",
                value: await getTxActions(tx.rawTx),
            },
            {
                name: tx.amountIn.length ? "RECEIVED FROM" : "SENT TO",
                value: tx.addresses.map(address => `[${address}](https://finder.terra.money/mainnet/address/${address})`).join("\n")
            },
            {
                name: "HASH",
                value: `[${tx.txHash}](https://finder.terra.money/mainnet/tx/${tx.txHash})`,
            },
        ],
        timestamp: new Date(tx.timestamp),
    };

    channel.send({ embeds: [embeds] });
}