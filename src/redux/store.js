// 引入创建store对象的api
import { configureStore } from '@reduxjs/toolkit'

// 引入为组件服务的reducer
import counterReducer from './slices'

export default configureStore({
    reducer: {
        counter: counterReducer
    },
})
