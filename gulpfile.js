var gulp        = require("gulp");
var ts          = require("gulp-typescript");
var inject      = require("gulp-inject");
var uglify      = require("gulp-uglify");
var concat      = require("gulp-concat");
var del         = require("del");

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


/************************************** 初始化发布环境 START ***************************************/
function init()
{
    //获取发包平台
    platform = process.argv[2].split("-")[1];

    //获取平台需要的ts代码
    allScriptPath = [];
    allScriptPath.push("./src/**/*.ts");

    // var curPlatform = Platforms[platform];

    //排除不需要的其他平台
    for (let key in Platforms)
    {
        if (key != platform)
            allScriptPath.push("!./src/Platform/" + Platforms[key] + ".ts");
    }
}

function initFail(cb)
{
    console.error("发包终止！");
    cb();
}

if (process.argv.length <= 2)
{
    console.error("请输入发布渠道");

    exports.default = initFail;
    return;
}

init();

console.log("当前发布平台:", Characters[platform]);

/************************************** 初始化发布环境 END ***************************************/

function clearSource(cb)
{
    del("./bin/js/**/*");
    del("./bin/*.js");
    del("./bin/*.html");
    cb();
}

//ts转为js
var tsProject = ts.createProject("./tsconfig.json");
function TsToJs(cb)
{
    gulp.src(allScriptPath)
        .pipe(tsProject())
        .pipe(gulp.dest(tsProject.config.compilerOptions.outDir))
        .pipe(concat("code.js"))
        .pipe(uglify())
        .pipe(gulp.dest("./bin/js"));
    
    cb();
}

//向html中注入js
function uglifyJS(cb)
{
    gulp.src("./index.html")
        .pipe(inject(gulp.src(['./bin/js/**/*.js', '!./bin/js/code.js'], { read: false }, {relative : true})))
        .pipe(gulp.dest("./bin"));

    cb();
}


exports.default = gulp.series(clearSource, TsToJs,uglifyJS);