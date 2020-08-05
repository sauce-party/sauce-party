const redis = require("redis")
const {promisify} = require("util")
const {REDIS_HOST, SESSION_TTL, SESSION_CREATION_TIMEOUT} = require('./settings')

const client = redis.createClient({host: REDIS_HOST});

client.on('ready', () => console.info(`Connected to Redis at ${REDIS_HOST}:6379`));
client.on('error', error => console.error(error));

module.exports = {

    /**
     * Turns booked session into real one
     *
     * @return true if booking was successful, false otherwise
     */
    upgrade: async function (virtual, real) {
        const rename = promisify(client.rename).bind(client)
        try {
            return await rename([`s:${virtual}`, `s:${real}`]) && await this.renew(real, SESSION_TTL)
        } catch (e) {
            console.error(`Unable to upgrade session ${e}`)
            return false
        }
    },

    /**
     * Updates session last activity
     *
     * @return true if renewing was successful, false otherwise
     */
    renew: async function (session, time) {
        const expire = promisify(client.pexpire).bind(client)
        try {
            return await expire([`s:${session}`, time])
        } catch (e) {
            console.error(`Unable to renew ${e}`)
            return false
        }
    },

    /**
     * Turns ticket into booked session
     *
     * @return true if renewing was successful, false otherwise
     */
    book: async function (ticket) {
        const rename = promisify(client.rename).bind(client)
        try {
            return await rename([`t:${ticket}`, `s:${ticket}`]) && await this.renew(ticket, SESSION_CREATION_TIMEOUT)
        } catch (e) {
            console.error(`Unable to book session ${e}`)
            return false
        }
    },

    /**
     * Removes session quited
     */
    remove: async function (session) {
        const del = promisify(client.del).bind(client)
        try {
            await del([`s:${session}`])
        } catch (e) {
            console.error(`Unable to remove session ${e}`)
        }
    }
}
