var sparkUtils  = require("./utils");

//发布资源根路径
const PUBLISH_RES_PATH  = "../publish_web";

/** 打包资源 */
function exportRes()
{
    console.error("开始打包资源")
    //先清空发布路径
    sparkUtils.deleteFolder(PUBLISH_RES_PATH);
    var jsonPath = PUBLISH_RES_PATH + "/version.json";

    // sparkUtils.renameFileWithMD5("bin/libs",PUBLISH_RES_PATH,jsonPath);
    sparkUtils.renameFileWithMD5("bin/res",PUBLISH_RES_PATH,jsonPath);

    sparkUtils.endCopyMD5File();

    sparkUtils.zipRoot(PUBLISH_RES_PATH,PUBLISH_RES_PATH + "/");

    console.error("资源导出成功!");

}

module.exports = 
{
    exportRes
}