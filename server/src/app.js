import axios from "axios"
import rateLimit from "axios-rate-limit"
import "dotenv/config"
import express from "express"
import { configureNotifications } from "./notification.js"
import { configureApi } from "./server.js"
import sqlite3 from "sqlite3"

const db = new sqlite3.Database("app.db")
const client = rateLimit(
    axios.create({ baseURL: "https://fcd.terra.dev", }),
    { maxRequests: 1, perMilliseconds: 2000 }
)
const server = express()

configureApi(server, client, db)
configureNotifications(client, db)
