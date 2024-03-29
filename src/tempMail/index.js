const { execSync } = require('child_process');
const taskList = []

/******** mail user script ********/
function addNewUser (userName) {
    execSync(`useradd -s /sbin/nologin ${userName}`)
    execSync(`mkdir /home/${userName}`)
    execSync(`mkdir /home/${userName}/Maildir`)
    execSync(`mkdir /home/${userName}/Maildir/new`)
    execSync(`mkdir /home/${userName}/Maildir/tmp`)
    execSync(`mkdir /home/${userName}/Maildir/cur`)
    execSync(`chmod -R 777 /home/${userName}/*`)
}
function delUser (userName) {
    execSync(`userdel ${userName}`)
    execSync(`rm -rf /home/${userName}`)
}

/******** task script ********/
function Task(id, mailUserDir) {
    const t = new Date().getTime()

    this.id = id
    this.createTime = t
    this.endTime = t + 10 * 60 * 1000
    this.maxAge = 10 * 60 * 1000
    this.mailName = mailUserDir
}
function createTask(id, mailUserName) {
    addNewUser(mailUserName)
    const t = new Task(id, mailUserName)
    taskList.push(t)
    return t
}
function removeTask(id) {
    let i;
    taskList.forEach((task, index) => {
        if (task.id === id) i = index
    })
    taskList.splice(i, 1)
}
function doTask(task) {
    const mailUserName = task.mailName
    delUser(mailUserName)
}
function initTaskLoop() {
    console.log('开启定时任务循环，定时任务周期 60s')
    const timer = setInterval(() => {
        const ts = new Date().getTime()

        taskList.forEach((task) => {
            if (task && task.endTime <= ts) {
                doTask(task)
                removeTask(task.id)
            }
        })
        console.log(taskList.length, ts, 'taskList')
    }, 60 * 1000)
}

module.exports.initTaskLoop = initTaskLoop
module.exports.createTask = createTask