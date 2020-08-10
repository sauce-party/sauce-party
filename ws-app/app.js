const WebSocketServer = require("ws").Server
const {v4: uuid} = require('uuid')
const storage = require('./storage')
const settings = require('./settings')
const queue = require('./queue')

// Web Sockets
const options = {'port': settings.WS_PORT}
const wss = new WebSocketServer(options, () => console.log(`WSS has been started at ${settings.WS_PORT}`));

// WS routes
wss.on("connection", async (ws, request) => {
    console.log(`New connection has been accepted. Total: ${wss.clients.size}`)
    if (!await send(ws, `heartbeat|${settings.HEARTBEAT}`)) {
        return;
    }
    ws.on("message", async message => {
        if (!message.match('^session$')) {
            ws.terminate()
            return;
        }
        queue.add(ws)
        await send(ws, `queued|${queue.size}`)
    })
    ws.on("close", () => console.log(`Client has been disconnected. Active connections: ${wss.clients.size}`))
});

/**
 * Sends message to specified socket and checks for errors
 * @return {Promise<boolean>} true if message was sent, false otherwise
 */
async function send(ws, message) {
    try {
        await ws.send(message)
        return true
    } catch {
        console.error('Failed to send message to the client')
    }
}

// Start scheduler
setInterval(async () => {
    for await (const ws of queue.available()) {
        const ticket = uuid()
        if (await storage.addTicket(ticket)) {
            await send(ws, `ticket|${ticket}|${settings.TICKET_TTL}`)
        }
    }
}, settings.SCHEDULER_INTERVAL)
