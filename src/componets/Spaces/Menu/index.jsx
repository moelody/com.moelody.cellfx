import React, { Component } from "react"

import { 
    DesktopOutlined,
    PieChartOutlined,
    FileOutlined,
    TeamOutlined,
    UserOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
} from "@ant-design/icons"

import { SMenu as Menu, SSubMenu as SubMenu } from "styles/Ant"
const { Item } = Menu

export default class MMenu extends Component {
    render() {
        return (
            <Menu theme="dark" defaultSelectedKeys={["1"]} mode="inline">
                <Item key="1" icon={<PieChartOutlined />}>
                    Option 1
                </Item>
                <Item key="2" icon={<DesktopOutlined />}>
                    Option 2
                </Item>
                <SubMenu key="sub1" icon={<UserOutlined />} title="User">
                    <Item key="3">Tom</Item>
                    <Item key="4">Bill</Item>
                    <Item key="5">Alex</Item>
                </SubMenu>
                <SubMenu key="sub2" icon={<TeamOutlined />} title="Team">
                    <Item key="6">Team 1</Item>
                    <Item key="8">Team 2</Item>
                </SubMenu>
                <Item key="9" icon={<FileOutlined />}>
                    Files
                </Item>
            </Menu>
        )
    }
}
