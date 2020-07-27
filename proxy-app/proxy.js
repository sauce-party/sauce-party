const got = require('got')

if (!process.env.TARGET_URL) {
    throw 'TARGET_URL environment variable must be defined'
}

module.exports = async function (payload) {
    const target = process.env.TARGET_URL + payload.url
    // Remove middleware headers
    delete payload.headers['host']
    delete payload.headers['content-length']
    try {
        const options = {
            method: payload.method,
            headers: payload.headers,
        }
        if (payload.method !== 'GET') {
            options.json = payload.body
        }
        return await got(target, options)
    } catch (e) {
        console.log(e)
        return e.response
    }
}
