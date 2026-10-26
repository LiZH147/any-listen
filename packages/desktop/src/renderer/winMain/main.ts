import path from 'node:path'

import { DEV_SERVER_PORTS, DATA_KEYS, STORE_NAMES } from '@any-listen/common/constants'
import { getPlatform, getOSVersion } from '@any-listen/nodejs/index'
import { BrowserWindow, Notification, dialog, screen, session } from 'electron'

import { appState } from '@/app'
import { collectMusic, uncollectMusic } from '@/modules/player'
import { themeState } from '@/modules/theme'
import { encodePath } from '@/shared/electron'
import { getStore } from '@/shared/store'
import { debounce, openDevTools as handleOpenDevTools, throttle } from '@/shared/utils'

import { winMainEvent } from './event'
import { rendererIPC } from './rendererEvent'
import { winMainState } from './state'
import { createTaskBarButtons, getWindowSizeInfo } from './utils'

let browserWindow: Electron.BrowserWindow | null = null

/** 窗口可缩放到的最小尺寸，与 view-main 布局的 650x400 约束保持一致 */
const MIN_WINDOW_WIDTH = 650
const MIN_WINDOW_HEIGHT = 400

interface SavedWindowBounds {
  width: number
  height: number
}

/**
 * 本次启动从存储恢复的窗口尺寸
 *
 * 屏幕缩放比例会把尺寸取整，恢复后的实际尺寸与保存值可能相差 1~2px，
 * 需要靠这个值把取整误差和用户的真实调整区分开。
 */
let restoredWindowSize: SavedWindowBounds | null = null

/** 读取用户上次调整后的窗口尺寸，没有保存过则返回 null */
const getRestoredWindowBounds = (): SavedWindowBounds | null => {
  let saved: SavedWindowBounds | null = null
  try {
    const raw = getStore(STORE_NAMES.DATA).get<SavedWindowBounds>(DATA_KEYS.windowBounds)
    if (raw && Number.isFinite(raw.width) && Number.isFinite(raw.height)) {
      saved = { width: Math.round(raw.width), height: Math.round(raw.height) }
    }
  } catch {}
  if (!saved) return null
  let { width, height } = saved
  // 显示器分辨率可能在两次启动之间发生变化（如拔掉外接屏），恢复前按当前主屏工作区夹一下
  try {
    const { workArea } = screen.getPrimaryDisplay()
    width = Math.min(width, workArea.width)
    height = Math.min(height, workArea.height)
  } catch {}
  return {
    width: Math.max(width, MIN_WINDOW_WIDTH),
    height: Math.max(height, MIN_WINDOW_HEIGHT),
  }
}

const saveWindowBounds = debounce(() => {
  if (!browserWindow) return
  // 全屏、最大化、最小化时的尺寸不是用户想要的窗口尺寸，不应保存
  if (winMainState.isFullScreen || browserWindow.isMaximized() || browserWindow.isMinimized()) return
  const { width, height } = browserWindow.getBounds()
  if (restoredWindowSize) {
    // 与恢复值只差一两个像素时属于屏幕缩放取整误差，不是用户调整的结果。
    // 若把它保存下来，窗口尺寸会在每次启动后继续变大。
    if (Math.abs(width - restoredWindowSize.width) < 3 && Math.abs(height - restoredWindowSize.height) < 3) return
    restoredWindowSize = null
  }
  try {
    getStore(STORE_NAMES.DATA).set<SavedWindowBounds>(DATA_KEYS.windowBounds, { width, height })
  } catch {}
}, 500)

const winEvent = () => {
  if (!browserWindow) return

  browserWindow.on('close', (event) => {
    if (appState.isSkipTrayQuit || !appState.appSetting['tray.enable']) {
      browserWindow!.setProgressBar(-1)
      winMainEvent.close()
      return
    }

    event.preventDefault()
    browserWindow!.hide()
  })

  browserWindow.on('closed', () => {
    browserWindow = null
  })

  // browserWindow.on('restore', () => {
  //   browserWindow.webContents.send('restore')
  // })
  browserWindow.on('focus', () => {
    winMainEvent.focus()
  })

  browserWindow.on('blur', () => {
    winMainEvent.blur()
  })

  browserWindow.on('enter-full-screen', () => {
    winMainState.isFullScreen = true
    winMainEvent.fullscreen(true)
  })
  browserWindow.on('leave-full-screen', () => {
    winMainState.isFullScreen = false
    winMainEvent.fullscreen(false)

    // macOS 退出全屏后会丢失窗口可调整大小的状态，需要重新打开
    if (import.meta.env.VITE_IS_MAC) {
      if (browserWindow && !browserWindow.isResizable()) {
        browserWindow.setResizable(true)
      }
    }
  })

  let showed = false
  const handlerReadyToShow = () => {
    if (import.meta.env.VITE_IS_LINUX) {
      if (showed) return
      showed = true
    }
    showWindow()
    setThumbarButtons()
    winMainEvent.ready_to_show()
  }

  // The `ready-to-show` event doesn't always fire on wayland.
  // Use the `did-finish-load` event on the web contents instead as that is similar enough
  // https://github.com/electron/electron/issues/48859
  // https://github.com/FreeTubeApp/FreeTube/pull/8294
  if (import.meta.env.VITE_IS_LINUX) {
    if (appState['electronParams.ozonePlatform'] == 'wayland') {
      browserWindow.webContents.once('did-finish-load', handlerReadyToShow)
    } else browserWindow.once('ready-to-show', handlerReadyToShow)
  } else {
    browserWindow.once('ready-to-show', handlerReadyToShow)
  }

  browserWindow.on('show', () => {
    winMainEvent.show()

    // 修复隐藏窗口后再显示时任务栏按钮丢失的问题
    setThumbarButtons()
  })
  browserWindow.on('hide', () => {
    winMainEvent.hide()
  })

  // 记录用户手动拖拽边缘调整后的窗口尺寸
  browserWindow.on('resize', saveWindowBounds)
}

export const createWindow = () => {
  closeWindow()
  const windowSizeInfo = getWindowSizeInfo(appState.appSetting['common.windowSizeId'])

  const theme = themeState
  const ses = session.fromPartition('persist:view-main')
  if (appState.proxy.host) {
    void ses.setProxy({
      proxyRules: `http://${appState.proxy.host}:${appState.proxy.port}`,
    })
  }

  const preloadUrl = path.join(encodePath(__dirname), './view-main.preload.js')

  /**
   * Initial window options
   */
  const options: Electron.BrowserWindowConstructorOptions = {
    height: windowSizeInfo.height,
    useContentSize: true,
    width: windowSizeInfo.width,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    frame: false,
    transparent: !appState.envParams.cmdParams.dt,
    hasShadow: appState.envParams.cmdParams.dt,
    // enableRemoteModule: false,
    // icon: join(appState.__static, isWin ? 'icons/256x256.ico' : 'icons/512x512.png'),
    roundedCorners: appState.envParams.cmdParams.dt,
    // 允许通过拖拽窗口边缘调整大小。透明无边框窗口同样有原生缩放边框，
    // 只有 Linux 需要先让窗口可调整大小才能进入全屏，见 setFullScreen
    resizable: true,
    maximizable: false,
    fullscreenable: true,
    show: false,
    webPreferences: {
      preload: preloadUrl,
      session: ses,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      webSecurity: false,
      nodeIntegration: false,
      sandbox: false,
      enableWebSQL: false,
      webgl: false,
      spellcheck: false, // 禁用拼写检查器
    },
  }
  if (import.meta.env.VITE_IS_MAC) {
    options.frame = true
    options.titleBarStyle = 'hidden'
    options.trafficLightPosition = { x: 12, y: 8 }
  }
  if (appState.envParams.cmdParams.dt) options.backgroundColor = theme.colors['--color-primary-light-1000']
  if (appState.appSetting['common.startInFullscreen']) {
    options.fullscreen = true
    winMainState.isFullScreen = true
  }
  browserWindow = new BrowserWindow(options)

  // 恢复用户上次拖拽调整后的窗口尺寸。窗口此时还没有显示，调整不会闪烁
  const restoredBounds = getRestoredWindowBounds()
  if (restoredBounds) {
    restoredWindowSize = restoredBounds
    browserWindow.setBounds(restoredBounds)
  }

  const winURL = import.meta.env.DEV
    ? `http://localhost:${DEV_SERVER_PORTS['view-main']}`
    : `file://${path.join(encodePath(__dirname), '../view-main/index.html')}`
  if (import.meta.env.DEV) {
    void browserWindow.loadURL(
      `${winURL}?os=${getPlatform()}&osver=${encodeURIComponent(getOSVersion())}&dt=${appState.envParams.cmdParams.dt}`
    )
  } else {
    void browserWindow.loadURL(
      `${winURL}?os=${getPlatform()}&osver=${encodeURIComponent(getOSVersion())}&dt=${appState.envParams.cmdParams.dt}&t=${encodeURIComponent(JSON.stringify(theme.colors))}`
    )
  }

  winEvent()

  if (appState.envParams.cmdParams.odt) handleOpenDevTools(browserWindow.webContents)

  // browserWindow.webContents.openDevTools()
}

export const isExistWindow = (): boolean => !!browserWindow
export const isShowWindow = (): boolean => {
  if (!browserWindow) return false
  return import.meta.env.VITE_IS_WINDOWS ? browserWindow.isVisible() : browserWindow.isVisible() && browserWindow.isFocused()
}

export const closeWindow = () => {
  if (!browserWindow) return
  browserWindow.close()
}

export const setProxy = (host: string, port: string) => {
  if (!browserWindow) return
  if (host) {
    void browserWindow.webContents.session.setProxy({
      proxyRules: `http://${host}:${port}`,
    })
  } else {
    void browserWindow.webContents.session.setProxy({
      proxyRules: '',
    })
  }
}

export const showSelectDialog = async (options: Electron.OpenDialogOptions) => {
  if (!browserWindow) throw new Error('main window is undefined')
  return dialog.showOpenDialog(browserWindow, options)
}
export const showDialog = ({ type, message, detail }: Electron.MessageBoxSyncOptions) => {
  if (!browserWindow) return
  dialog.showMessageBoxSync(browserWindow, {
    type,
    message,
    detail,
  })
}
export const minimize = () => {
  if (!browserWindow) return
  browserWindow.minimize()
}
export const maximize = () => {
  if (!browserWindow) return
  browserWindow.maximize()
}
export const unmaximize = () => {
  if (!browserWindow) return
  browserWindow.unmaximize()
}
export const toggleHide = () => {
  if (!browserWindow) return
  if (appState.appSetting['tray.enable']) {
    browserWindow.isVisible() ? browserWindow.hide() : showWindow()
  } else {
    browserWindow.isMinimized() ? showWindow() : browserWindow.minimize()
  }
}
export const toggleMinimize = () => {
  if (!browserWindow) return
  if (browserWindow.isVisible()) {
    if (browserWindow.isMinimized()) browserWindow.restore()
    else browserWindow.minimize()
  } else browserWindow.show()
}
export const showWindow = () => {
  if (!browserWindow) return
  if (browserWindow.isVisible()) {
    if (browserWindow.isMinimized()) browserWindow.restore()
    else browserWindow.focus()
  } else browserWindow.show()
}
export const hideWindow = () => {
  if (!browserWindow) return
  if (appState.appSetting['tray.enable']) {
    browserWindow.hide()
  } else {
    browserWindow.minimize()
  }
}
export const setWindowBounds = (options: Partial<Electron.Rectangle>) => {
  if (!browserWindow) return
  browserWindow.setBounds(options)
}
export const setProgressBar = (progress: number, options?: Electron.ProgressBarOptions) => {
  if (!browserWindow) return
  browserWindow.setProgressBar(progress, options)
}
export const setIgnoreMouseEvents = (ignore: boolean, options?: Electron.IgnoreMouseEventsOptions) => {
  if (!browserWindow) return
  browserWindow.setIgnoreMouseEvents(ignore, options)
}
export const toggleDevTools = () => {
  if (!browserWindow) return
  if (browserWindow.webContents.isDevToolsOpened()) {
    browserWindow.webContents.closeDevTools()
  } else {
    handleOpenDevTools(browserWindow.webContents)
  }
}

export const setFullScreen = (isFullscreen: boolean): boolean => {
  if (!browserWindow) return false
  // https://github.com/any-listen/any-listen/issues/190
  // in electron ^41.2.0, windows -dt mode need to set resizable to true before setting full screen
  if (appState.envParams.cmdParams.dt || import.meta.env.VITE_IS_LINUX) {
    // linux 需要先设置为可调整窗口大小才能全屏
    if (isFullscreen) {
      browserWindow.setResizable(true)
      browserWindow.setFullScreen(true)
    } else {
      browserWindow.setFullScreen(false)
      // windows/linux 退出全屏后需要重新打开可调整大小，否则窗口之后无法再拖拽边缘缩放
      if (!import.meta.env.VITE_IS_MAC) browserWindow.setResizable(true)
    }
  } else {
    browserWindow.setFullScreen(isFullscreen)
  }
  winMainState.isFullScreen = isFullscreen
  return isFullscreen
}

const taskBarButtonFlags: AnyListen.TaskBarButtonFlags = {
  empty: true,
  collect: false,
  play: false,
  next: true,
  prev: true,
}
export const setThumbarButtons = throttle(
  ({ empty, collect, play, next, prev }: AnyListen.TaskBarButtonFlags = taskBarButtonFlags) => {
    if (!import.meta.env.VITE_IS_WINDOWS) return
    if (!browserWindow) return
    taskBarButtonFlags.empty = empty
    taskBarButtonFlags.collect = collect
    taskBarButtonFlags.play = play
    taskBarButtonFlags.next = next
    taskBarButtonFlags.prev = prev
    browserWindow.setThumbarButtons(
      createTaskBarButtons(taskBarButtonFlags, (action) => {
        switch (action) {
          case 'collect':
            void collectMusic()
            break
          case 'unCollect':
            void uncollectMusic()
            break
          default:
            void rendererIPC.playerAction({ action })
            break
        }
      })
    )
  },
  50
)

export const setThumbnailClip = (region: Electron.Rectangle) => {
  if (!browserWindow) return
  browserWindow.setThumbnailClip(region)
}

export const clearCache = async () => {
  if (!browserWindow) throw new Error('main window is undefined')
  await browserWindow.webContents.session.clearCache()
}

export const getCacheSize = async () => {
  if (!browserWindow) throw new Error('main window is undefined')
  return browserWindow.webContents.session.getCacheSize()
}

export const getWebContents = () => {
  // if (!browserWindow) throw new Error('main window is undefined')
  return browserWindow?.webContents
}

/** 展示通知窗口 */
export const showNotification = async (title: string, message: string) => {
  if (!Notification.isSupported()) throw new Error('Notification is not supported')
  const notify = new Notification({
    title,
    body: message,
    icon: '',
  })
  notify.show()
}

/** 显示消息弹窗 */
export const showMessageBox = async (options: { type: Electron.MessageBoxOptions['type']; title: string; message: string }) => {
  if (!browserWindow) throw new Error('main window is undefined')
  return dialog.showMessageBox(browserWindow, options)
}

/** 显示错误消息弹窗 */
export const showErrorBox = (title: string, message: string) => {
  dialog.showErrorBox(title, message)
}

/** 显示打开弹窗 */
export const showOpenDialog = async (options: {
  title: Electron.OpenDialogOptions['title']
  defaultPath?: Electron.OpenDialogOptions['defaultPath']
  buttonLabel?: Electron.OpenDialogOptions['buttonLabel']
  filters?: Electron.OpenDialogOptions['filters']
  properties?: Electron.OpenDialogOptions['properties']
}) => {
  if (!browserWindow) throw new Error('main window is undefined')
  return dialog.showOpenDialog(browserWindow, options)
}

/** 显示保存弹窗 */
export const showSaveDialog = async ({
  selectFolder,
  ...options
}: {
  title: Electron.SaveDialogOptions['title']
  defaultPath?: Electron.SaveDialogOptions['defaultPath']
  buttonLabel?: Electron.SaveDialogOptions['buttonLabel']
  filters?: Electron.SaveDialogOptions['filters']
  properties?: Electron.SaveDialogOptions['properties']
  selectFolder?: boolean
}): Promise<Electron.SaveDialogReturnValue> => {
  if (!browserWindow) throw new Error('main window is undefined')
  if (selectFolder) {
    const openDialogResult = await dialog.showOpenDialog(browserWindow, {
      title: options.title,
      defaultPath: options.defaultPath,
      buttonLabel: options.buttonLabel,
      filters: options.filters,
      properties: ['openDirectory', 'createDirectory'],
    })
    if (openDialogResult.canceled) return { canceled: true, filePath: '' }
    return { canceled: false, filePath: openDialogResult.filePaths[0] }
  }
  return dialog.showSaveDialog(browserWindow, options)
}
