import React, { Component, lazy, Suspense } from "react"
import { Navigate, HashRouter as Router, Routes, Route } from "react-router-dom"

import { Layout, Menu } from 'antd';
import { 
    DesktopOutlined,
    PieChartOutlined,
    FileOutlined,
    TeamOutlined,
    UserOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
} from '@ant-design/icons';
const { Header, Content, Footer, Sider } = Layout;
const { SubMenu } = Menu;

import Collections from "./componets/Collections"
import Spaces from "./componets/Spaces"
// import Attributes from "./componets/Attributes"
// import Item from "./componets/Collections/Item"

// import Live2D from "./widgets/Live2D"
import Model from "./widgets/Live2D/Model"
import Board from "./widgets/Board"
const Live2D = lazy(() => import('./widgets/Live2D'))

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
                    <Spaces />
                    <Dragbar></Dragbar>
                    <Collections />
                    {/* <Attributes /> */}
                    {/* <Item /> */}
                    {/* <MyLink to="live2d">Live2D</MyLink>
                    <br></br>
                    <MyLink to="board">Board</MyLink>
                    <button onClick={this.getData}>点击获取</button>
                    <Routes>
                        <Suspense fallback={<h1>Loading.....</h1>}>
                            <Route path="live2d" element={<Live2D animate={true} />} >
                                <Route path="model/:param" element={<Model />} />
                                <Route path="board" element={<Board />} />
                            </Route>
                        </Suspense>
                        <Route path="board" element={<Board />} />
                        <Route path="/" element={<Navigate to="board" />} />
                    </Routes> */}
                </div>
            </>
        )
    }
}

// export default function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }
