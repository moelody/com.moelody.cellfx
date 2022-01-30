import React, { Component } from 'react'
import { Outlet } from "react-router-dom"

import MyLink from "../../links/MyLink"

export default class Live2D extends Component {
    render() {
        return (
            <div>
                <nav>
                    <MyLink to="model/参数?title=model&参数=search" state={{id:'01'}}>Model</MyLink>
                    <br />
                    <MyLink replace to="board">Board</MyLink>
                </nav>
                <h3>
                    this is Live2D
                </h3>
                <Outlet />
            </div>
        )
    }
}
