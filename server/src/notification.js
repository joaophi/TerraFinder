import axios from "axios"
import { Client, Intents } from "discord.js"
import { isOneSided, parseTx } from "./amount.js"
import format from "./format.js"

const TIMEOUT = (parseInt(process.env["TIMEOUT_MIN"]) || 5) * 60 * 1000

const sleep = ms => new Promise(r => setTimeout(r, ms))

const getPrices = async (...denom) => {
    const terraSwapApi = axios.create({ baseURL: "https://api.terraswap.io/dashboard/" })
    const { data: unfilteredPairs } = await terraSwapApi.get("/pairs")
    const pairs = unfilteredPairs.filter(pair => pair.token1Volume > 0)
    pairs.sort((a, b) => b.volumeUst - a.volumeUst)
    const prices = new Map()
    for (let index = 0; index < denom.length; index++) {
        const symbol = denom[index];
        let token = "token1"
        let pair = pairs.find(pair => pair.pairAlias.toUpperCase() == `UST-${symbol}`.toUpperCase())
        if (!pair) {
            token = "token0"
            pair = pairs.find(pair => pair.pairAlias.toUpperCase() == `${symbol}-UST`.toUpperCase())
        }

        try {
            const { data } = await terraSwapApi.get(`/pairs/${pair.pairAddress}`)
            prices.set(symbol, parseFloat(data[token].price))
        } catch (error) {
            console.error(`${symbol}-${error.message}`)
        }
    }
    return prices
}

export const configureNotifications = async (fcdApi, labels) => {
    const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
    await client.login(process.env["DISCORD_TOKEN"])

    const channel5k = await client.channels.fetch("959199202712354826");
    const channel1m = await client.channels.fetch("959199272774033408");

    while (true) {
        // FILTER TX TO PROCESS
        const promises = Array.from(labels)
            .map(async ([account, { label, last }]) => {
                // GET TX
                try {
                    const response = await fcdApi.get("/v1/txs", { params: { account, limit: 100 } })
                    labels.get(account).last = response.data.txs?.[0]?.id ?? last
                    return response.data.txs
                        .filter(tx => last && tx.id > last)
                        .map(tx => { return { ...parseTx(tx, account), id: tx.id, label, account } })
                        .filter(isOneSided)
                } catch (error) {
                    console.error(error.message)
                    return []
                }
            })

        const toProcess = (await Promise.all(promises)).flatMap(it => it)

        // UPDATE VALUES
        const prices = await getPrices(...new Set(
            toProcess
                .flatMap(({ amountIn, amountOut }) => [...amountIn, ...amountOut])
                .map(({ denom }) => denom)
        ))

        // SEND NOTIFICATION
        const addUsd = ({ amount, denom }) => { return { amount, denom, usd: parseFloat(amount.replace(",", "")) * (prices.has(denom) ? prices.get(denom) : 0) } }
        toProcess
            .map(tx => {
                const amountIn = tx.amountIn.map(addUsd)
                const amountOut = tx.amountOut.map(addUsd)
                const totalAmount = [...amountIn, ...amountOut]
                    .map(a => a.usd)
                    .reduce((a, b) => a + b, 0)
                return {
                    ...tx,
                    amountIn,
                    amountOut,
                    totalAmount
                }
            })
            .forEach(tx => {
                const embeds = {
                    fields: [
                        {
                            name: "ACCOUNT",
                            value: `[${tx.label} - ${tx.account}](http://152.67.40.111:23869/mainnet/address/${tx.account})`,
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
                    timestamp: new Date(),
                };

                if (tx.totalAmount > 1000000) {
                    channel1m.send({ embeds: [embeds] });
                } else if (tx.totalAmount > 5000) {
                    channel5k.send({ embeds: [embeds] });
                }
            })

        await sleep(TIMEOUT)
    }
}
