const config = require('./config.js');
const mysql = require('mysql');
const util = require('util'); // for promisify
const SimpleNodeLogger = require('simple-node-logger'),
    opts = {
        logFilePath: 'lionfish.log',
        timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS'
    },
    log = SimpleNodeLogger.createSimpleLogger(opts);

async function getSightings() {
    // this query de-dupes based on exact lat/lon and day
    let sql = `
        SELECT sighting_id, Latitude, Longitude
        FROM sightings
        GROUP BY Latitude, Longitude, Year, Month, Day`;
    let result = await getQueryData(sql);
    return result;
}

async function getSighting(id) {
    let sql = `
        SELECT sighting_id, SpecimenNumber, Country, State, Locality, Latitude, Longitude, Source, Accuracy, DrainageName, HUC8Number, Year, Month, Day, Status, Comments, record_type
        FROM sightings
        WHERE sighting_id =  ` + id;
    let result = await getQueryData(sql);
    return result[0];
}

async function getClosestSightings(limitAmount, userLat, userLon) {
    // this query de-dupes 
    let sql = `
        SELECT sighting_id, Latitude, Longitude, ROUND((((acos(sin((${userLat} * pi()/180)) * sin((Latitude * pi()/180)) + cos((${userLat} * pi()/180)) * cos((Latitude * pi()/180)) * cos(((${userLon} - Longitude) * pi()/180)))) * 180/pi()) * 60), 2) AS distance
        FROM sightings
        GROUP BY Latitude, Longitude
        ORDER BY distance ASC
        LIMIT ${limitAmount}`;
    let result = await getQueryData(sql);
    return result;
}

// this function will connect to the database, query, disconnect, and return the query result
async function getQueryData(sql) {
    // this statement uses the values from config.js
    // it's common to keep usernames, passwords, etc., in a config file
    let connection = mysql.createConnection({
        host: config.db.host,
        user: config.db.user,
        password: config.db.password,
        database: config.db.database
    });

    // standard connect operation with some error handling
    connection.connect(function (err) {
        if (err) {
            log.error('error when connecting to db:', err);
        } else {
            log.info('Connected to database ' + config.db.database + ' as user ' + config.db.user);
        }
    });

    let query = util.promisify(connection.query).bind(connection); // node native promisify

    // try to query the database, handle errors if they happen
    let result;
    try {
        result = await query(sql);
    } catch (err) {
        log.error(err);
        result = '{Error}';
    }

    // it's important to close the database connection
    connection.end();

    return result;
}

module.exports = {
    getSighting, getSightings, getClosestSightings
}