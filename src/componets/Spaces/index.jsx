import React, { Component } from "react"
import Search from "./Search"
import Menu from "./Menu"

import DragSider from "../DragSider"

export default class Spaces extends Component {
    state = {
        collapsed: false
    }

    onSearch = value => console.log(value)

    onCollapse = collapsed => {
        this.setState({ collapsed })
    }

    render() {
        const { collapsed } = this.state
        return (
            <DragSider>
                <div className="logo" />
                <Search />
                <Menu />
            </DragSider>
        )
    }
}
