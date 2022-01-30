import React, { Component } from 'react'
import { connect } from 'react-redux'

import {nanoid} from 'nanoid'

import { Select } from 'antd';

class Collections extends Component {

    add = () => {

    }

    render() {
        const { projects } = this.props.data;
        return (
            <div id="mainpane">
                <section>
                    <Routes>
                        <Route path="card" element={<Card animate={true} />} >
                            <Route path="board" element={<Board />} />
                        </Route>
                        <Route path="/" element={<Navigate to="card" />} />
                    </Routes>
                </section>
            </div>
        )
    }
}

export default connect(
    // 映射状态
    reducers => ({data: reducers.func}),
    // 映射操作状态的方法
    {
        jia: createIncrementAction,
        jian: createDecrementAction
    }
)(Collections)