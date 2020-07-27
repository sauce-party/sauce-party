const WebSocketServer = require("ws").Server
const express = require('express')
const http = require("http")
const {v4: uuid} = require('uuid')
const storage = require('./storage')
const routes = require('./handlers')

// Configuration constants
const TICKET_TTL = 20000

const MAX_SESSIONS = 2

const app = express()
const server = http.createServer(app)

app.use(express.json())
app.use(express.urlencoded({extended: true}))

// HTTP routes
app.all('/wd/hub*', async (req, res) => {
    // Handle new session creation
    if (req.url === '/wd/hub/session') {
        return await routes.createSession(req, res)
    }
    // Handle remove session
    if (req.method === 'DELETE' && req.url.match(/wd\/hub\/session\/(.+?)$/)) {
        return await routes.removeSession(req, res)
    }
    // Handle regular WD requests
    return await routes.commonRequest(req, res)
})

// Web Sockets
const wss = new WebSocketServer({
    'server': server,
    'path': '/ws'
});

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

// Ignite Web server
server.listen(3000)

// Start scheduler
setInterval(async () => {
    storage.expire()
    while (storage.queue.length > 0 && storage.slots() <= MAX_SESSIONS) {
        storage.expire()
        const ticket = {
            id: uuid(),
            expiration: Date.now() + TICKET_TTL
        }
        storage.tickets.push(ticket)
        await storage.queue.shift().send(`ticket|${ticket.id}|${TICKET_TTL}`)
    }
    console.log(`Tickets: ${storage.tickets.length}, Sessions: ${storage.sessions.length}`)
}, 4500)
