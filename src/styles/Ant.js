import styled from 'styled-components'
import { Layout, Menu, Input, Empty, Divider } from "antd"
import { 
    DesktopOutlined,
    PieChartOutlined,
    FileOutlined,
    TeamOutlined,
    UserOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
} from "@ant-design/icons"

const { Header, Content, Footer, Sider } = Layout
const { Search } = Input
const { SubMenu } = Menu

export const FLayout = styled(Layout)`

`

export const SSider = styled(Sider)`

`

export const SMenu = styled(Menu)`

`

export const SSubMenu = styled(SubMenu)`

`
export const SSearch = styled(Search)`

`
export const SInput = styled(Input)`
    border-radius: 5px;
    margin: 4px 5px 0px;
    width: auto;
    gap: 7px;
`

export const CEmpty = styled(Empty)`
    
`
export const FDivider = styled(Divider)`

`