require("dotenv-flow").config();
let fs = require("fs");
const mariadb = require('mariadb');

const pool = mariadb.createPool({
	host: process.env.DB_HOST,
	port: parseInt(process.env.DB_PORT),
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	// database: process.env.DB_NAME,
	connectionLimit: 1,
	timezone: "UTC",
    multipleStatements: true
});

async function main() {
    let conn = await pool.getConnection();

    let createTables = fs.readFileSync("./database.sql", "utf8");
    
    try {
        await conn.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME} DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_general_ci`);
        await conn.query(`USE ${process.env.DB_NAME}`);
        await conn.query("DROP TABLE IF EXISTS datapoints; DROP TABLE IF EXISTS datafilters; DROP TABLE IF EXISTS datavariables; DROP TABLE IF EXISTS datarunmeta");
        await conn.query(createTables);
    } catch (e) {
        console.log(e);
    }
    process.exit();
}

main();