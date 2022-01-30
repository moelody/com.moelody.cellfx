import React, { Component } from 'react'
import { connect } from 'react-redux'

import {nanoid} from 'nanoid'

import { Select } from 'antd';
import { createIncrementAction, createIncrementAsyncAction,createDecrementAction } from '../../redux/actions/action'

const provinceData = ['Zhejiang', 'Jiangsu'];

class Collections extends Component {

    add = () => {

    }

    render() {
        const { projects } = this.props.data;
        return (
            <section>
                <Select value={projects[1].name} style={{ width: 120 }} >
                    {
                        projects.map((project, index) => {
                            if(index){
                                return <Select.Option key={nanoid()}>{project.name}</Select.Option>
                            }
                        })
                    }
                </Select>
                <button onClick={() => {
                    this.jia(1)
                }}>下一个工程名</button>
            </section>
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