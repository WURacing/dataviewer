const can = require("@cmonahan/cantools");

class TelemetryServer {
    constructor(app) {
        this.app = app;
        this.handleIncoming = this.handleIncoming.bind(this);
        this.dbc = can.database.load_file("./CANBus19.dbc");
    }

    /**
     * 
     * @param {Buffer} msg 
     * @param {{address: string, family: string, port: number, size: number}} rinfo 
     */
    handleIncoming(msg, rinfo) {
        if (msg.length !== 20) {
            console.warn(`Invalid buffer size ${msg.length}, expected 20`);
            return;
        }
        let frame_id = msg.readUInt32BE();
        let timestamp = msg.readInt32BE(4);
        let data = msg.slice(8, 16);
        let checksum = msg.readUInt8(16);
        let word = msg.slice(17).toString();

        if (word !== "WU\n") {
            console.warn(`Invalid magic identifier ${word}`);
            return;
        }

        let check = data.reduce((prev,cur) => prev ^ cur, checksum)
        if (check !== 0) {
            console.warn(`Checksum check failed ${check}`);
            return;
        }

        let parsed = this.dbc.decode_message(frame_id, data);
        for (let key of Object.keys(parsed)) {
            this.app.postTelemetryMessage(key, parsed[key]);
        }
    }
}

module.exports = TelemetryServer;