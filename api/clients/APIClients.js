class APIClients {
    constructor(request) {
        this.request = request;
    }

    async post(url, payload) {
        return await this.request.post(url, {
            form: payload
        });
    }

    async get(url) {

        return await this.request.get(url);
    }
}

module.exports = { APIClients };
