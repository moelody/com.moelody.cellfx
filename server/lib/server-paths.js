const path = require("path");

const appData = path.normalize(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"));
const extensionData = path.normalize(appData + "/MoCode");
const temp = path.normalize(extensionData + "/temp");
const config = path.normalize(extensionData + "/config");
const backup = path.normalize(extensionData + "/backup");
const database = path.normalize(extensionData + "/database");

module.exports = {
    appData,
    extensionData,
    temp,
    backup,
    config,
    database
};