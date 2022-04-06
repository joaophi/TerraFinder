import axios from "axios"
import { notifyTx } from "./discord.js"
import { isOneSided, parseTx } from "./amount.js"
import rateLimit from "axios-rate-limit"

const TIMEOUT = (parseInt(process.env["TIMEOUT_MIN"]) || 5) * 60 * 1000

const sleep = ms => new Promise(r => setTimeout(r, ms))

const terraSwapApi = rateLimit(
    axios.create({ baseURL: "https://api.terraswap.io/dashboard/" }),
    { maxRequests: 1, perMilliseconds: 1000 }
)
const { data: unfilteredPairs } = await terraSwapApi.get("/pairs")
const pairs = unfilteredPairs.filter(pair => pair.token1Volume > 0)
pairs.sort((a, b) => b.volumeUst - a.volumeUst)

const priceCache = new Map();
const getPrice = async (symbol) => {
    if (priceCache.has(symbol)) {
        const { price, date } = priceCache.get(symbol)
        if (new Date() - date < 60 * 60 * 1000) {
            return price
        }
    }

    let token = "token1"
    let pair = pairs.find(pair => pair.pairAlias.toUpperCase() == `UST-${symbol}`.toUpperCase())
    if (!pair) {
        token = "token0"
        pair = pairs.find(pair => pair.pairAlias.toUpperCase() == `${symbol}-UST`.toUpperCase())
    }

    try {
        const { data } = await terraSwapApi.get(`/pairs/${pair.pairAddress}`)
        const price = parseFloat(data[token].price)
        priceCache.set(symbol, { price, date: new Date() })
        return price
    } catch (error) {
        console.error(`${symbol}-${error.message}`)
        return 0
    }
}

export const configureNotifications = async (fcdApi, db) => {
    while (true) {
        db.each("SELECT account, amount, swap, channel, lastProcessed FROM watch", async (_, { account, amount, swap, channel, lastProcessed }) => {
            try {
                const response = await fcdApi.get("/v1/txs", { params: { account, limit: 10 } })

                db.run("UPDATE watch SET lastProcessed = $lastProcessed WHERE account = $account", {
                    $lastProcessed: response.data.txs?.[0]?.id ?? lastProcessed,
                    $account: account
                });

                (await Promise.all(response.data.txs
                    .filter(tx => lastProcessed && tx.id > lastProcessed)
                    .map(tx => {
                        console.log(`Processing: ${tx.id}`)
                        return tx
                    })
                    .map(tx => { return { ...parseTx(tx, account), id: tx.id, account } })
                    .filter(tx => (swap && !isOneSided(tx)) || (!swap && isOneSided(tx)))
                    .map(async tx => {
                        // const amountIn = await Promise.all(tx.amountIn.map(addUsd))
                        // const amountOut = await Promise.all(tx.amountOut.map(addUsd))
                        // const totalAmount = (swap ? amountIn : [...amountIn, ...amountOut])
                        //     .map(a => a.usd)
                        //     .reduce((a, b) => a + b, 0)
                        const usts = [...tx.amountIn, ...tx.amountOut]
                            .filter(({ _, denom }) => denom == "UST")
                            .map(({ amount }) => parseFloat(amount.replace(",", "")))
                        return {
                            ...tx,
                            // amountIn,
                            // amountOut,
                            totalAmount: Math.max(usts, 0)
                        }
                    })))
                    .filter(tx => tx.totalAmount > amount)
                    .forEach(tx => notifyTx(tx, channel))
            } catch (error) {
                console.error(error.message)
            }
        })
    }
}
