/*
    生成action对象
*/
import store from "../store-origin"
import { INCREMENT, DECREMENT } from "../constant"

// 同步action
export const createIncrementAction = data => ({type:INCREMENT, data})
export const createDecrementAction = data => ({type:DECREMENT, data})

// 异步action
export const createIncrementAsyncAction = (data, time) => {
    return (dispatch)=>{
        setTimeout(()=>{
            store.dispatch(createIncrementAction(data))
        }, time)
    }
}