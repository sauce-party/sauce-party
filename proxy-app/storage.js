Array.prototype.removeIf = function (predicate) {
    this.forEach((value, index) => {
        if (predicate(value)) {
            this.splice(index, 1)
        }
    })
}

const sessions = []

module.exports = {

    sessions: sessions,

    /**
     * Removes expired and abandoned sessions
     */
    expireSessions: function () {
        sessions.removeIf(item => item.expiration && item.expiration < Date.now())
    }
}
