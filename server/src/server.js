import axios from "axios";
import rateLimit from "axios-rate-limit";
import express from "express";
import path from "path";
import parseTx from "./amount.js";

const client = rateLimit(
    axios.create({ baseURL: "https://fcd.terra.dev", }),
    { maxRequests: 1, perMilliseconds: 1000 }
)
const server = express()

const proxyPass = async (req, res) => {
    try {
        const response = await client.get(req.url.slice(4))
        res.status(response.status)
        res.json(response.data)
    } catch (error) {
        res.status(error.response?.status ?? 500)
        res.json(error.response?.data ?? { error: error.message })
    }
}

server.get("/api/v1/txs", async (req, res) => {
    try {
        const response = await client.get(req.url.slice(4))
        response.data.txs = response.data.txs
            .map(tx => parseTx(tx, req.query.account))
            .filter(({amountIn, amountOut}) => (amountIn.length > 0 && amountOut.length == 0) || (amountOut.length > 0 && amountIn.length == 0))
        res.status(response.status)
        res.json(response.data)
    } catch (error) {
        res.status(error.response?.status ?? 500)
        res.json(error.response?.data ?? { error: error.message })
    }
})

server.get("/api/*", proxyPass)

const APP_DIR = process.env["APP_DIR"] ?? path.resolve("../build")

server.use(express.static(APP_DIR))

server.get("*", (req, res) => {
    res.sendFile(path.resolve(APP_DIR, "index.html"))
})

server.listen(3001)
