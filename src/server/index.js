const express = require('express');

const history = require('connect-history-api-fallback');
var bodyParser = require('body-parser')

const router = require('../router')

async function initServer () {
    const app = express();

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

    app.listen('8089', () => {
        console.log('server is running listen port 3000')
    });
}

module.exports = initServer