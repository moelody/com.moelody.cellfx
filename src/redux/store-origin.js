// 引入创建store对象的api
import { createStore, applyMiddleware,combineReducers } from "redux"
// 引入为组件服务的reducer
import funcReducer from './reducers/func_reducer'
// 用于支持异步action
import thunk from 'redux-thunk'
// 引入开发者工具
// import { composeWithDevTools } from "redux-"

const allReducer = combineReducers({
    func: funcReducer
})

export default createStore(allReducer, applyMiddleware(thunk))
