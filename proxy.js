const got = require('got')

const url = 'none'

module.exports = async function (payload) {
    const target = url + payload.url
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
