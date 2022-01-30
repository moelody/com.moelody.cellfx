import PubSub from 'pubsub-js'

componentDidMount(){
    this.token = PubSub.subscribe('id', (_, stateObj)=>{
        this.setState(stateObj)
    })
}

PubSub.publish('id', obj)

componentWillUnmount(){
    PubSub.unsubscribe(this.token)
}

