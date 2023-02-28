const initServer = require('./server')
const dbServer = require('./database')

const CONFIG = require('./config')

async function main() {
    try {
        await dbServer.mysql(CONFIG.MYSQL_CONFIG)
        await initServer()
    } catch (ex) {
        console.log('server boot error:', ex)
    }
}

main()