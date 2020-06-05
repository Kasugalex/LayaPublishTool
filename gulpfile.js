var gulp        = require("gulp");
var inject      = require("gulp-inject");
var uglify      = require("gulp-uglify");
var concat      = require("gulp-concat");
var del         = require("del");
var jsdom       = require("gulp-jsdom");
var fs          = require("fs");
var gulpif      = require("gulp-if");
var util        = require("util");
var rename      = require("gulp-rename");
var plumber     = require("gulp-plumber");
var sparkUtils  = require("./SparkPackage/Tools/utils");
var publishres  = require("./SparkPackage/Tools/publishres");
var order       = require("gulp-order");
var qgpackage   = require("./SparkPackage/Tools/qgpackage");
var blpackage   = require("./SparkPackage/Tools/blpackage");
var __path      = require("path");
var exec        = require("child_process").exec;

//是否正式发布
var FORMAL_CDN          = true;

//是否压缩code.js
const CODE_UGLIFY       = true;

//项目资源根路径
const ROOT_PATH         = "bin/";

//全局根路径
global.ROOT_PATH        = ROOT_PATH;

//index路径
const INDEX_PATH        = "bin/publishIndex.html";

//源index路径
const ORI_INDEX_PATH    = "bin/index.html";

//ts调用js的定义库
const CODE_LIBS_PATH    = "libs/";

//库根路径
const LIBS_PATH         = "bin/libs/";

//代码根路径
const CODE_PATH         = "src/";

//代码编译路径
const CODE_COMPILE_PATH = "bin/js/";

//平台SDK路径
const PLATFORM_PATH     = "bin/js/Platform/";

//发布根路径
var OUTPUT_ROOT_PATH    = "";

//库发布路径
var OUTPUT_LIB_PATH     = "";

//优先加载的libs
var PRE_LIBS            = [];

//没有特定顺序的libs
var POST_LIBS           = [];

const PRE_LIBS_PATH     = "prelibs/";
const POST_LIBS_PATH     = "postlibs/";

let platform;
let curPlatformJson;
let args;

/************************************** 初始化发布环境 START ***************************************/

//编译前先检测各种配置
function preInit()
{
    if(platform == "bl")
    {
        if(global.BLMID == "" || global.BLMID == null)
        {
            console.error("发布B站需要先在blpackage中配置mid值");
            return false;
        }

        //检查是不是有publish目录
        if(fs.existsSync(curPlatformJson.buildPath) == false)
        {
            console.error("没有找到" + curPlatformJson.buildPath);
            return false;
        }
    }

    return true;
}

//得到需要编译的ts文件
function setJSFormat()
{
    //获取平台需要的ts代码
    allScriptPath = [];
    
    allScriptPath.push(CODE_COMPILE_PATH + "**/*.js");

    //存储需要加载的libs
    for(let key in curPlatformJson.preLibs)
    {
        PRE_LIBS.push(LIBS_PATH + curPlatformJson.preLibs[key]);            
    }
    for(let key in curPlatformJson.postLibs)
    {
        
        POST_LIBS.push(LIBS_PATH + curPlatformJson.postLibs[key]);            
    }

    //排除不需要的其他平台
    for (let key in publishJson)
    {
        if (key != platform)
            allScriptPath.push("!" + PLATFORM_PATH + publishJson[key].SDK_DIR + "/**/*.js");
    }

    OUTPUT_ROOT_PATH = "release/" + platform + "/";
    OUTPUT_LIB_PATH  = OUTPUT_ROOT_PATH + "libs/";
}

function init(cb)
{

    //获取发包平台
    args = process.argv[2].split("--")[1].split(" ");
    platform = args[0].toLowerCase();

    //第三个参数,随便输入啦，用来判断是不是发布正式CDN
    FORMAL_CDN = process.argv[3] == undefined;

    //打包资源
    if(platform == "res")
    {
        publishres.exportRes();
        return;
    }

    publishJson = fs.readFileSync("./publish.json");
    if(publishJson == null || publishJson == "")
    {
        console.error("读取publish.json失败");
        initFail();
        return;
    }
    publishJson = JSON.parse(publishJson.toString());
    curPlatformJson = publishJson[platform];
    copyPath = curPlatformJson.copyPath;
    if (curPlatformJson == undefined)
    {
        initFail();
        return;
    }

    //发布之前先检查一下环境
    if(preInit() == false) return;

    //得到需要发布的ts
    setJSFormat();

    console.error("等待编译...");
    exec("tsc",function(err,stdout,stderr)
    {
        console.error("编译成功");
        
        //修改发布平台和CDN
        replacePlatformAndCDN();
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


/************************************** 初始化发布环境 END ***************************************/


/************************************** 开始发布 START ***************************************/
function startPublish()
{
    setPublishProgress();
    
}
startPublish();

/************************************** 开始发布 END ***************************************/

/************************************** 发布前的准备 END ***************************************/

/** 替换GlobalConfig.js里的平台和CDN */
function replacePlatformAndCDN()
{

    let globalConfig = "bin/js/MiniGameLogic/GlobalConfig.js";
    if(!fs.existsSync(globalConfig)) return;
    
    let SDK_NAME = curPlatformJson.SDK_NAME;

    let content = fs.readFileSync(globalConfig);

    let contentStr = content.toString();
    let splits = contentStr.split("//TAG:END");

    let cdnStr = "";
    let platformStr = "";
    for(let key in splits)
    {
        let str = splits[key];
        let cdnStart = str.indexOf("TAG:CDN");
        if(cdnStart > 0)
            cdnStr = str.substring(cdnStart + 8);
        let platformStart = str.indexOf("TAG:PLATFORM");
        if(platformStart > 0)
            platformStr = str.substring(platformStart + 12);
    }

    let CDN_TYPE = FORMAL_CDN == true ? "Formal_Cdn" : "Test_Cdn";
    let cdn_Str = util.format("\tGameConfig.CDN_TYPE = eCdnType.%s;\n\t",CDN_TYPE)
    contentStr = contentStr.replace(cdnStr,cdn_Str);

    let sdk_Str = util.format("\n\tGameConfig.PLATFORM = function () { return new %s(); };\n\t",SDK_NAME);
    contentStr = contentStr.replace(platformStr,sdk_Str);

    fs.writeFileSync(globalConfig,contentStr);
}

/************************************** 发布前的准备 END ***************************************/


/************************************** Gulp相关函数 START ***************************************/

//这里设置gulp打包顺序
function setPublishProgress()
{

    exports.default = gulp.series(init,clearSource,loadPreLibs,loadPostLibs,findNeedLibs,outputLibs,getOrderJs,ExportJs,injectContentToHtml,getAllLibs,finalStep);

    // exports.default = gulp.series(init);
}

//清空发包路径
function clearSource()
{
    // del(CODE_COMPILE_PATH);
    return del(OUTPUT_ROOT_PATH);
}

//引入优先加载的libs
function loadPreLibs(cb)
{   
    if(PRE_LIBS.length <= 0) 
        return cb();

    return gulp.src(PRE_LIBS)
                .pipe(gulp.dest(OUTPUT_LIB_PATH + PRE_LIBS_PATH));
}

//引入无特定加载顺序的libs
function loadPostLibs(cb)
{   
    if(POST_LIBS.length <= 0) 
        return cb();

    return gulp.src(POST_LIBS)
                .pipe(gulp.dest(OUTPUT_LIB_PATH + POST_LIBS_PATH));
}

//库名.js：绝对路径
var combineLibsPath = {};

var libsPath = [];

//取出index.html中的libs
function findNeedLibs()
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
                        let realPath = ROOT_PATH + path;       
     
                        //key值是库名称.js
                        let libName = splits[splits.length - 1];
                        combineLibsPath[libName] = path.split(libName)[0];
                        
                        //gulp.src是异步的，这里直接存上用
                        let relativePath =  realPath.split(ROOT_PATH)[1];
                        libsPath.push(relativePath);
        
                    }
                }        
            }));
            
}

//打包需要用的libs
function outputLibs()
{
    let needLibsPath = [];
    for(let key in libsPath)
    {
        needLibsPath.push(ROOT_PATH + libsPath[key]);
    }
    // console.error("--------------------------------------");
    // console.error(needLibsPath);

    return gulp.src(needLibsPath)
            .pipe(rename(function(path)
            {
                let libName = path.basename + path.extname;
                let dirPath = combineLibsPath[libName]; 
                let ret = {dirname : dirPath,basename : path.basename,extname : path.extname};
                return ret;
            }))
            .pipe(gulp.dest(OUTPUT_ROOT_PATH));
}

var orderJs = [];
/** 得到正确执行顺序的js */
function getOrderJs()
{   
    return gulp.src(ORI_INDEX_PATH)
            .pipe(jsdom(function(document)
            {
                let allScript = document.getElementsByTagName("script");
                for(let key in allScript)
                {
                    let path = allScript[key].src;
                    if(path == undefined) continue;
                    let splits = path.split('/');
                    let prefix = splits[0];
                    if(prefix && prefix == "js")
                    {                 
                        orderJs.push("**/" + splits[splits.length - 1]);
                    }
                }        
            }));
}

function ExportJs()
{
    // console.error(orderJs);
    return gulp.src(allScriptPath)    
    // return gulp.src("bin/js/Debug.js")    
        .pipe(order(orderJs))
        .pipe(rename(function(path){ console.error(path.basename + path.extname)}))
        .pipe(concat("code.js"))
        .pipe(gulpif(CODE_UGLIFY,uglify()))
        .pipe(gulp.dest(OUTPUT_ROOT_PATH));
}

//向html中注入js或者其他内容
function injectContentToHtml()
{
    let preLibPath = OUTPUT_LIB_PATH + PRE_LIBS_PATH  + "**/*.js";
    let postLibPath = OUTPUT_LIB_PATH + POST_LIBS_PATH + "**/*.js";

    let css = curPlatformJson.css;
    
    let cssArray = [];
    if(css != null)
        for(let key in css)
        {
            cssArray.push(css[key]);
        }

    //没有就随便给一个啦，防止报错
    if(cssArray.length == 0) cssArray.push("null.css");

    return gulp.src(INDEX_PATH)
    .pipe(inject(gulp.src(preLibPath,{read : false}),{starttag : "<!-- inject:preLibs:{{ext}} -->",transform:function(filePath,file,i,length){
        let ret = util.format("<script src=\"%s\"></script>",filePath.split(OUTPUT_ROOT_PATH)[1]);
        return ret;
    }}))
    .pipe(inject(gulp.src(postLibPath,{read : false}),{starttag : "<!-- inject:postLibs:{{ext}} -->",transform:function(filePath,file,i,length){
        let ret = util.format("<script src=\"%s\"></script>",filePath.split(OUTPUT_ROOT_PATH)[1]);
        return ret;
    }}))
    .pipe(inject(gulp.src(cssArray,{allowEmpty : true}),{starttag : "<!-- inject:css:{{ext}} -->",transform:function(filePath,file,i,length){
        let splits = filePath.split('/');
        let ret = util.format("<link rel=\"stylesheet\" href=\"res/css/%s\">",splits[splits.length - 1]);
        return ret;
    }}))
    // .pipe(inject(gulp.src([CODE_COMPILE_PATH + '**/*.js', '!**/code.js',"!" + preLibPath,"!" + postLibPath], { read: false })))
    .pipe(rename("index.html"))
    .pipe(gulp.dest(OUTPUT_ROOT_PATH));
    
}

var customLibsName = {};
//得到导出的所有libs，进行require
function getAllLibs()
{
    let copyLibs = curPlatformJson.copyLibs;
    if(copyLibs != null)
    {
        let toPath = curPlatformJson.copyPath.libs;
        if(toPath != null)
        {
            for(let key in copyLibs)
            {
                let fromPath = copyLibs[key];
                if(fs.existsSync(fromPath))
                {
                    if(fs.statSync(fromPath).isDirectory())
                    {
                        let realToPath = __path.join(toPath,key);
                        sparkUtils.copyFolder(fromPath,realToPath);
                    }
                }
                else
                {
                    sparkUtils.copyFile(fromPath,toPath + POST_LIBS_PATH);
                }
            }

        }
    }

    return gulp.src(OUTPUT_LIB_PATH + "**/*.js")
            .pipe(rename(function(path)
            {
                let dirPath = util.format("%s%s/%s%s",CODE_LIBS_PATH,path.dirname,path.basename,path.extname);
                // console.error(dirPath);
                if(libsPath.indexOf(dirPath) == -1)
                    libsPath.push(dirPath);

                customLibsName[path.basename] = dirPath;
            }));
}

function finalStep(cb)
{

    //创建libs.js文件引用库
    requireLibs();

    //导出配置里的includeFile
    exportIncludeFile();

    //copy
    copyCode();

    //引入外部js
    includeExternalJS();

    //后处理
    postCMD();

    cb();
}

//创建libs.js
function requireLibs()
{   
    let data = fs.readFileSync("./libsetting.json");
    if(data == null)
        return;

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
        endContent += content + "\n";  
        
        //删除libsPath里的重复库
        let index = libsPath.indexOf(curLibPath);
        if(index >= 0)
            libsPath.splice(index,1);

    }

    let path = OUTPUT_ROOT_PATH + "libs.js";
    let content = "";
    for(let key in libsPath)
    {
        content += util.format("require(\"%s\");\n",libsPath[key]); 
    }

    content += endContent;

    fs.writeFileSync(path,content);

    if(copyPath)
    {
        let libFileToPath = copyPath.libsJS;
        if(libFileToPath)
            sparkUtils.copyFile(path,libFileToPath);
    }
}

/** 导出配表资源到relese路径下 */
function exportIncludeFile()
{
    let includeFromFile = curPlatformJson.includeFile;
    sparkUtils.writeFilesWithKeyName(includeFromFile,OUTPUT_ROOT_PATH);

    let cssFile = curPlatformJson.css;
    sparkUtils.writeFilesWithKeyName(cssFile,OUTPUT_ROOT_PATH,"res/css");
}

//将code.js和libs复制到配置（publish.json）对应的目录
function copyCode()
{
    
    // console.error(copyPath);
    // console.error("---------------------");
    if(copyPath == null || copyPath == "") return;

    let codejsFromPath = OUTPUT_ROOT_PATH + "code.js";
    let libsFromPath = OUTPUT_LIB_PATH;
    
    let indexFromPath = OUTPUT_ROOT_PATH + "index.html";

    //找到配置目录下所有文件
    let codejsToPath = copyPath.codeJS;
    let libsToPath = copyPath.libs;
    let indexToPath = copyPath.html;

    sparkUtils.copyFile(codejsFromPath,codejsToPath);
    sparkUtils.copyFile(indexFromPath,indexToPath);
    sparkUtils.copyFolder(libsFromPath,libsToPath);

    console.log("拷贝完成!");
}

// 引入外部链接
function includeExternalJS()
{
    let externalJS = curPlatformJson.externalJS;

    if(externalJS == null || externalJS == {}) return;

    let indexPath = __path.join(OUTPUT_ROOT_PATH,"index.html");
    if(!fs.existsSync(indexPath)) return;
    let content = fs.readFileSync(indexPath);

    let contentStr = content.toString();
    let TAG = "<!-- inject:postLibs:js -->";

    let replaceContent = TAG + "\n\t";
    for(let key in externalJS)
    {
        let jsURL = externalJS[key];
        // replaceContent += jsURL + "\n\t";
        replaceContent += util.format("<script src=\"%s\"></script>\n\t",jsURL);
    }

    contentStr = contentStr.replace(TAG,replaceContent);
    
    fs.writeFileSync(indexPath,contentStr);
}

//判断平台是不是需要在替换完成后执行对应的命令
function postCMD()
{
    if(platform == "uc")
    {
        sparkUtils.zipRoot(OUTPUT_ROOT_PATH,OUTPUT_ROOT_PATH);
    }
    else if(platform == "vv" || platform == "op" || platform == "mz")
    {
        qgpackage.startPackage(platform,OUTPUT_LIB_PATH);
    }else if(platform == "bl")
    {
        blpackage.startPackage(curPlatformJson.buildPath);
    }
}
/************************************** Gulp相关函数 END ***************************************/