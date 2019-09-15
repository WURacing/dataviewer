/**
 * 
 * @param {string} string 
 * @param {object[]} params 
 */
function query(string, params) {
    if (Array.isArray(params)) {
        console.log(`SQL EXEC ${string} WITH PARAMS ${params.join(", ")}`);
    } else {
        console.log(`SQL EXEC ${string} WITH PARAM ${params}`);
    }
    if (string.toLowerCase().startsWith("select")) {
        return Promise.resolve([]);
    } else if (string.toLowerCase().startsWith("insert")) {
        let randint = Math.floor(Math.random() * 100);
        return Promise.resolve({ insertId: randint });
    } else if (string.toLowerCase().startsWith("update")) {
        let randint = Math.floor(Math.random() * 100);
        return Promise.resolve(randint);
    } else {
        return Promise.resolve();
    }
}


module.exports = {
    "query": query,
    "beginTransaction": () => console.log("SQL beginTransaction"),
    "commit": () => console.log("SQL commit"),
    "rollback": () => console.log("SQL rollback")
};