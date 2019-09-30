const can = require("@cmonahan/cantools");
const dbc = require("@wuracing/dbc");

/**
 * Parses incoming telemetry datagrams and forwards to website.
 */
class TelemetryServer {
    constructor(app) {
        this.app = app;
        this.handleIncoming = this.handleIncoming.bind(this);
        // Use the DBC associated with the current dependency version of @wuracing/dbc
        this.dbc = can.database.load_file(require.resolve("@wuracing/dbc/" + dbc.dbcfile));
    }

    /**
     * Process an incoming telemetry datagram and forwards individual messages.
     * @param {Buffer} msg 
     * @param {{address: string, family: string, port: number, size: number}} rinfo 
     */
    handleIncoming(msg, rinfo) {
        if (msg.length > 20) {
            // Call recursively on each individual 20-byte CAN packet
            this.handleIncoming(msg.slice(0, 20), rinfo);
            this.handleIncoming(msg.slice(20), rinfo);
            return;
        }
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

        // Validate data
        let check = data.reduce((prev,cur) => prev ^ cur, checksum)
        if (check !== 0) {
            console.warn(`Checksum check failed ${check}`);
            return;
        }

        // Convert raw CAN data into a key/value dictionary str->number
        let parsed = this.dbc.decode_message(frame_id, data);

        console.log(`Received message at ${timestamp}`)

        // Forward each signal separately
        for (let key of Object.keys(parsed)) {
            this.app.postTelemetryMessage(key, parsed[key]);
        }
    }
}

module.exports = TelemetryServer;