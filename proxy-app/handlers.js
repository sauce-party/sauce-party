const storage = require('./storage')
const proxyRequest = require('./proxy')
const {SESSION_TTL} = require('./settings')

async function createSession(req, res) {
    // Check ticket
    const ticketId = req.body.desiredCapabilities['ticket']
    if (!await storage.book(ticketId)) {
        res.statusCode = 401
        res.json({
            'status': 401,
            'value': {
                'message': 'Ticket is invalid or absent',
                'error': 'Ticket is invalid or absent'
            }
        })
        return res.end()
    }
    // Create real session
    const response = await proxyRequest(req)
    const body = JSON.parse(response.body)
    // Extract session id for W3C or OSS protocols
    const id = body.value.sessionId || body.sessionId
    if (id) {
        // Update slot with session id and expiration time
        await storage.upgrade(ticketId, id)
    } else {
        // Remove session
        await storage.remove(ticketId)
    }
    // Response to client
    res.json(body)
    return res.end()
}

async function removeSession(req, res) {
    const matchResult = req.url.match(/wd\/hub\/session\/(.+?)$/)
    if (matchResult) {
        // Remove real session
        let quitResponse
        try {
            quitResponse = await proxyRequest(req)
        } catch (e) {
            console.error(e)
            quitResponse = e.response
        }
        res.send(quitResponse.body)
        res.statusCode = quitResponse.statusCode
        res.statusMessage = quitResponse.statusMessage
        // Update storage
        await storage.remove(matchResult[1])
        return res.end()
    }
}

async function commonRequest(req, res) {
    const match = req.url.match(/wd\/hub\/session\/(.+?)\/.+?$/)
    if (!match) {
        res.statusCode = 400
        res.json({
            'status': 400,
            'value': {
                'message': 'Unknown request detected',
                'error': 'Unknown request detected'
            }
        })
        return res.end()
    }
    // Check session exists
    if (!await storage.renew(match[1], SESSION_TTL)) {
        res.statusCode = 401
        res.json({
            'status': 401,
            'value': {
                'message': 'Session is wrong or expired',
                'error': 'Session is wrong or expired'
            }
        })
        return res.end()
    }
    // Real request
    let response
    try {
        response = await proxyRequest(req)
    } catch (e) {
        console.error(e)
        response = e.response
    }
    res.statusCode = response.statusCode
    res.statusMessage = response.statusMessage
    res.send(response.body)
}

module.exports = {
    createSession: createSession,
    removeSession: removeSession,
    commonRequest: commonRequest
}