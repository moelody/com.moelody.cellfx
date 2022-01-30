import React, { useState, useRef, useEffect } from "react"
import throttle from "lodash/throttle"

import { SSider as Sider } from "styles/Ant"
import { Divider, Asider } from "styles/DragSlider"

// 实现元素左右拖拽的Hook逻辑
function useLeft2Right(resizeLine, setNavWidth) {
    useEffect(() => {
        let { current } = resizeLine

        let mouseDown = e => {
            let resize = throttle(function(e) {
                if (e.clientX > 150 && e.clientX < window.innerWidth * 0.8) {
                    setNavWidth(e.clientX)
                    localStorage.setItem("siderWidth", e.clientX)
                }
            }, 100)

            let resizeUp = function() {
                document.removeEventListener("mousemove", resize)
                document.removeEventListener("mouseup", resizeUp)
            }

            document.addEventListener("mousemove", resize)
            document.addEventListener("mouseup", resizeUp)
        }

        current.addEventListener("mousedown", mouseDown)

        return function() {
            current.removeEventListener("mousedown", mouseDown)
        }
    }, [])
}

export default function DragSlider({ children }) {
    let resizeLine = useRef(null)
    const [siderWidth, setSiderWidth] = useState(parseInt(localStorage.getItem("siderWidth")) || 150)

    useLeft2Right(resizeLine, setSiderWidth)

    return (
        // <Sider style={{ width: siderWidth }}>
        //     {children}
        //     <divider ref={resizeLine} />
        // </Sider>

        <Asider style={{ width: siderWidth }}>
            {children}
            <Divider className="dragbar" ref={resizeLine} />
        </Asider>
    )
}
