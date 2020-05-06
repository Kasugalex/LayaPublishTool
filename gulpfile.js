var gulp        = require("gulp");
var ts          = require("gulp-typescript");
var inject      = require("gulp-inject");
var uglify      = require("gulp-uglify");
var concat      = require("gulp-concat");
var del         = require("del");
var jsdom       = require("gulp-jsdom");

//各个平台对应的SDK
const Platforms =
{
    "wx": "WX_MINI_GAME",
    "qq": "QQ_MINI_GAME",
    "bd": "BD_MINI_GAME",
}

const Characters = 
{
    "wx": "微信",
    "qq": "QQ",
    "bd": "百度",
}

//发布根目录
var OUTPUT_ROOT_PATH = "";

/************************************** 初始化发布环境 START ***************************************/
function init()
{
    //获取发包平台
    platform = process.argv[2].split("-")[1];

    //获取平台需要的ts代码
    allScriptPath = [];
    allScriptPath.push("./src/**/*.ts");

    var curPlatform = Platforms[platform];
    if (curPlatform == undefined)
    {
        return false;
    }

    //排除不需要的其他平台
    for (let key in Platforms)
    {
        if (key != platform)
            allScriptPath.push("!./src/Platform/" + Platforms[key] + ".ts");
    }

    OUTPUT_ROOT_PATH = "release/" + platform + "/";
}

function initFail(cb)
{
    console.error("请检查平台类型！");
    cb();
}

if (process.argv.length <= 2)
{
    exports.default = initFail;
    return;
}

//检测初始化是否成功
if(init() == false)
{
    exports.default = initFail;
    return;
}
console.log("当前发布平台:", Characters[platform]);

/************************************** 初始化发布环境 END ***************************************/

function clearSource()
{
   return del(OUTPUT_ROOT_PATH);
}

//ts转为js
var tsProject = ts.createProject("./tsconfig.json");
function TsToJs()
{
    let outPath = OUTPUT_ROOT_PATH + "res";
    return gulp.src(allScriptPath)
        .pipe(tsProject())
        .pipe(gulp.dest(outPath))
        .pipe(concat("../code.js"))
        .pipe(uglify())
        .pipe(gulp.dest(outPath));
}

//向html中注入js
function injectJsToHtml(cb)
{
    gulp.src("./bin/index.html")
        .pipe(inject(gulp.src([OUTPUT_ROOT_PATH + 'res/**/*.js', '!./code.js'], { read: false }, {relative : true})))
        .pipe(gulp.dest(OUTPUT_ROOT_PATH));
    
    cb();
}

//打包需要用的libs
function combineLibs()
{
   return gulp.src("./bin/index.html")
    .pipe(jsdom(function(document)
    {
        let allScript = document.getElementsByTagName("script");
        for(let key in allScript)
        {
            let path = allScript[key].src;
            if(path == undefined) continue;
            let splits = path.split('/');
            let prefix = splits[0];
            if(prefix && prefix == "libs")
            {
                // console.error(splits);
                let outPath = OUTPUT_ROOT_PATH + "libs/";
                if(splits.length >= 3)
                {
                    for(let i = 1; i < splits.length - 1;i++)
                        outPath += splits[i];
                }

                let realPath = "bin/" + path;                 
                gulp.src(realPath)   
                .pipe(gulp.dest(outPath));
            }
        }
    }));
}



exports.default = gulp.series(clearSource, TsToJs,injectJsToHtml,combineLibs);