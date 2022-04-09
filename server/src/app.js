import axios from "axios"
import axiosRateLimit from "axios-rate-limit"
import "dotenv/config"
import { open } from "sqlite"
import sqlite3 from "sqlite3"
import { notify } from "./notification.js"
import { process } from "./process.js"
import { watch } from "./watch.js"

const db = await open({
    filename: "app.db",
    driver: sqlite3.Database
})
const api = axiosRateLimit(
    axios.create({ baseURL: "https://fcd.terra.dev", }),
    { maxRequests: 1, perMilliseconds: 2000 }
)
// const server = express()

// configureApi(server, client, db)
// configureNotifications(client, db)
watch(db, api)
process(db)
notify(db)