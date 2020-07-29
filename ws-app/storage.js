const redis = require("redis")
const {promisify} = require("util")
const {REDIS_HOST, TICKET_TTL} = require('./settings')

const client = redis.createClient({host: REDIS_HOST});

client.on('ready', () => console.info(`Connected to Redis at ${REDIS_HOST}:6379`));
client.on('error', error => console.error(error));

module.exports = {

    /**
     * Return the count of occupied slots
     * @returns {number}
     */
    slots: async function () {
        const keys = promisify(client.keys).bind(client)
        try {
            return (await keys('[ts]:*')).length
        } catch {
            console.error('Unable to determinate slots count')
            return Number.POSITIVE_INFINITY
        }
    },

    /**
     * Stores ticket id into storage
     */
    addTicket: async function (ticket) {
        const set = promisify(client.set).bind(client)
        try {
            await set([`t:${ticket}`, '0', 'PX', TICKET_TTL])
        } catch {
            console.error('Unable to add new ticket')
        }
    }
}
