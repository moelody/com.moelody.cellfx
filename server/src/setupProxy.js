const proxy = require('http-proxy-middleware')

module.exports = function (app) {
    app.use(
        proxy('/apil', { //api1是需要转发的请求(所有带有/api1前缀的请求都会转发给5000)
            target: 'http://localhost:5000', //配置转发目标地址(能返回数据的服务器地址)
            changeorigin: true, //控制服务器接收到的请求头中host字段的值
            /*
            changeorigin设置为true时,服务器收到的请求头中的host为: localhost: 5000
            changeorigin设置为false时,服务器收到的请求头中的host为: localhost: 3000
            changeorigin默认值为false,但我们一般将changeorigin值设为true
            */
            pathRewrite: {
                '^/api1': ''
            } //去除请求前缀,保证交给后台服务器的是正常请求地址(必须配置)
        }),
        proxy('/api2', {
            target: 'http://localhost:5001',
            changeorigin: true,
            pathRewrite: {
                '^/api2': ''
            }
        })
    )
}