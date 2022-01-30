/* eslint-disable no-undef */
const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin") // 模板
const MiniCssExtractPlugin = require("mini-css-extract-plugin") // css 代码打包分离

const resolvePath = relativePath => path.resolve(__dirname, relativePath) // 根据相对路径获取绝对路径

const baseConfig = {
    entry: resolvePath("../src/index.jsx"),
    output: {
        path: resolvePath("../dist"),
        filename: "[name].bundle.js"
    },
    resolve: {
        alias: {
            rd: path.resolve(__dirname, "../src/redux"),
            styles: path.resolve(__dirname, "../src/styles"),
            hooks: path.resolve(__dirname, "../src/hooks")
        },
        extensions: [".js", ".jsx"] // 默认值: [".js",".json"]
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"]
            },
            {
                test: /\.less$/,
                use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader", "less-loader"]
            },
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: "babel-loader"
            },
            {
                test: /\.ya?ml$/,
                use: ["json-loader", "yaml-loader"]
            },
            {
                test: /\.svg$/,
                type: "asset/resource"
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: "react app",
            template: resolvePath("../public/index.html"),
            filename: "index.html"
        }),
        new MiniCssExtractPlugin({
            filename: `[name].[hash:8].css`
        })
    ]
}

module.exports = {
    resolvePath: resolvePath,
    baseConfig: baseConfig
}
