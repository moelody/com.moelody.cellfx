import { createSlice } from '@reduxjs/toolkit'

import data from "../../data.yml"

export const counterSlice = createSlice({
    name: 'counter',
    initialState: {
        ...data
    },
    reducers: {
        increment: (state, { payload }) => {
            state.projects[1].name = state.projects[1].name + payload
        }
    }
})

// Action creators are generated for each case reducer function
export const { increment } = counterSlice.actions

export const asyncIncrement = (payload) => dispatch =>{
    setTimeout(() => {
        dispatch(increment(payload))
    }, 1000)
}

export default counterSlice.reducer
