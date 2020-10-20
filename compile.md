## umi-ui启动顺序

1.  node ./scripts/ui.js
2.  **打包**3个ui插件： plugin-ui-blocks/plugin-ui-tasks/preset-ui
3.  运行ui界面  ui/web
4.  客户端： 运行界面 packages/ui/web 执行app.ts  render方法初始化
    1. 获取三方静态资源
    2. 初始化socket
    3. 获取项目列表
    4. 如果是task路由 则表示打开一个项目
    5. 初始化ui插件的api一系列方法，用于拓展ui第三方插件
5.  服务端： packages/preset-ui/src/index.ts  引用了ui、task、blocks等插件 依次执行


## umi插件机制

1. preset-ui 作为umi的插件运行 (umi-ui暂时只能伴随项目启动，还没有做到全局启动)
2. 创建UmiUI实例（初始化socket和一系列针对web传过来的socket请求的处理）
3. 加载task、block插件


## umi-ui插件

UI 插件与普通 Umi 的插件实际是一样的原理。

只是比一般的 Umi 插件，多使用两个 API：

- `api.addUIPlugin` 用于加载 ui 的 umd 包
- `api.onUISocket` 为前端 ui 提供服务端接口


## 如何开放接口供第三方插件插件使用

1. umi会调用插件的入口文件，通过传参的形式


## ui-blocks插件

1. 通过window.postMessage通信
2. 通过babel插件，来注入一系列代码

## 创建与导入项目用到的 package 

1. yeoman-generator  脚手架生成工具
2. resolve-from  解析文件路径
3. binary-mirror-config 获取国内镜像配置
4. cross-spawn   同node spawn 只是做了跨平台兼容
5. execa  同node exec
6. glob   根据路径规则获取匹配到的所有文件路径
7. sylvanas 将ts文件转化为js文件
8. sort-package-json 可以删除掉空行并且排序
9. prettier 格式化文件
10. mem-fs mem-fs-editor 拷贝文件
11. babel系列包
12. mustache