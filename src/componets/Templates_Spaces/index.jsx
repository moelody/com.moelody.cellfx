import React, { Component } from 'react'
import Header from './Header'
import Item from './Item'

export default class Spaces extends Component {
    render() {
        return (
            <section>
                <Header></Header>
                <Item></Item>
            </section>
        )
    }
}
