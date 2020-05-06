var gulp        = require("gulp");
var ts          = require("gulp-typescript");
var inject      = require("gulp-inject");
var uglify      = require("gulp-uglify");
var concat      = require("gulp-concat");
var del         = require("del");
var jsdom       = require("gulp-jsdom");
var fs          = require("fs");
var gulpif      = require("gulp-if");
var cmd         = require("node-cmd");
var util        = require("util");

//项目资源根路径
const ROOT_PATH         = "bin/"

//index路径
const INDEX_PATH        = "bin/index.html";

//库根路径
const LIBS_PATH         = "bin/libs/";

//代码根路径
const CODE_PATH         = "src/";

//代码编译路径
const CODE_COMPILE_PATH = "bin/js/";

//平台SDK路径
const PLATFORM_PATH     = "src/Platform/";

//发布根路径
var OUTPUT_ROOT_PATH    = "";

//库发布路径
var OUTPUT_LIB_PATH     = "";

//优先加载的libs
var PRE_LIBS            = [];

//没有特定顺序的libs
var POST_LIBS           = [];

/************************************** 初始化发布环境 START ***************************************/
function init(cb)
{

    //获取发包平台
    platform = process.argv[2].split("--")[1];

    fs.readFile("./publish.json",function(err,data)
    {
        if(err)
        {
            console.error(err);
            initFail();
            return;
        }
        
        var publish = data.toString();
        publish = JSON.parse(publish);

        //获取平台需要的ts代码
        allScriptPath = [];
        allScriptPath.push(CODE_PATH + "**/*.ts");

        var curPlatform = publish[platform];
        if (curPlatform == undefined)
        {
            initFail();
            return;
        }

        //存储需要加载的libs
        for(let key in curPlatform.preLibs)
        {
            PRE_LIBS.push(LIBS_PATH + curPlatform.preLibs[key]);            
        }
        for(let key in curPlatform.postLibs)
        {
            
            POST_LIBS.push(LIBS_PATH + curPlatform.postLibs[key]);            
        }

        //排除不需要的其他平台
        for (let key in publish)
        {
            if (key != platform)
                allScriptPath.push("!" + PLATFORM_PATH + publish[key].SDK_NAME + ".ts");
        }

        OUTPUT_ROOT_PATH = "release/" + platform + "/";
        OUTPUT_LIB_PATH  = OUTPUT_ROOT_PATH + "libs/";

        console.log("当前发布平台:", publish[platform].Characters);        

        cb();
    });
}

function initFail(cb)
{
    console.error("请检查平台类型！");    
}

if (process.argv.length <= 2)
{
    exports.default = initFail;
    return;
}

setPublishProgress();

/************************************** 初始化发布环境 END ***************************************/

//这里设置gulp打包顺序
function setPublishProgress()
{
    exports.default = gulp.series(init,clearSource,loadPreLibs,loadPostLibs,TsToJs,injectJsToHtml,combineLibs);
}

//清空发包路径
function clearSource()
{
    del(CODE_COMPILE_PATH).then();
    return del(OUTPUT_ROOT_PATH);
}

//引入配置好的libs
function loadPreLibs(cb)
{   
    if(PRE_LIBS.length <= 0) 
        return cb();

    return gulp.src(PRE_LIBS)
                .pipe(gulp.dest(OUTPUT_LIB_PATH + "preLibs/"));
}
function loadPostLibs(cb)
{   
    if(POST_LIBS.length <= 0) 
        return cb();

    return gulp.src(POST_LIBS)
                .pipe(gulp.dest(OUTPUT_LIB_PATH + "postLibs/"));
}

//ts转为js
var tsProject = ts.createProject("./tsconfig.json");
function TsToJs()
{
    return gulp.src(allScriptPath)
        .pipe(tsProject())
        .pipe(gulp.dest(CODE_COMPILE_PATH))
        .pipe(concat("code.js"))
        .pipe(uglify())
        .pipe(gulp.dest(OUTPUT_ROOT_PATH));
}

var libsPath = [];

//向html中注入js
function injectJsToHtml(cb)
{
    let preLibPath = OUTPUT_LIB_PATH + "preLibs/**/*.js";
    let postLibPath = OUTPUT_LIB_PATH + "postLibs/**/*.js";


    getLibs(OUTPUT_LIB_PATH,libsPath);

    return gulp.src(INDEX_PATH)
        .pipe(inject(gulp.src(preLibPath,{read : false}),{starttag : "<!-- inject:preLibs:{{ext}} -->"}))
        .pipe(inject(gulp.src(postLibPath,{read : false}),{starttag : "<!-- inject:postLibs:{{ext}} -->"}))
        .pipe(inject(gulp.src([CODE_COMPILE_PATH + '**/*.js', '!code.js','!**/code.js',"!" + preLibPath,"!" + postLibPath], { read: false })))
        .pipe(gulp.dest(OUTPUT_ROOT_PATH));
    
}


//打包需要用的libs
function combineLibs()
{
   return gulp.src(INDEX_PATH)
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
                let outPath = OUTPUT_LIB_PATH;
                if(splits.length >= 3)
                {
                    for(let i = 1; i < splits.length - 1;i++)
                        outPath += splits[i];
                }

                let realPath = ROOT_PATH + path;          
                gulp.src(realPath)   
                .pipe(gulp.dest(outPath));        
                
                //gulp.src是异步的，这里直接存上用
                let relativePath =  realPath.split(ROOT_PATH)[1];
                libsPath.push(relativePath);

            }
        }

        requireLibs();
    }));
}

//库名：库路径
var customLibsName = {};

//得到引用libs
function getLibs(path,filesList = [])
{
    var files = fs.readdirSync(path);
    files.forEach(function (itm, index) {
        var stat = fs.statSync(path + itm);
        if (stat.isDirectory()) 
        {
            getLibs(path + itm + "/", filesList)
        } 
        else 
        {
            path = path.split(OUTPUT_ROOT_PATH)[1];
            let fullPath = path + itm;

            //保存库的名字和对应路径，方便添加扩展到libs.js
            let libName = itm.split('.')[0];
            customLibsName[libName] = fullPath;

            filesList.push(fullPath);
        }

    })
}

//创建libs.js
function requireLibs()
{   

    fs.readFile("./libsetting.json",function(err,data)
    {
        if(err)
        {
            console.error(err);
            return;
        }
        
        var libSetting = data.toString();
        libSetting = JSON.parse(libSetting);

        //添加到libs.js结尾的字符串
        let endContent = "";
        
        //是否是被禁止的平台
        let isBan = false;

        for(let libName in customLibsName)
        {
            let jsonInfo = libSetting[libName];
            if(jsonInfo == undefined || jsonInfo == null) continue;
            let ban = jsonInfo.ban;

            for(let key in ban)
            {
                if(ban[key] == platform)
                {
                    isBan = true;
                    break;
                }
            }
            if(isBan) break;
            
            let curLibPath = customLibsName[libName];
            let content = util.format(jsonInfo.content,curLibPath);
            endContent += content;  
            
            //删除libsPath里的重复库
            let index = libsPath.indexOf(curLibPath);
            if(index >= 0)
                libsPath.splice(index,1);

        }

        let path = OUTPUT_ROOT_PATH + "libs.js";
        let content = "";
        for(let key in libsPath)
        {
            content += "require(\""  + libsPath[key] + "\");\n";
        }

        content += endContent;
    
        fs.writeFileSync(path,content,function(err)
        {
            if(err) throw err;
        })
    });
}

//测试cmd命令
// function cmdTest()
// {
//     cmd.get("ipconfig",function(err,data,stderr)
//     {
//         console.error(data);
//     })
// }
