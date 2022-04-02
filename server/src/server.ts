import axios from "axios";
import rateLimit from 'axios-rate-limit';
import express from "express";
import path from "path";

const client = rateLimit(
    axios.create({ baseURL: "https://fcd.terra.dev", }),
    { maxRequests: 1, perMilliseconds: 1000 }
)
const server = express()

server.get("/api/v1/txs", async (req, res) => {
    const respose = await client.get(req.url.slice(4))
    // TODO: CACHE
    res.status(respose.status)
    res.json(respose.data)
})

server.get("/api/v1/*", async (req, res) => {
    const respose = await client.get(req.url.slice(4))
    res.status(respose.status)
    res.json(respose.data)
})

const APP_DIR = process.env["APP_DIR"] ?? path.resolve("../build")

server.use(express.static(APP_DIR))

server.get("*", (req, res) => {
    res.sendFile(path.resolve(APP_DIR, "index.html"))
})

server.listen(3001)