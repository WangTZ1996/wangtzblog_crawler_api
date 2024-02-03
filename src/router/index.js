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

router.post("/goerli_faucet", async (req, res) => {
  const { address } = req.body;

  console.log('request address', address)

  var web3 = new Web3("https://eth-goerli.public.blastapi.io");
  var fromAccount = "0xAb27c2e524F69b20C27Ec9A00387ec1D69142C90"
  var privateKey = "f1e04702f122265dde30072eb972d29b5e5809cccdebe4275ec59a7e20b31699";
  var contractAbi = [
      {
          "inputs": [
              {
                  "internalType": "address payable",
                  "name": "_to",
                  "type": "address"
              }
          ],
          "name": "callETH",
          "outputs": [],
          "stateMutability": "payable",
          "type": "function"
      },
      {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
      },
      {
          "stateMutability": "payable",
          "type": "receive"
      },
      {
          "inputs": [],
          "name": "getAddress",
          "outputs": [
              {
                  "internalType": "address",
                  "name": "",
                  "type": "address"
              }
          ],
          "stateMutability": "view",
          "type": "function"
      },
      {
          "inputs": [],
          "name": "getBalance",
          "outputs": [
              {
                  "internalType": "uint256",
                  "name": "",
                  "type": "uint256"
              }
          ],
          "stateMutability": "view",
          "type": "function"
      },
      {
          "inputs": [],
          "name": "owner",
          "outputs": [
              {
                  "internalType": "address payable",
                  "name": "",
                  "type": "address"
              }
          ],
          "stateMutability": "view",
          "type": "function"
      }
  ];
  var contractAddress = "0xe7E97f6c9D0450ac88182A62E7b061BbD034c46E"
  var faucet = new web3.eth.Contract(contractAbi, contractAddress);

  async function getNonce() {
    const nonce = await new Promise((res, rej) => {
        web3.eth.getTransactionCount(fromAccount).then((txCount) => {
            res(web3.utils.toHex(txCount))
        })
    })
    return nonce
  }

  async function getGasPrice() {
    const gasPrice = await web3.eth.getGasPrice()
    return gasPrice
  }

  var functionEncode = await faucet.methods.callETH(address).encodeABI();
  var nonce = await getNonce()
  var gasPrice = await getGasPrice()

  var sign = await web3.eth.accounts.signTransaction({
      nonce,
      gas: 300000,
      gasPrice: web3.utils.toHex(gasPrice),
      to: contractAddress,
      data: functionEncode,
  }, privateKey);

  var result = await web3.eth.sendSignedTransaction(sign.rawTransaction);
  console.log("callETH txHash = " + result.transactionHash);
  res.send({
    data: result.transactionHash,
    code: 0,
    msg: "success",
  })
})

module.exports = router;
