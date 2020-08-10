const storage = require('./storage')
const {MAX_SESSIONS} = require('./settings')

const queue = []
const instance = {}

/**
 * Adds socket to the queue
 *
 * @param socket to add to the queue
 * @param context optional parameter that indicates socket relates to some context (e. g. team or project)
 */
instance.add = function (socket, context) {
    const item = {socket: socket}
    if (context) {
        item.context = context
    }
    queue.push(item)
}

/**
 * Removes all the passed ws entries from a queue
 */
instance.remove = function (ws) {
    queue.forEach((value, index) => {
        if (value.socket === ws) {
            queue.splice(index, 1)
        }
    })
}

/**
 * Provides generator that produces sequence of fair ordered sockets
 *
 * In simple case, removes and returns socket from the head of queue. In more complex cases consider context
 */
instance.available = async function* () {
    while (queue.length > 0 && await storage.slots() < MAX_SESSIONS) {
        yield queue.shift().socket
    }
}

/**
 * Size of items in a queue that wait for tickets
 */
instance.size = function () {
    return queue.length
}

module.exports = instance