const https = require('https');
const fs = require('fs')
const path = require('path');
const express = require('express');

const history = require('connect-history-api-fallback');
var bodyParser = require('body-parser')

const router = require('../router')
const { initTaskLoop } = require('../tempMail')

async function initServer () {
    var options = {
        pfx: fs.readFileSync(path.join(__dirname, '9425468_blog.wangtz.cn.pfx')),
        passphrase: 'g3a2h38t'
    }

    const app = express();

    const server = https.createServer(options,app);

    app.all("*", function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "content-type");
        res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
        if (req.method == 'OPTIONS')
            res.sendStatus(200);
        else
            next();
    })

    app.use(history());
    app.use(bodyParser.json());
    app.use('/api', router);
    
    initTaskLoop()

    server.listen('8089', () => {
        console.log('server is running listen port 8089')
    });
}

module.exports = initServer