const express = require('express')
const storage = require('./storage')
const routes = require('./handlers')

const app = express()
app.use(express.json())

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

// Ignite Web server
app.listen(process.env.PORT || 3000)

// Start scheduler
setInterval(() => {
    storage.expireSessions()
    console.log(`Active sessions: ${storage.sessions.length}`)
}, 4500)
