const fs = require('fs');
const express = require("express");
const stringRandom = require("string-random");
const Web3 = require("web3");
const simpleParser = require('mailparser').simpleParser;
const { CHAIN_NET_RPC } = require("../config/chain_conf");

const fetchBlog = require("../crawler");
const { createTask } = require("../tempMail");

const router = express.Router();

router.post("/fetchblog", async (req, res) => {
  const { url } = req.body;

  console.log(url, "url");

  const data = await fetchBlog(url);

  const insertData = {
    ...data,
    href: url,
    blogid: stringRandom(11),
    type: "tech_link",
  };

  console.log(insertData, "insertData");
  await MYSQL.insert("collection", insertData);

  res.send({
    data: insertData,
    code: 0,
    msg: "insert success",
  });
});

const dbQuery = async (tableName, params) => {
  const { keywords, page, size = 10 } = params;

  console.log(size, "size");

  let sql;
  if (keywords) {
    sql = `select * from ${tableName} limit ${size} where keywords regexp '${keywords}'`;
  } else {
    sql = `select * from ${tableName} limit ${size}`;
  }
  return await MYSQL.query(sql);
};

router.post("/collectionblogs", async (req, res) => {
  console.log("/api/collectionblogs was required");

  const blogs = await dbQuery("collection", req.body);

  res.send({
    data: blogs,
    code: 0,
    msg: "inquire success",
  });
});

router.post("/originalblogs", async (req, res) => {
  console.log("/api/originalblogs was required");
  const { keywords, page, size } = req.body;

  let sql;
  if (keywords) {
    sql = `select title,description,type,source,blogid,coverSrc,keywords from article where keywords regexp '${keywords}'`;
  } else {
    sql = `select title,description,type,source,blogid,coverSrc,keywords from article`;
  }

  const blogs = await MYSQL.query(sql);

  res.send({
    data: blogs,
    code: 0,
    msg: "inquire success",
  });
});

router.post("/originalblog", async (req, res) => {
  console.log("/api/originalblog was required");
  const { blogid } = req.body;

  const blog = await MYSQL.query(
    `select * from article where blogid = '${blogid}'`
  );

  res.send({
    data: blog,
    code: 0,
    msg: "inquire success",
  });
});

router.post("/tempMail", async (req, res) => {
  const taskId = stringRandom(11);
  const mailName = stringRandom(8).toLowerCase();

  console.log("tempMail", mailName, taskId);
  const task = createTask(taskId, mailName);

  res.send({
    data: { mailName, endTime: task.endTime },
    code: 0,
    msg: "success",
  });
});

router.post("/emailList", async (req, result) => {
  const emailName = req.body.emailName.replace('@wangtz.cn', '')
  if (emailName) {
    const emailpath = "/home/" + emailName + "/Maildir/new"
    if (fs.existsSync(emailpath)) {
      fs.readdir(emailpath,async (err, res) => {
        if (err) {
            console.log('emailList err', err)
            result.send([])
        }
        const fileArr = res
        const taskList = []
        fileArr.forEach(async (fName, index) => {
            const data = fs.readFileSync("/home/" + emailName + "/Maildir/new/" + fName) 
            taskList.push(data)
        })

        const parseList = taskList.map(item => simpleParser(item))
        const resDataList = await Promise.all(parseList)

        result.send(resDataList)
      });
    } else {
      result.send([])
    }
  } else {
    result.send([])
  }
});

// read the raw blog text from the block chain
router.post("/originalblogFormChain", async (req, res) => {
  const { TransactionHash, chainIdHex } = req.body;

  const rpc = CHAIN_NET_RPC[chainIdHex];

  const web3 = new Web3(rpc);
  const block = await web3.eth.getTransaction(TransactionHash);

  let newdata = Buffer.from(block.input.replace(/^0x/, ""), "hex");

  if (block) {
    res.send({
      data: newdata.toString("utf-8"),
      code: 0,
      msg: "inquire success",
    });
  }
});

module.exports = router;
