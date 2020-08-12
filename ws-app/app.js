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
    // Message route, acceptable messages: session, session|context
    ws.on("message", async message => {
        const match = message.match('^session(|\\|(.+?))$')
        if (!match) {
            ws.terminate()
            return;
        }
        queue.add(ws, match[2])
        await send(ws, `queued|${queue.size}`)
    })
    // Disconnected route
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
    } catch (e) {
        console.error('Failed to send message to the client', e)
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
