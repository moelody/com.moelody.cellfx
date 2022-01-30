// import axios from 'axios';

// export function axioss() {
//     axios.get('http://localhost:9000/api1/students').then(
//         response => {
//             console.log('成改了', response.data)
//         },
//         error => {
//             console.log('失败了', error)
//         }
//     )
// }

export async function fetchh() {
    try{
        const response = await fetch('http://localhost:9000/api1/students')
        const data = await response.json()
        console.log(data)
    } catch(err){
        console.log('请求出错', err)
    }
}