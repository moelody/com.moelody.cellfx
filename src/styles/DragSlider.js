import styled from "styled-components"

export const Asider = styled.aside.attrs({
    className: "ant-layout-sider ant-layout-sider-dark ant-layout-sider-has-trigger"
})`
    .ant-layout-sider {
        position: relative;
        min-width: 0;
        background: #001529;
        transition: all 0.2s;
    }
`

export const Divider = styled.div`
    border-left: 2px solid #eeeeee;
    width: 0px;
    cursor: ew-resize;
`
