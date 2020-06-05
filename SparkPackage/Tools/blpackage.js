var exec        = require("child_process").exec;

var bl_json     = 
{
    "version": "1.8.1",
    "appId": "biligame55ec1bca360d5632",
    "deviceOrientation": "landscape",
    "showStatusBar": false,
    "openDataContext": "openDataContext",
    "networkTimeout": {
        "request": 10000,
        "connectSocket": 10000,
        "uploadFile": 10000,
        "downloadFile": 10000
    },
    "navigateToMiniProgramAppIdList": [],
    "subpackages": [
        {
        "name": "subpackage",
        "root": "subpackage"
        }
    ],
    "test": {
        "ad": {
        "enable": true,
        "mode" : "success"
        }
    }
}

//需要配上mid
global.BLMID = "";
function startPackage(buildPath)
{
    let commond = "bili-sgame-cli serve " + global.BLMID;
    exec(commond,{cwd : buildPath},function(err,stdout,stderr)
    {
        if(err)
            throw err;
        else
        {
            let url = stdout.split("调试二维码地址:")[1];
            url = url.replace(/[\r\n]/g,"");
            console.error("地址: " + url + "  结束");
            switch (process.platform) {
                case "darwin":
                    exec('open ' + url);
                break;
                case "win32":
                    exec('start ' + url);
                break;
                default:
                    exec('xdg-open', [url]);
            }
        }
    });
}

module.exports = 
{
    startPackage,
}