import React, { Component } from "react"
import { SInput as Input } from "styles/Ant"
import { 
    SearchOutlined
} from "@ant-design/icons"

export default class SSearch extends Component {
    render() {
        return (
            <Input
                placeholder="Search Spaces"
                prefix={<SearchOutlined />}
            />
        )
    }
}
