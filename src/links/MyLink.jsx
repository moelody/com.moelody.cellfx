import React, { Component } from 'react'
import { NavLink } from 'react-router-dom'

export default class MyLink extends Component {
    render() {
        return (
            <NavLink className={({ isActive }) => isActive ? "red" : "blue"}  {...this.props}/>
        )
    }
}
