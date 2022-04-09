import { sleep } from "./utils.js"

export const watch = async (db, api) => {
    while (true) {
        const watchList = await db.all("SELECT W.account AS address, COALESCE(MAX(tx.id), 0) max_id FROM watch W LEFT JOIN tx ON tx.address = W.account GROUP BY W.account")

        const promises = watchList.map(({ address, max_id }) => watchAddress(db, api, address, max_id))

        await Promise.all(promises)

        await sleep(10000)
    }
}

const watchAddress = async (db, api, address, max_id) => {
    try {
        const response = await api.get("/v1/txs", { params: { account: address, limit: 100 } })
        const promises = response.data.txs
            .filter(tx => tx.id > max_id)
            .map(async tx => {
                await db.run("INSERT INTO tx (id, address, hash, json) VALUES ($id, $address, $hash, $json)", {
                    $id: tx.id,
                    $hash: tx.txhash,
                    $address: address,
                    $json: JSON.stringify(tx)
                })
                console.log("watch %s: found tx %d", address, tx.id)
            })
        await Promise.all(promises)
    } catch (error) {
        console.error("watch %s: error %s", address, error.message)
    }
}