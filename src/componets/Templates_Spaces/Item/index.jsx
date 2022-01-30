import React, { Component } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { increment, asyncIncrement } from 'rd/slices'

export default function Item() {
    
    const count = useSelector((state) => state.counter.projects[1].name)
    const dispatch = useDispatch()

    return (
        <>
            <button
                aria-label="Increment value"
                onClick={() => dispatch(increment(1))}
            >
            Increment
            </button>
            <button
                aria-label="asyncIncrement value"
                onClick={() => dispatch(asyncIncrement(1))}
            >
                AsyncIncrement
            </button>
            <span>{count}</span>
        </>
    )
}
