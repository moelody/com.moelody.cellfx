import data from "../../data.yml"

const initState = {
    ...data
}

export default function(preState=initState, action){
    const { type, data } = action
    switch (type) {
        case 'increment':
            preState.projects[1].name = preState.projects[1].name + data
            console.log(preState)
            return preState
        case 'decrement':
            return preState.projects[1] - data
    
        default:
            return preState
    }
}