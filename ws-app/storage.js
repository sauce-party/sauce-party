const redis = require("redis")
const {promisify} = require("util")
const {REDIS_HOST, TICKET_TTL} = require('./settings')

const client = redis.createClient({host: REDIS_HOST});

client.on('ready', () => console.info(`Connected to Redis at ${REDIS_HOST}:6379`));
client.on('error', error => console.error(error));

module.exports = {

    /**
     * Return the count of occupied slots
     *
     * @param context defines slots search scope if passed
     * @returns {number}
     */
    slots: async function (context) {
        const keys = promisify(client.keys).bind(client)
        try {
            return (await keys(`[ts]:${context || '*'}:*`)).length
        } catch {
            console.error('Unable to determinate slots count')
            return Number.POSITIVE_INFINITY
        }
    },

    /**
     * Stores ticket id into storage
     */
    addTicket: async function (ticket, context) {
        const set = promisify(client.set).bind(client)
        try {
            await set([`t:${context || ''}:${ticket}`, '0', 'PX', TICKET_TTL])
            return true
        } catch {
            console.error('Unable to add new ticket')
        }
    }
}
