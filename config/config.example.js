const config = {};

config.DB_CONFIG = {
    host: 'host', //fill hostname default localhost
    user: 'user', // fill database user 
    password: 'password', //fill password (only on working repo do not push that in public)
    database: 'database' //fill database name
}
config.QUERY_CHUNK_SIZE = 'number' //number of queries at once
config.SLEEP_IN_SECOND = 'seconds'; //number of sleeping seconds
config.USA_API_USERAGENT =
    "app/v1.0 (http://yourwebsite.com; email)"; //provide information to the agency (app name, website, email)
onfig.metOfficeUK_key = "88888888-4444-4444-4444-121212121212"; //fill the code you get when you register by met office
config.metOfficeUK_chunk = 'number'; //number of times the number of fetched cities of (6001) is reduced

config.smhi_db = {
    host: 'host', //fill hostname default localhost
    user: 'user', // fill database user 
    password: 'password', //fill password (only on working repo do not push that in public)
    database: 'database' //fill database name
}
module.exports = config;