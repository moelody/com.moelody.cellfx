function CustomCSEvent(CsInterface) {
    this.CsInterface = CsInterface;
    this.extension_id = this.CsInterface.getExtensionID();
        
    this.addEventListener = (callback) => {
        const eventCallback = (event) => {
            let data = null;
            try {
                data = JSON.parse(event.data);
            } catch(e) { data = event.data }
            event.data = data;
            event.remove = () => {
                this.CsInterface.removeEventListener(this.extension_id, eventCallback);
            }
            callback(event);
        }
        return this.CsInterface.addEventListener(this.extension_id, eventCallback);
    }

    this.send = (extension_id, data, scope = 'APPLICATION') => {
        const event = new CSEvent(extension_id, scope);
        event.data = data;
        console.log(event);
        return this.CsInterface.dispatchEvent(event);
    }
}

module.exports = CustomCSEvent;