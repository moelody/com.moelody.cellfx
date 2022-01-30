// 对象ID只能小写字母，不能带有空格，可下划线
// name 显示名
// url 网站链接
// command 提取img src的方法
// link 保存img src的图片链接


var getLinkData = {
    debug:['console.log("Hello JSON!");'],
    sgslpx: {
        name: "刷新页面领取二次元老婆 - echs.sgslpx.com",
        url: "http://echs.sgslpx.com/sj/",
        command: 'document.getElementById("link").src = getLinkData.sgslpx.url;',
        link: 'window.frames[0].document.getElementsByTagName("img")[0].src',
    }
};
