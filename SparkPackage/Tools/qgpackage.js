// var cmd         = require("node-cmd");
var exec        = require("child_process").exec;
var fs          = require("fs");
var sparkUtils  = require("./utils");
var util        = require("util");
var path        = require("path"); 

//用于快游戏打包

const op = 
{
    "root"      : "release/oppogame/quickgame/",
    "manifest"  : "manifest.json",
    "libs"      : "libs",
    "json"      : 
    {
        "package": "com.hhhj.minigunfire.kyx.nearme.gamecenter",
        "name": "迷你世界枪战精英",
        "versionName": "1.8.1.0",
        "versionCode": 68,
        "minPlatformVersion": 1045,
        "icon": "./icon3.png",
        "orientation": "landscape",
        "type": "game",
        "config": {
            "logLevel": "off"
        }
    }
}

//vv平台如果有不想压缩进code.js的库文件，需要在minigame.config中配置
const vv = 
{
    "root"      : "../publish_vv/quickgame/",
    "manifest"  : "src/manifest.json",
    "libs"      : "src/libs",
    "json"      : 
    {
        "package": "com.hhhj.minigunfire.vivominigame",
        "name": "迷你世界枪战精英",
        "icon": "/icon2.png",
        "versionName": "1.8.1.0",
        "versionCode": 39,
        "minPlatformVersion": 1056,
        "deviceOrientation": "landscape",
        "type": "game",
        "networkTimeout": {
            "request": 5000,
            "connectSocket": 5000,
            "uploadFile": 5000,
            "downloadFile": 5000
        },
        "config": {
            "logLevel": "log"
        },
        "display": {
            "statusbar": "false",
            "titleBar": ""
        },
        "orientation": "landscape",
        "thirdEngine": {
            "laya": "1.8.5beta"
        }
    }
}

const mz = 
{
    "root"      : "release/mz/",
    "manifest"  : "manifest.json",
    "libs"      : "",
    "json"      : 
    {
        "package": "com.hhhj.minigunfire.meizu",
        "name": "迷你世界枪战精英",
        "icon": "icon512.png",
        "versionName": "1.8.1.0",
        "versionCode": 1,
        "minPlatformVersion": "1067",
        "orientation": "landscape",
        "features": [
            {
                "name": "system.webview"
            },
            {
                "name": "system.prompt"
            }
        ],
        "type": "game",
        "networkTimeout": {
            "request": 5000,
            "connectSocket": 5000,
            "uploadFile": 5000,
            "downloadFile": 5000
        },
        "config": {
            "logLevel": "log",
            "debug": false
        },
        "display": {
            "statusbar": "false",
            "titleBar": ""
        },
        "debug": false
    }
}

const PLATFORM = 
{
    "op" : op,
    "vv" : vv,
    "mz" : mz
}


/** 开始打包rpk */
function startPackage(platform,newLibsDir)
{
    let platformJson = PLATFORM[platform];

    let manifestPath = platformJson.root + platformJson.manifest;
    let manifestJson = JSON.stringify(platformJson.json);

    //替换libs
    if(platformJson.libs != "")
    {
        let libsDir = platformJson.root + platformJson.libs;
        sparkUtils.deleteFolder(libsDir);
        sparkUtils.copyFolder(newLibsDir,libsDir)
    }

    //替换manifest
    fs.writeFileSync(manifestPath,"");
    fs.writeFileSync(manifestPath,manifestJson);

    let cdPath = platformJson.root;

    let cmd = "";

    switch(platform)
    {
        case "vv" :
            cmd = "npm run release";
        break;

        case "op" :
        case "mz" :
            cmd = "quickgame pack release";
        break;
        
        // case "mz" :
        //     cmd = "npm run release";
        // break;

        default:
            console.error("打包失败，非法平台参数!");
        return;
    }

    // //执行cmd命令
    console.error("开始打包" + platform);
    exec(cmd,{cwd : cdPath},function(err,stdout,stderr)
    {
        if(err)
            throw err;
        else
        {
            console.error(stdout);
        }
    });

}
    


module.exports = 
{
    startPackage,
}
