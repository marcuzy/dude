/**
 * Хранилище запросов от пользователей.
 * Учитывает как конкретного пользователь, так и конкретный канал.
 */
class QueriesCollection {
    constructor() {
        this.queries = new Map;
    }

    /**
     * @param {string} user
     * @param {string} channel
     * 
     * @returns {string}
     */
    _makeKey(user, channel) {
        return user + channel;
    }

    /**
     * @param {string} user
     * @param {string} channel
     */
    register(user, channel) {
        this.queries.set(this._makeKey(user, channel), []);
    }

    /**
     * @param {string} user
     * @param {string} channel
     * 
     * @returns {Array}
     */
    get(user, channel) {
        return this.queries.get(this._makeKey(user, channel));   
    }

    /**
     * @param {string} user
     * @param {string} channel
     * 
     * @return {boolean}
     */
    has(user, channel) {
        return this.queries.has(this._makeKey(user, channel));   
    }

    /**
     * @param {string} user
     * @param {string} channel
     */
    unregister(user, channel) {
        this.queries.delete(this._makeKey(user, channel));   
    }
}

module.exports = QueriesCollection;