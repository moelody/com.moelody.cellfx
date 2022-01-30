const {
    merge
} = require("webpack-merge")

const {
    resolvePath,
    baseConfig
} = require("./webpack.base.conf");
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin'); // 错误提示

module.exports = merge(baseConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        host: 'localhost',
        port: 9000,
        proxy: {
            "/api1": {
                target: "http://localhost:5000",
                changeOrigin: true,
                pathRewrite: {
                    "^/api1": ""
                }
            }
        },
        hot: true,
        open: false
    },
    plugins: [
        new FriendlyErrorsWebpackPlugin()
    ]
})