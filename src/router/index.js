const express = require('express');
const stringRandom = require('string-random');

const fetchBlog = require('../crawler')

const router = express.Router()

router.post('/fetchblog', async (req, res) => {
    const { url } = req.body

    console.log(url, 'url')

    const data = await fetchBlog(url)

    const insertData = {
        ...data,
        href: url,
        blogid: stringRandom(11),
        type: 'tech_link'
    }

    console.log(insertData, 'insertData')
    await MYSQL.insert('collection', insertData)

    res.send({
        data: insertData,
        code: 0,
        msg: 'insert success'
    })
});

const dbQuery = async (tableName, params) => {
    const { keywords, page, size } = params

    let sql;
    if (keywords) {
        sql = `select * from ${tableName} where keywords regexp '${ keywords }'`
    } else {
        sql = `select * from ${tableName}`
    }
    return await MYSQL.query(sql)
}

router.post('/collectionblogs', async (req, res) => {
    console.log('/api/collectionblogs was required')

    const blogs = await dbQuery('collection', req.body)

    res.send({
        data: blogs,
        code: 0,
        msg: 'inquire success'
    })
});

router.post('/originalblogs', async (req, res) => {
    console.log('/api/originalblogs was required')
    const { keywords, page, size } = req.body

    let sql;
    if (keywords) {
        sql = `select title,description,type,source,blogid,coverSrc,keywords from article where keywords regexp '${ keywords }'`
    } else {
        sql = `select title,description,type,source,blogid,coverSrc,keywords from article`
    }

    const blogs = await MYSQL.query(sql)

    res.send({
        data: blogs,
        code: 0,
        msg: 'inquire success'
    })
});

router.post('/originalblog', async (req, res) => {
    console.log('/api/originalblog was required')
    const { blogid } = req.body
 
    const blog = await MYSQL.query(`select * from article where blogid = '${blogid}'`)

    res.send({
        data: blog,
        code: 0,
        msg: 'inquire success'
    })
})

module.exports = router

