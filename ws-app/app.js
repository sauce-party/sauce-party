const WebSocketServer = require("ws").Server
const {v4: uuid} = require('uuid')
const storage = require('./storage')
const settings = require('./settings')

// Web Sockets
const options = {'path': '/ws', 'port': settings.WS_PORT}
const wss = new WebSocketServer(options, () => console.log(`WSS has been started at ${settings.WS_PORT}`));

const queue = []

// WS routes
wss.on("connection", async (ws, request) => {
    console.log('New connection from: ' + request.connection.remoteAddress)
    await ws.send(`heartbeat|${settings.HEARTBEAT}`)
    ws.on("message", async message => {
        queue.push(ws)
        try {
            await ws.send(`queued|${queue.length}`)
        } catch (error) {
            console.error(`Failed to send queued confirmation to the client`)
        }
    })
    ws.on("close", (code, reason) => {
        console.log('Closed: ' + code + ' ' + reason)
        // TODO: Remove socket from the queue
    })
});

// Start scheduler
setInterval(async () => {
    while (queue.length > 0 && await storage.slots() < settings.MAX_SESSIONS) {
        const ticket = uuid()
        await storage.addTicket(ticket)
        await queue.shift().send(`ticket|${ticket}|${settings.TICKET_TTL}`)
    }
}, settings.SCHEDULER_INTERVAL)
