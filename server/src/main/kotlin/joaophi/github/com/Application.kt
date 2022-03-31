package joaophi.github.com

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.compression.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.http.content.*
import io.ktor.server.plugins.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.util.pipeline.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.File
import io.ktor.client.engine.cio.CIO as CIOClient
import io.ktor.server.cio.CIO as CIOServer

private val APP_DIR = System.getenv("APP_DIR")

fun main() {
    val client = HttpClient(CIOClient) {
        ContentEncoding()
    }

    val mutex = Mutex()

    val server = embeddedServer(CIOServer, port = 3001) {
        install(StatusPages) {
            status(HttpStatusCode.NotFound) { call, _ ->
                call.respondFile(File(APP_DIR, "index.html"))
            }
        }
        routing {
            static {
                files(APP_DIR)
            }
            route("/api") {
                suspend fun PipelineContext<Unit, ApplicationCall>.proxyPass() {
                    val response = client.get("https://fcd.terra.dev${call.request.uri.removePrefix("/api")}")
                    call.respondBytes(response.body(), response.contentType(), response.status)
                }
                get("/v1/txs") {
                    // RATE LIMIT
                    mutex.withLock { delay(1000) }
                    proxyPass()
                }
                get("/{...}") {
                    proxyPass()
                }
            }
        }
    }
    server.start(wait = true)
}
