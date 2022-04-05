import { Client, Intents } from "discord.js"
import format from "./format.js"

const client = new Client({ intents: [Intents.FLAGS.GUILDS] })
await client.login(process.env["DISCORD_TOKEN"])

export const notifyTx = async (tx, channelId) => {
    const channel = await client.channels.fetch(channelId)
    const embeds = {
        fields: [
            {
                name: "ACCOUNT",
                value: `[${tx.account}](http://152.67.40.111:23869/mainnet/address/${tx.account})`,
            },
            {
                name: `VALUE ${tx.amountIn.length ? "RECEIVED" : "SENT"}`,
                value: `${format.amount(tx.totalAmount, 0)} UST`,
            },
            {
                name: "CRYPTOS TRADED",
                value: `${[...tx.amountIn, ...tx.amountOut].map(({ amount, denom }) => `${amount} ${denom}`).join(" - ")}`,
            },
            {
                name: tx.amountIn.length ? "RECEIVED FROM" : "SENT TO",
                value: tx.addresses.map(address => `[${address}](http://152.67.40.111:23869/mainnet/address/${address})`).join("\n")
            },
            {
                name: "HASH",
                value: `[${tx.txHash}](http://152.67.40.111:23869/mainnet/tx/${tx.txHash})`,
            },
        ],
        timestamp: new Date(tx.timestamp),
    };

    channel.send({ embeds: [embeds] });
}