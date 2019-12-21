const request = require('supertest')
const app = require('../app')

describe("Runs CRUD", () => {
    it("should create a new run", async () => {
        // upload a file
        const res = await request(app)
        .post("/api/runs")
        .field("location", "Meme Town")
        .field("runofday", "69")
        .attach("file", "tests/LOG00011.CSV");
        expect(res.statusCode).toEqual(202);
        const jobId = res.body.id;

        // check its initial processing status
        const ipres1 = await request(app).get(`/api/runs/processing/${jobId}`);
        expect(ipres1.statusCode).toEqual(200);
        expect(ipres1.body.status).toBeLessThan(10); // shouldn't have started

        // wait for processing to finish
        await app.waitBackground();

        // make sure it succeeded
        const ipres2 = await request(app).get(`/api/runs/processing/${jobId}`);
        expect(ipres2.statusCode).toEqual(200);
        expect(ipres2.body.status).toEqual(10);

        // check its details
        const details = await request(app).get(`/api/runs/${jobId}/details`);
        expect(details.statusCode).toEqual(200);
        expect(details.body.meta.location).toEqual("Meme Town");
        expect(details.body.meta.runofday).toEqual(69);
        // test timezones ig
        expect(details.body.meta.start).toEqual("2019-10-06T15:42:54.000Z");
        expect(details.body.meta.end).toEqual("2019-10-06T15:42:57.247Z");

        return true;
    })
})

afterAll(() => {
    app.close(); // close the database connections
})