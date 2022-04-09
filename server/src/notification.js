import { Client, Intents } from "discord.js"
import format from "./format.js"
import { sleep } from "./utils.js"

export const notify = async (db) => {
    const client = new Client({ intents: [Intents.FLAGS.GUILDS] })
    await client.login(process.env["DISCORD_TOKEN"])

    while (true) {
        const txs = await db.all("SELECT id, address, hash, tx.amount, addresses, actions, timestamp, W.channel FROM tx INNER JOIN watch W ON W.account = TX.address WHERE notify = 1 ORDER BY id")

        const promises = txs.map(async tx => {
            const channel = client.channels.cache.get(tx.channel) ?? await client.channels.fetch(tx.channel)
            try {
                await notifyTx(channel, tx)
                console.log("notify tx %d: channel %s", tx.id, tx.channel)
                await db.run("UPDATE tx SET notify = 2 WHERE id = $id", {
                    $id: tx.id
                })
            } catch (error) {
                console.error("notify tx %d: error %s", tx.id, error.message)
            }
        })

        await Promise.all(promises)

        await sleep(10000)
    }
}

const notifyTx = async (channel, tx) => {
    const embeds = {
        fields: [
            {
                name: "ACCOUNT",
                value: `[${tx.address}](https://finder.terra.money/mainnet/address/${tx.address})`,
            },
            {
                name: "VALUE",
                value: `${format.amount(tx.amount, 0)} UST`,
            },
            {
                name: "ACTIONS",
                value: tx.actions,
            },
            {
                name: "ADDRESSES",
                value: tx.addresses
            },
            {
                name: "HASH",
                value: `[${tx.hash}](https://finder.terra.money/mainnet/tx/${tx.hash})`,
            },
            {
                name: "TIME",
                value: format.date(tx.timestamp),
            }
        ]
    }

    channel.send({ embeds: [embeds] })
}