import React, { Component } from 'react'
import {nanoid} from 'nanoid'

import { Select } from 'antd';
import store from '../../redux/store'
import { createIncrementAction, createIncrementAsyncAction,createDecrementAction } from '../../redux/action'

const provinceData = ['Zhejiang', 'Jiangsu'];

export default class Collections extends Component {

    componentDidMount(){
        store.subscribe(()=>{
            this.setState({})
        })
    }

    render() {
        const { projects } = store.getState();
        console.log(projects)
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
                    // store.dispatch(createIncrementAction(1))
                    store.dispatch(createIncrementAsyncAction(1, 500))
                }}>下一个工程名</button>
            </section>
        )
    }
}
