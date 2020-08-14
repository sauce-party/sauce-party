module.exports = {

    /**
     * Minimum heartbeat time in ms. Defines timeout of client inactivity after which is will be assumed inactive
     */
    HEARTBEAT: process.env.HEARTBEAT || 60000,

    /**
     * Quantity of maximum allowed sessions. All excessive clients will be queued
     */
    MAX_SESSIONS: process.env.MAX_SESSIONS || 1,

    /**
     * Redis host which will be used as data persistence. Default port is used to connect 6379
     */
    REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',

    /**
     * Timeout between two subsequent scheduler calls. Defines how often new tickets will be issued
     */
    SCHEDULER_INTERVAL: process.env.SCHEDULER_INTERVAL || 4500,

    /**
     * Time in ms that defines period in which ticket should be used for new session creation
     */
    TICKET_TTL: process.env.TICKET_TTL || 10000,

    /**
     * Port that will be used by socket server
     */
    WS_PORT: process.env.WS_PORT || 80,

    /**
     * Defines contexts and number of related threads
     *
     * Assumes environment properties that match sauce-party.context pattern are passed
     * Examples:
     * sauce-party.context.a=1
     * sauce-party.context.b=4
     */
    get CONTEXT_CONFIG() {
        const store = new Map()
        for (const entry in process.env) {
            const match = entry.match('^sauce-party\.context\.(.+?)$')
            if (match) {
                store.set(match[1], process.env[entry])
            }
        }
        return store
    }
}
