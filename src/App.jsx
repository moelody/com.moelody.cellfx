import React, { Component, lazy, Suspense } from "react"
import { Navigate, HashRouter as Router, Routes, Route } from "react-router-dom"

import { FLayout } from "styles/Ant"

// import Collections from "./componets/Collections"
import Spaces from "./componets/Spaces"
// import Attributes from "./componets/Attributes"
// import Item from "./componets/Collections/Item"

// import Live2D from "./widgets/Live2D"
import Model from "./widgets/Live2D/Model"
import Board from "./widgets/Board"
const Live2D = lazy(() => import("./widgets/Live2D"))

import MyLink from "./links/MyLink"

export default class App extends Component {
    getData = async () => {
        try {
            // const response = await fetch('http://localhost:9000/api1/students')
            const response = await fetch("http://localhost:5000/students")
            const data = await response.json()
            alert(data)
        } catch (err) {
            alert("请求出错", err)
        }
    }

    render() {
        return (
            <>
                <div id="main-container">
                    <FLayout style={{ minHeight: "100vh" }}>
                        <Spaces />
                        {/* <Collections /> */}
                        {/* <Layout className="site-layout">
                            <Header className="site-layout-background" style={{ padding: 0 }}>
                                {React.createElement(this.state.collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                                    className: "trigger",
                                    onClick: this.toggle
                                })}
                            </Header>
                            <Content
                                className="site-layout-background"
                                style={{
                                    margin: "24px 16px",
                                    padding: 24,
                                    minHeight: 280
                                }}>
                                Content
                            </Content>
                        </Layout> */}
                    </FLayout>
                </div>
            </>
        )
    }
}
