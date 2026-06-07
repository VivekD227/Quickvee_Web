class sessionDataStorage {
    static data = {};

    static set(key, value) {
        this.data[key] = value;
    }

    static get(key) {
        return this.data[key];
    }

}

module.exports = sessionDataStorage;