import { isOneSided, parseTx } from "./amount.js";
import getTxActions from "./format/index.js";
import { sleep } from "./utils.js";

export const process = async (db) => {
    while (true) {
        const watches = await db.all("SELECT account, amount, swap, lastProcessed FROM watch")

        const promises = watches.map((watch) => processWatch(db, watch))

        await Promise.all(promises)
        
        await sleep(10000)
    }
}

const processWatch = async (db, { account, amount: notifyAmount, swap, lastProcessed }) => {
    const txs = await db.all("SELECT id, json FROM tx WHERE address = $address AND id > $lastProcessed ORDER BY id", {
        $address: account,
        $lastProcessed: lastProcessed
    })

    const promises = txs.map(async ({ id, json }) => {
        try {
            const tx = { ...parseTx(JSON.parse(json), account), id, account }
            const oneSided = isOneSided(tx)
            const usts = [...tx.amountIn, ...tx.amountOut]
                .filter(({ _, denom }) => denom == "UST")
                .map(({ amount }) => parseFloat(amount.replace(",", "")))

            const amount = Math.max(...usts, 0)
            const addresses = tx.addresses.map(a => `[${a}](https://finder.terra.money/mainnet/address/${a})`).join("\n")
            const notify = (amount > notifyAmount) && (swap != oneSided) ? 1 : 0
            const actions = await getTxActions(tx.rawTx)

            console.log("process tx %d: amount %f notify %d", tx.id, amount, notify)

            if (!amount)
                return

            await db.run("UPDATE tx SET amount = $amount, addresses = $addresses, actions = $actions, notify = $notify, timestamp = $timestamp WHERE id = $id AND address = $address", {
                $amount: amount,
                $addresses: addresses,
                $actions: actions,
                $notify: notify,
                $timestamp: tx.timestamp,
                $id: tx.id,
                $address: account
            })

        } catch (error) {
            console.error("process tx %d: error %s", tx.id, error.message)
        }
    })

    await Promise.all(promises)

    if (txs.length > 0) {
        await db.run("UPDATE watch SET lastProcessed = $id WHERE account = $account", {
            $id: txs.pop().id,
            $account: account
        })
    }
}