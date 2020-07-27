Array.prototype.removeIf = function (predicate) {
    this.forEach((value, index) => {
        if (predicate(value)) {
            this.splice(index, 1)
        }
    })
}

const queue = []
const tickets = []
const sessions = []

module.exports = {

    queue: queue,
    tickets: tickets,
    sessions: sessions,

    /**
     * Removes expired tickets and abandoned sessions
     */
    expire: function () {
        tickets.removeIf(item => item.expiration < Date.now())
        sessions.removeIf(item => item.expiration && item.expiration < Date.now())
    },

    /**
     * Return the count of locket slots
     * @returns {number}
     */
    slots: function () {
        return tickets.length + sessions.length
    }
}