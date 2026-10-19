# Any-Listen 插件（扩展）开发指南

> 本文档面向插件开发者与二次开发人员，覆盖 Any-Listen 桌面版的插件（Extension）体系、两种插件形态、manifest 规范、
> 运行时 API、安装/签名/更新流程，以及"插件能做什么 / 不能做什么"的能力边界。
> 文中的文件路径均相对于仓库根目录，并以源码约定名称为准（保留源码中的历史拼写笔误，便于对照检索）。

---

## 0. 先读这个：插件的能力边界（最重要）

在动手写插件前，必须先明确：**插件只能做“数据/逻辑层”的事，不能做“界面层”的事。**

插件（VM 沙箱里的用户插件）的全部能力来自 `require('any-listen')` 暴露的 API，边界如下：

- ✅ 能注册**资源动作**（音乐搜索 / 歌词 / 图片 / 试听 URL / 评论等，见 `contributes.resource`）
- ✅ 能注册**列表源**（`listProviders`，如 WebDAV 目录源）
- ✅ 能注册**命令**（`commands`，出现在全局命令面板 / 设置里）
- ✅ 能声明**设置面板**（`settings`，用表单 schema 描述）
- ✅ 自有**存储 / 配置**（局限于插件数据目录）
- ✅ 通过 `internet` 权限发起**网络请求**（支持 AbortSignal 取消）
- ✅ 弹窗 / 对话框、日志（logcat）、zlib / crypto / iconv 这套工具函数
- ✅ `isolate_context` 权限下，在沙箱里再嵌套一层 `createIsolateContext` 隔离上下文

- ❌ **不能注册全局/局部快捷键** → 这是主进程 `globalShortcut` + 渲染进程 `hotkey` 模块的事
- ❌ **不能修改任何界面 / DOM / CSS** → 播放详情页、桌面歌词、主题这些都在 `view-main` / `view-lyric` 渲染进程里编译好了
- ❌ 不能直接操作播放器（`player`）、歌单（`music_list`）——这两个 grant 目前是 `// TODO` 未接线
- ❌ 不能访问文件系统任意路径（storage / 读文件都被限制在插件目录内，或走受控的对话框 API）

**结论**：如果你想要的是「按空格切换播放/暂停」「美化播放详情页/桌面歌词」这类**改变应用本身**的需求，
那不是写插件，而是改应用源码（分别落在 `desktop` 主进程、`view-main`、`view-lyric`）。详见本文末尾「能力边界与归属对照」。

---

## 1. 总体：插件系统在哪儿运行

插件宿主是**一个独立的 `node:worker_threads` Worker 线程**，与 Electron 主进程、渲染进程隔离开：

- 宿主 worker 入口：`packages/shared/app/modules/worker/extensionService/index.ts`
- 主进程侧创建：`packages/desktop/src/worker/extenstion.ts`（注意文件名拼写 `extenstion`）
- 通信框架：`message2call`（跨线程 RPC），`MessageChannel` 传 port，`exposeWorker` 包裹后远程调用
- Host 崩溃可单独重启（`restartHost`）

宿主的完整能力面（IPC）见 `packages/shared/types/types/extension_ipc.d.ts` 的 `IPCExtension` 命名空间。

### 1.1 两种插件形态

| | 用户插件（User Extension） | 内部扩展（Internal Extension） |
|---|---|---|
| 运行方式 | Node `vm` 沙箱内执行 `extension.enter` | 直接在扩展 Worker 线程内运行 `setup()` |
| 信任级别 | 不可信，能力受限 | 内置、受信任 |
| 入口 | `manifest.main` 指向的脚本 | `main === ''`，代码内导出 `setup` |
| 参考实现 | 官方商店插件（见 §8） | `webdav`（见 §7） |

- 用户插件加载逻辑：`packages/shared/app/modules/worker/extensionService/shared/index.ts` 的 `loadExtension`
- 内部扩展加载逻辑：`packages/shared/app/modules/worker/extensionService/internalExtension/index.ts` 的 `loadExtension`

---

## 2. 用户插件：目录结构

一个用户插件安装后位于 `<用户数据>/AnyListenDatas/extension/ext/<id>_<version>/`，标准结构：

```
my-extension/
├── manifest.json          # 插件清单（必填）
├── main.js                # 入口脚本（manifest.main 指向的文件）
├── readme                 # 可选，纯文本介绍
├── icon.png               # 可选，图标（png/jpg/jpeg/webp/svg）
└── i18n/
    ├── en-us.json
    └── zh-cn.json
```

打包发布时是 `.tgz`（常量 `FILE_EXT_NAME = '.tgz'`，manifest 里叫 `ext.tgz`）。

### 2.1 常量约定（`@any-listen/common/constants`）

```
EXTENSION_ENGINE = '1.4.0'        # 引擎版本，manifest.target_engine 需与之匹配
pkgExtName = 'alix'
extDirName = 'ext'                # 插件目录名
tempDirName = 'temp'
dataDirName = 'datas'             # 插件运行数据目录
storageDirName = 'storage'
resourceDirName = 'resources'
storageDirPrefix = '@storage'
extensionDirPrefix = '@root'
configFileName = 'extensions.json' # 全局插件配置（记录启用状态）
mainifestName = 'manifest.json'    # 注意拼写笔误
logFileName = 'output.log'
signFileName = 'sig'
extBundleFileName = 'ext.tgz'
```

---

## 3. `manifest.json` 字段规范

权威类型定义：`packages/shared/types/types/extension.d.ts` 的 `AnyListen.Extension.Manifest`。

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 插件唯一标识，仅允许 `[\w-_.]`（推荐反向域名，如 `com.example.hello`） |
| `name` | ✅ | 显示名，可写 `{i18nKey}` 占位 |
| `version` | ✅ | Semver |
| `main` | ✅ | 入口脚本路径（相对插件目录） |
| `description` | 可选 | 可写 `{i18nKey}` 占位 |
| `author` | 可选 | 作者 |
| `homepage` | 可选 | 主页 |
| `icon` | 可选 | 图标路径 |
| `target_engine` | 可选 | 依赖的引擎版本（当前 `1.4.0`），不匹配则拒绝加载 |
| `license` / `categories` / `tags` | 可选 | 商店分类 |
| `grant[]` | 可选 | 权限（见 §3.1） |
| `contributes` | 可选 | 贡献点（见 §4） |
| `publicKey` | 可选 | RSA 公钥，用于 `sig` 验签；未签名可省略 |

**manifest 校验**（`packages/shared/app/modules/worker/extensionService/manifest.ts`）会做：
- 全字段超长截断（`MANIFEST_STRING_LIMIT`：如 id≤64、name≤128、description≤1024、readme≤10240、version≤32、main≤260）
- `formatManifest` 过滤 `grant[]` 为已知权限、解析 `contributes`
- `verifyManifest` 解析 `icon`/`main`（`buildPath` 防目录穿越），无 `main` 抛 `'Main enter not defined'`

### 3.1 权限（grant）

```ts
type Grant = 'internet' | 'player' | 'music_list' | 'isolate_context'
```

| 权限 | 作用 | 状态 |
|---|---|---|
| `internet` | 注入 `request` / `cancelRequest` | ✅ 可用 |
| `isolate_context` | 注入 `utils.createIsolateContext` | ✅ 可用 |
| `player` | 播放器控制 | ⚠️ `// TODO` 未接线 |
| `music_list` | 歌单操作 | ⚠️ `// TODO` 未接线 |

---

## 4. `contributes` 贡献点

类型见 `AnyListen.Extension.ExtensionManifest['contributes']`，共四种：

### 4.1 `resource` —— 声明“我提供哪些音乐源/资源动作”

```json
"resource": [
  { "id": "wy", "name": "网易云", "resource": ["musicSearch", "musicPic", "musicLyric", "musicUrl"] }
]
```

`resource` 取值是固定枚举（`RESOURCE` 常量，17 种动作）：

```
tipSearch, hotSearch, musicSearch, musicPic, musicLyric, musicUrl, musicPicSearch,
musicComment, songlistSearch, songlist, topSongs, albumSearch, album,
singerSearch, singer, lyricSearch, lyricDetail
```

### 4.2 `listProviders` —— 声明“我提供一个列表源”（如 WebDAV）

```json
"listProviders": [{ "id": "webdav", "name": "WebDAV", "form": [...] }]
```

`form[]` 是表单 schema，字段类型六种：`input`、`boolean`、`selection`、`configCheckbox`、`configCheckboxMultiple`、`lazzyParseMeta`。
`selection` 用 `enum`/`enumName` 提供下拉项；`configCheckbox*` 从插件配置动态读取枚举（`enumConfigFiled`/`enumFiled`/`enumNameFiled`/`enumDescriptionFiled`）。

### 4.3 `commands` —— 声明命令

```json
"commands": [{ "command": "listTransform", "name": "{list_transform}", "description": "..." }]
```

### 4.4 `settings` —— 声明设置面板

与 `listProviders[].form` 同构的六种表单类型，用户可在“设置 → 扩展”里配置，值持久化到插件配置。

---

## 5. 入口脚本：`require('any-listen')`

插件入口（`main.js`）运行在 VM 沙箱内，唯一合法模块名是 `require('any-listen')`，返回运行时 API 对象。
沙箱环境由 preload 脚本 `extension-preload.js`（见 `packages/shared/extension-preload/`）通过 `globalThis.env_setup(key, extensionJson, envJson)` 注入。

### 5.1 完整 API 面

权威类型：`packages/shared/extension-preload/src/types/api.d.ts` 的 `AnyListen_API.API`（第 1187–1225 行汇总）：

```ts
{
  env,                              // 环境信息 + onLocaleChanged
  app,                              // 对话框/文件
  logcat,                           // 日志（写 output.log）
  storage,                          // 文件存储（限制在 dataDirectory/storage 下）
  configuration,                    // getConfigs / setConfigs / onConfigChanged
  musicUtils,                       // createProxyUrl / writeProxyCache
  request,                          // 仅 internet 权限（可 AbortSignal）
  registerResourceAction,           // 注册音乐资源动作
  registerListProviderAction,       // 注册列表源动作
  command,                          // registerCommand / executeCommand / getCommands
  constants,                        // 常量
  utils,                            // crypto / iconv / zlib / dataConverter / (createIsolateContext)
  t,                                // i18n 翻译函数
}
```

真实可参考的插件入口样例见 §8 的 `lx-list-transform/main.js`：

```js
var api = require("any-listen");
var app = api.app;
var command = api.command;
var t = api.t;
var zlib = api.utils.zlib;

await command.registerCommand("listTransform", async () => {
  const [filePath] = await app.showOpenDialog({ filters: { "LX Music list file": ["lxmc", "json"] } });
  const fileData = await app.readOpenDialogFile(filePath, "binary");
  // ... 处理 ...
  await app.writeSaveDialogFile(savePath, "", result);
  app.showMessage(t("done"), { type: "info" });
});
```

### 5.2 VM 沙箱安全机制

- `vm.createContext({ codeGeneration: { strings: false, wasm: false } })` —— 禁止代码生成
- 每次 host 调用携带随机 UUID `key`，host 校验 `contextState.vmContexts.has(id)` 且 key 匹配，否则抛 `'host call illegal'`
- 定时器被按插件 id 计数托管；`console` 被删除（改用 logcat）；执行入口脚本有 5000ms 超时
- `env_setup` 执行后 `delete globalThis.env_setup` + `freezeEnv()` 冻结 API 对象

### 5.3 i18n / 存储 / 配置

- i18n：插件目录下 `i18n/en-us.json` + `i18n/<locale>.json`，`buildExtensionI18nMessage` 合并加载
- 存储：`storage.readFile/writeFile/...`，路径经 `buildPath` 限制在 `<dataDirectory>/storage` 下
- 配置：`configuration.getConfigs(keys)` / `setConfigs(datas)`（内部 `cloneData` 防外部篡改），持久化到 `extensions.json`

---

## 6. 安装 / 签名 / 更新流程

`packages/shared/app/modules/worker/extensionService/shared/index.ts`：

1. 下载 `.tgz` → `unpackExtension` 解压
2. `verifyExtension` 验签（若有 `sig` 文件 + `publicKey`，对 `ext.tgz` PEM 验签）
3. `parseExtension` 组装 Extension 对象
4. 写 `publicKey` 进 `manifest.json`
5. 若有远程 manifest，校验 `sha256`
6. `installExtension` → 移动到 `ext/<id>_<version>/`

管理动作（`manage.ts`）：`startExtension` / `enableExtension` / `disableExtension` / `restartExtension` / `uninstallExtension`（内部扩展不可 stop/uninstall）。

---

## 7. 内部扩展：`webdav` 参考实现

内部扩展不跑 VM，直接在 Worker 线程内运行。范例：`packages/shared/app/modules/worker/extensionService/internalExtension/extensions/webdav/`。

```ts
// index.ts
export const setup = async (extension, hostContext) => {
  initHostContext(hostContext)   // 固化 logcat + 整个 hostContext 到模块单例
  return { resourceAction, listProviderAction }   // 返回 ExtensionContext
}
```

- `setup(extension, hostContext): Promise<ExtensionContext>` —— hostContext 含 `logcat`、`i18n`、对话框 Boxs、存储、配置、`createProxyUrl`、`executeCommand` 等
- 返回的 `{ resourceAction, listProviderAction }` 是**异步分发器**，未命中抛 `not found`
- 内部扩展由 `extensions/index.ts` 的 `extensions` 数组登记（当前仅 `webdav`），`internal: true`、不可卸载

---

## 8. 真实可参考插件（来自本地安装目录）

| 插件 | 大小 | 学习点 |
|---|---|---|
| `lx-list-transform` (0.1.1) | 247 行 main.js | **最小范例**：单个命令、无权限、调试对话框 + zlib + i18n |
| `online-metadata` (0.4.7) | 316KB | 资源动作型：一个插件贡献 5 个音乐源 |
| `lx-api-source-loader` (0.1.7) | 24KB | `isolate_context` + `settings` 配置表单 + 多命令 |
| `gdstudio` (0.4.3) | 43KB | `internet/player/music_list` + 10+ 音乐源 |

这些插件的 `manifest.json` / `main.js` 在
`C:\Users\17238\AppData\Roaming\any-listen\AnyListenDatas\extension\ext\` 下，可直接对照源码学习。

---

## 9. 能力边界与归属对照（给二次开发者的决策表）

| 想做的事 | 属于插件吗？ | 正确落点 |
|---|---|---|
| 新增一个音乐源（搜索/歌词/URL） | ✅ 插件 | `contributes.resource` + `registerResourceAction` |
| 新增一个列表源（网盘/脚本源） | ✅ 插件 | `contributes.listProviders` + `registerListProviderAction` |
| 新增一个命令 | ✅ 插件 | `contributes.commands` + `registerCommand` |
| **按空格切换播放/暂停** | ❌ 核心功能 | 主进程 `globalShortcut` / 渲染进程 `hotkey`，已有 `playToggle` 命令 |
| **美化播放详情页** | ❌ 核心功能 | `view-main/src/components/layout/PlayDetail/` |
| **美化桌面歌词** | ❌ 核心功能 | `view-lyric/src/` |
| 改主题/皮肤 | ❌ 核心功能 | `view-main` / `view-lyric` 的 theme 模块 |

---

## 10. 速查附录

- 扩展类型定义：`packages/shared/types/types/extension.d.ts`、`extension_vm.d.ts`、`extension_ipc.d.ts`
- 运行时 API 类型：`packages/shared/extension-preload/src/types/api.d.ts`
- 宿主 Worker：`packages/shared/app/modules/worker/extensionService/`
- 内部扩展入口：`.../internalExtension/index.ts`（`loadExtension`）、`.../internalExtension/extensions/index.ts`（登记表）
- 常用命令清单：`packages/shared/common/command.ts`（`play` / `pause` / `playToggle` / `next` / `previous` ...）
- 热键模块：`packages/desktop/src/modules/hotKey/`、`packages/view-main/src/modules/hotkey/`