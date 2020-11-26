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

## 用到的 package 

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


## 工具

1. lerna + yarn workspaces 的 monorepos项目
2. babel插件编写


## 项目启动流程及插件加载调用

1. 项目本身暂时是作为umi插件启动，后期作者会改为全局包（同vue ui ）
2. 入口文件：preset-ui(依次调用) 
   1. registerMethods.js注册umi-ui新方法（addUIPlugin/ui界面, onUISocket/serve服务端:主要处理websocket请求）
   2. 启动umi-ui主界面及服务(开发调试socket服务在3000， 页面在8002会跨域，所以通过routes/common代理)
   3. addBubble  umi-ui辅助工具
   4. 引入ui插件
3. 加载插件（tasks、blocks）addUiPlugin(解析ui插件文件)) onUISocket（websocket处理服务）
4. UI界面是调用插件的? 获取插件umd文件，通过eval执行并传递PluginAPI参数


## task插件

### 创建项目

1. 安装umi-ui生成器
2. 安装依赖，进入create-umi通过generator生成项目
3. 根据模板package.json删除多余的文件，或者ts文件转化为js文件

### 启动项目

1. 使用了dva的数据流，调用exec执行任务，向后端发送callRemote请求
2. 后端接受请求并执行项目scripts脚本
3. terminal通信：
   1. 通过runCommand返回的子进程对象获取log
   2. 触发监听事件：TaskEventType.STD_OUT_DATA
   3. send（websocket）方法发送log到客户端
   4. 由于发送日志的type在serve没有声明，客户端是通过监听listenRemote获取到log
   5. 获取到客户端terminal元素写入log


## blocks插件

### 插入资产（babel插件）

1. 注入GUmiUIFlag全局组件（babel插件）
2. 插入区块
   1. 解析 url => git 地址
   2. 如果不存在，则 git clone 到本地临时目录
   3. git pull 更新到最新分支
   4. 依赖处理，处理依赖冲突、依赖安装、依赖写入
   5. 写区块到项目目录中（nodeJs copy 到目标路径）
   6. 写路由改文件内容（babel插件）