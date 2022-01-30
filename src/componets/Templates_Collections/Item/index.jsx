import React, { Component } from 'react'
import { useNavigate } from "react-router-dom"

export default function Item() {
    
    let navigate = useNavigate();
    const [item, setItem] = React.useState(0)

    // watch state item
    React.useEffect(()=>{
        console.log('DidMount&DidUpdate')
        return ()=>{
            console.log('WillUnmount')
        }
    }, [item])

    function add(){
        setItem(item => item+1)
    }

    return (
        <div>
            <button onClick={() => navigate(-1)}>Go back</button>
            <button onClick={add}>点我+1</button>
            <button onClick={() => navigate(1)}>Go forward</button>
        </div>
    )
}
