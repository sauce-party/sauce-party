const storage = require('./storage')
const proxyRequest = require('./proxy')
const {v4: uuid} = require('uuid')

const SESSION_TTL = 120000

async function createSession(req, res) {
    // Check ticket
    // const ticketId = req.body.desiredCapabilities['ticket']
    // const ticket = storage.tickets.find(item => item.id === ticketId)
    // if (!ticket) {
    //     res.statusCode = 401
    //     res.json({
    //         'status': 401,
    //         'value': {
    //             'message': 'Ticket is invalid or absent',
    //             'error': 'Ticket is invalid or absent'
    //         }
    //     })
    //     return res.end()
    // }
    // storage.tickets.removeIf(item => item === ticket)
    // Book session slot
    const session = {id: uuid()}
    storage.sessions.push(session)
    // Create real session
    const response = await proxyRequest(req)
    const body = JSON.parse(response.body)
    // Update slot with session id and expiration time
    const id = body.value.sessionId
    if (id) {
        session.id = id
        session.expiration = Date.now() + SESSION_TTL
    } else {
        session.expiration = Date.now() - SESSION_TTL
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
        storage.sessions.removeIf(s => s.id === matchResult[1])
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
    const session = storage.sessions.find(item => item.id === match[1])
    if (!session) {
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
        session.expiration = Date.now() + SESSION_TTL
    } catch (e) {
        console.error(e)
        response = e.response
    }
    res.send(response.body)
    res.statusCode = response.statusCode
    res.statusMessage = response.statusMessage
}

module.exports = {
    createSession: createSession,
    removeSession: removeSession,
    commonRequest: commonRequest
}