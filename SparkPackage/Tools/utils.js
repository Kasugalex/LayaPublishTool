var fs          = require("fs");
var adm_zip     = require('adm-zip');
var crypto      = require("crypto");
var util        = require("util");
var path        = require("path"); 

function copyFile(from,to)
{
    if(from == null || from == "" || to == null || to == "") return;
    fs.copyFileSync(from,to);
}

function copyFolder(from,to)
{
    if(from == null || from == "" || to == null || to == "") return;
    let files = [];
    if (fs.existsSync(to)) 
    {           
        // 文件是否存在 如果不存在则创建
        files = fs.readdirSync(from);
        files.forEach(function (file, index) 
        {
            var targetPath = from + "/" + file;
            var toPath = to + '/' + file;
            if (fs.statSync(targetPath).isDirectory()) 
            { 
                // 复制文件夹
                copyFolder(targetPath, toPath);
            } else 
            {                                    
                // 拷贝文件
                fs.copyFileSync(targetPath, toPath);
            }
        });
    } else 
    {
        fs.mkdirSync(to);
        copyFolder(from, to);
    }
}

function deleteFolder(dirPath)
{
    if(!fs.existsSync(dirPath)) return;

    let files = fs.readdirSync(dirPath);
    files.forEach(function(file,index)
    {
        let curPath = dirPath + "/" + file;
        if(fs.statSync(curPath).isDirectory())
            deleteFolder(curPath);
        else
            fs.unlinkSync(curPath);
    });
    fs.rmdirSync(dirPath);
}


/** 打包所有资源 */
function zipRoot(dirPath,targetPath,notAddTimeStamp)
{
    console.error("正在压缩资源到zip");
    var zip = new adm_zip();
    zip.addLocalFolder(dirPath);
    var time = new Date();
    let str = notAddTimeStamp ? "publish.zip" : util.format("publish%s%s%s%s.zip",time.getHours(),time.getMinutes(),time.getSeconds(),time.getMilliseconds());
    zip.writeZip(targetPath + str);
}

var jsonPath;
/** 根据文件MD5值前8位重命名 */
function renameFileWithMD5(dirPath,targetPath,_jsonPath)
{   
    //新的根目录
    let oriRoot = dirPath.split('/');
    let newDirPath = targetPath + "/";
    let oriLength = oriRoot.length - 1;
    for(let index = 1;index < oriLength;index++)
        newDirPath += oriRoot[index] + "/";
    newDirPath += oriRoot[oriLength];

    if(!fs.existsSync(targetPath))
        fs.mkdirSync(targetPath);
 
    jsonPath = _jsonPath;
    copyMD5File(dirPath,newDirPath);

    
}

function copyMD5File(from,to)
{
    if(from == null || from == "" || to == null || to == "") return;
    let files = [];
    if (fs.existsSync(to)) 
    {           
        // 文件是否存在 如果不存在则创建
        files = fs.readdirSync(from);
        files.forEach(function (file, index) 
        {
            var curPath = from + "/" + file;
            var toPath = to + '/' + file;
            if (fs.statSync(curPath).isDirectory()) 
            { 
                // 复制文件夹
                copyMD5File(curPath, toPath);
            } else 
            {                                    
                // 拷贝文件
                let fileContent = fs.readFileSync(curPath);
                let md5Value = crypto.createHash("md5").update(fileContent,'utf8').digest('hex');
                let md5Str = md5Value.substring(0,8); 
                let fileNames = file.split(".");
                let md5FileName = "";
                let length = fileNames.length - 1;
                for(let index = 0;index < length;index++)
                {
                    let splitStr = index == length - 1 ? "" :".";
                    
                    md5FileName += fileNames[index] + splitStr;
                }
                md5FileName += md5Str +"." + fileNames[length];

                let finalPath = util.format("%s/%s",to,md5FileName);   
                copyFile(curPath,finalPath);

                console.log(curPath);
                
                //得到相对路径
                let oriPath = from.split(global.ROOT_PATH)[1] + "/";

                let content = util.format(",\"%s%s\":\"%s%s\"",oriPath,file,oriPath,md5FileName);;
                //生成version.json
                if(!fs.existsSync(jsonPath))
                {
                    content = util.format("{\"%s%s\":\"%s%s\"",oriPath,file,oriPath,md5FileName);   
                }                
                else
                {
                    let lastJson = fs.readFileSync(jsonPath);
                    content = lastJson + content;
                }
                
                fs.writeFileSync(jsonPath,content);                 
            }
        });
    } else 
    {
        fs.mkdirSync(to);
        copyMD5File(from, to);
    }
}

function endCopyMD5File()
{
    let jsonContent = ""
    if(fs.existsSync(jsonPath))
        jsonContent = fs.readFileSync(jsonPath);
    fs.writeFileSync(jsonPath,jsonContent + "}");
}

/** key值是文件名称 */
function writeFilesWithKeyName(files,targetPath,parentNode = "")
{
    if(files == null || files.length <= 0) return;
    
    let targetDir = targetPath + parentNode;

    if(targetDir.endsWith('/'))
    {
        targetDir = targetDir.substring(0,targetDir.length - 1);
    }

    if(parentNode != null)
    {
        mkDirRecursive(targetDir);
    }

    if(files != null)
    {
        for(let key in files)
        {
            let filePath = files[key];
            if(fs.existsSync(filePath))
            {
                //cpoy文件夹
                if(fs.statSync(filePath).isDirectory())
                {
                    let dst = path.join(targetDir,key);
                    // console.error(dst);
                    copyFolder(filePath,dst);
                }
                else
                {
                    let content = fs.readFileSync(filePath);
                    fs.writeFileSync(targetDir + "/" + key,content);
                }
            }
        }
    }

}

/** 递归创建文件夹 */
function mkDirRecursive(dirname)
{
    if (fs.existsSync(dirname)) 
    {
        return true;
    } 
    else 
    {
        if (mkDirRecursive(path.dirname(dirname))) 
        {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}

module.exports = 
{
    copyFile,
    copyFolder,
    zipRoot,
    renameFileWithMD5,
    endCopyMD5File,
    deleteFolder,
    writeFilesWithKeyName,
    mkDirRecursive,
}