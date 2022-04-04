import axios from "axios"
import rateLimit from "axios-rate-limit"
import "dotenv/config"
import express from "express"
import { configureNotifications } from "./notification.js"
import { configureApi } from "./server.js"

const client = rateLimit(
    axios.create({ baseURL: "https://fcd.terra.dev", }),
    { maxRequests: 1, perMilliseconds: 1000 }
)
const server = express()
const labels = new Map()
labels.set("terra152hppmn9t7uwepqgulsk59sfm2kzkweg4fm3mm", { label: "Teste", last: 1 })

configureApi(server, client, labels)
configureNotifications(client, labels)
