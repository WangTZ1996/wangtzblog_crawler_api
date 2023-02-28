const express = require('express');
const stringRandom = require('string-random');

const fetchBlog = require('../crawler')

const router = express.Router()

// router.get('', () => {})

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

router.post('/collectionblogs', async (req, res) => {
    const { config } = req.body

    const blogs = await MYSQL.select('collection', config)

    console.log(blogs, 'blogs')
    res.send({
        data: blogs,
        code: 0,
        msg: 'inquire success'
    })
});

module.exports = router

