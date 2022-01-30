import React from 'react';
import ReactDOM from 'react-dom';

$(document).mousemove(function(e){ $("#image").css({left:e.pageX, top:e.pageY}); });

if (navigator.onLine === true) { //system is online } else { //system is offline }

var downloadPid = -1; function getStdErrOutput() { window.cep.process.stderr(downloadPid, function(progress) { var keys = progress.split(new RegExp('[# ]', 'g')); for(i=0; i<keys.length; i++){ if (keys[i] != '') { console.log(keys[i]); } } }); var result = window.cep.process.isRunning(downloadPid); if (result.data == true) { setTimeout(getStdErrOutput, 100); } } var doDownload = function() { var qURL = 'http://code.jquery.com/jquery-1.11.0.min.js'; var dest = '/tmp/test.js'; console.log("ext download (curl) " + qURL + " " + dest); var result = window.cep.process.createProcess('/usr/bin/curl', qURL, '-#', '-o', dest); downloadPid = result.data; console.log("download pid is " + downloadPid); getStdErrOutput(); }; doDownload();

window.cep.util.openURLInDefaultBrowser(‘http://example.com')

// html <body onLoad="onLoaded()"> <!--iframe src="https://www.trello.com"></iframe--> <!-- this line can be deleted as HTTPS blocks content being displayed in an iframe --> </body> // javascript function onLoaded() { window.location.href = "https://www.trello.com"; }

// create folder
var path = "/tmp/test";
var result = window.cep.fs.makedir(path);
if (0 == result.err){
  ...// success
} else {
  ...// fail
} 

// write file
var data = "This is a test.";
var path = "/tmp/test";
var result = window.cep.fs.writeFile(path, data);
if (0 == result.err){
  ...// success
} else {
  ...// fail
}

// write Encoding file
var data = "This is a test.";
var path = "/tmp/test";
data = cep.encoding.convertion.utf8_to_b64(data);
 
var result = window.cep.fs.writeFile(fileName, data, cep.encoding.Base64);
if (0 == result.err) {
  ...// success
} else {
  ...// fail
}

// read file
var path = "/tmp/test";
result = window.cep.fs.readFile(path, cep.encoding.Base64);
if(result.err === 0){
  //success
  var base64Data = result.data;
  var data = cep.encoding.convertion.b64_to_utf8(base64Data);
} else {
  ...// fail
}

// process
var result = window.cep.process.createProcess("usr/X11/bin/xterm");

if(result.err === 0){
  var pid = result.data;
  result = window.cep.process.isRunning(pid);
  if(result.data === true){
    // running                  
  }
}

mount: 挂载
unmount: 卸载

class Life extends React.Component {

    constructor(props){
        console.log('Count-constructor')
        super(props)
        this.state = {life:0,date:0}
    }

    // 卸载
    death = ()=>{
        ReactDOM.unmountComponentAtNode(document.getElementById('root'))
    }
    // 强制更新
    force = ()=>{
        ReactDOM.unmountComponentAtNode(document.getElementById('root'))
    }

    // 组件将要挂载
    componentWillmount() {
        console.log('componentWillmount')
    }

    // 组件render挂载

    // 组件挂载完毕
    componentDidMount() {
        this.timerID = setInterval(
            () => this.setState({
                date: new Date()
            }),
            1000
        );
    }
    
    // 组件将要卸载
    componentWillUnmount() {
        clearInterval(this.timerID)
    }
    
    // 组件是否更新
    shouldComponentUpdate(){
        console.log('shouldComponentUpdate')
        return true
    }

    // 组件将要更新
    componentWillUpdate(){
        console.log('componentWillUpdate')
    }

    // 组件render更新

    // 组件更新完毕
    componentDidUpdate() {
        console.log('componentDidUpdate')
    }

    // 初始化渲染、状态更新之后
    render() {
        console.log('render')
        const {life,date} = this.state
        return (
            <div>
                <h2>当前生命：{life}</h2>
                <h2>当前事件：{date}</h2>
                <button onClick={this.death}>不活了</button>
                <button onClick={this.force}>活了</button>
            </div>
        )
    }
}

ReactDOM.render(
    <Life />,
  document.getElementById('root')
)
