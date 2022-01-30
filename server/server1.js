const express = require('express')
const app = express()

app.use((request, response, next)=>{
    console.log('有人请求服务器1')
    console.log(request.get('Host'))
    console.log(request.url)
    next()
})

app.get('/students', (req, res)=>{
    const students = [
        {id:'001',name:'tom',age:18},
        {id:'002',name:'tom',age:18},
        {id:'003',name:'tom',age:18}
    ]
    res.send(students)
})

app.listen(5000, (err, port)=>{
    if(!err) console.log('服务器1启动成功了，地址为：http://localhost:5000/students')
})