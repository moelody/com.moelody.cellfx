import React from "react"
import ReactDOM from "react-dom"
import "./index.less"
import App from "./App.jsx"
import { Provider } from "react-redux"
import store from "./redux/store"

// ReactDOM.render(
//         <App />,
//     document.getElementById('root')
// );
ReactDOM.render(
    <Provider store={store}>
        <React.StrictMode>
            <App />
        </React.StrictMode>
    </Provider>,
    document.getElementById("root")
)
