const WebSocketServer = require("ws").Server
const {v4: uuid} = require('uuid')
const storage = require('./storage')

// Configuration constants
const PORT = process.env.PORT || 3000
const SCHEDULER_INTERVAL = 4500
const TICKET_TTL = 20000
const MAX_SESSIONS = 2

// Web Sockets
const options = {'path': '/ws', 'port': PORT}
const wss = new WebSocketServer(options, () => console.log(`WSS has been started at ${PORT}`));

// WS routes
wss.on("connection", async (ws, request) => {
    console.log('New connection from: ' + request.connection.remoteAddress)
    await ws.send('heartbeat|60000')
    ws.on("message", async message => {
        storage.queue.push(ws)
        try {
            await ws.send(`queued|${queue.length}`)
        } catch (error) {
            console.error(`Failed to send queued confirmation to the client`)
        }
    })
    ws.on("close", (code, reason) => {
        console.log('Closed: ' + code + ' ' + reason)
        storage.queue.removeIf(item => item === ws)
    })
});

// Start scheduler
setInterval(async () => {
    storage.expireTickets()
    while (storage.queue.length > 0 && storage.slots() <= MAX_SESSIONS) {
        storage.expireTickets()
        const ticket = {
            id: uuid(),
            expiration: Date.now() + TICKET_TTL
        }
        storage.tickets.push(ticket)
        await storage.queue.shift().send(`ticket|${ticket.id}|${TICKET_TTL}`)
    }
    console.log(`Tickets: ${storage.tickets.length}, Sessions: ${storage.sessions.length}`)
}, SCHEDULER_INTERVAL)
