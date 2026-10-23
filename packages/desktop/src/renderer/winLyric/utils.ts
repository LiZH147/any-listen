import { screen } from 'electron'

import { appState } from '@/app'

// 设置窗口位置、大小
export let minWidth = 38
export let minHeight = 38

/**
 * 获取所有显示器可用工作区的并集
 *
 * 多显示器场景下不能只用主屏尺寸做边界，否则窗口会被锁在主屏内无法拖到副屏。
 * 这里返回覆盖全部屏幕的外接矩形，保证窗口不会丢到屏幕之外，同时允许跨屏移动。
 */
const getWorkAreaInfo = (): { area: Electron.Rectangle; displays: Electron.Display[] } | null => {
  try {
    const displays = screen.getAllDisplays()
    if (displays.length) {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const display of displays) {
        const { x, y, width, height } = display.workArea
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x + width > maxX) maxX = x + width
        if (y + height > maxY) maxY = y + height
      }
      return { area: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }, displays }
    }
  } catch {
    // electron 尚未 ready 时 screen 不可用，回退到主屏尺寸
  }
  const workAreaSize = appState.envParams.workAreaSize
  if (!workAreaSize) return null
  return { area: { x: 0, y: 0, width: workAreaSize.width, height: workAreaSize.height }, displays: [] }
}

// 判断窗口是否与至少一个显示器有交集
const isVisibleOnAnyDisplay = (rect: Electron.Rectangle, displays: Electron.Display[]) => {
  return displays.some(({ workArea }) => {
    return (
      rect.x < workArea.x + workArea.width &&
      rect.x + rect.width > workArea.x &&
      rect.y < workArea.y + workArea.height &&
      rect.y + rect.height > workArea.y
    )
  })
}

// const updateBounds = (bounds: Bounds) => {
//   bounds.x = bounds.x
//   return bounds
// }

/**
 *
 * @param bounds 当前设置
 * @param param 新设置（相对于当前设置）
 * @returns
 */
export const getLyricWindowBounds = (
  bounds: Electron.Rectangle,
  { x, y, w, h }: AnyListen.DesktopLyric.NewBounds
): Electron.Rectangle => {
  if (w < minWidth) w = minWidth
  if (h < minHeight) h = minHeight

  if (appState.appSetting['desktopLyric.isLockScreen']) {
    const workAreaInfo = getWorkAreaInfo()
    if (!workAreaInfo) return bounds
    const workArea = workAreaInfo.area

    // 窗口不能大于整个可用的桌面区域
    if (w > workArea.width) w = workArea.width
    if (h > workArea.height) h = workArea.height

    x += bounds.x
    y += bounds.y

    const minX = workArea.x
    const minY = workArea.y
    const maxX = workArea.x + workArea.width - w
    const maxY = workArea.y + workArea.height - h

    if (x > maxX) x = maxX
    else if (x < minX) x = minX

    if (y > maxY) y = maxY
    else if (y < minY) y = minY

    // 显示器排列不规整时，并集区域内可能存在实际没有屏幕的空洞，
    // 窗口若完全落在空洞里就会“消失”，此时贴回最近的显示器
    if (workAreaInfo.displays.length && !isVisibleOnAnyDisplay({ x, y, width: w, height: h }, workAreaInfo.displays)) {
      const display = screen.getDisplayNearestPoint({ x: Math.round(x + w / 2), y: Math.round(y + h / 2) })
      const area = display.workArea
      if (w > area.width) w = area.width
      if (h > area.height) h = area.height
      x = Math.min(Math.max(x, area.x), area.x + area.width - w)
      y = Math.min(Math.max(y, area.y), area.y + area.height - h)
    }
  } else {
    y += bounds.y
    x += bounds.x
  }

  // console.log('util bounds', bounds)
  return { width: w, height: h, x, y }
}

const initMultiLineWindowSize = () => {
  let x = appState.appSetting['desktopLyric.multiLine.x']
  let y = appState.appSetting['desktopLyric.multiLine.y']
  let width = appState.appSetting['desktopLyric.multiLine.width']
  let height = appState.appSetting['desktopLyric.multiLine.height']

  if (x == null || y == null) {
    if (width < minWidth) width = minWidth
    if (height < minHeight) height = minHeight
    if (appState.envParams.workAreaSize) {
      x = appState.envParams.workAreaSize.width - width
      y = appState.envParams.workAreaSize.height - height
    } else {
      x = 0
      y = 0
    }
  } else {
    let bounds = getLyricWindowBounds({ x, y, width, height }, { x: 0, y: 0, w: width, h: height })
    x = bounds.x
    y = bounds.y
    width = bounds.width
    height = bounds.height
  }
  width = Math.trunc(width)
  height = Math.trunc(height)
  return {
    x,
    y,
    width,
    height,
  }
}
const getFontSizeLevel = (fontSize: number) => {
  if (fontSize <= 46) return 1
  if (fontSize <= 60) return 1.2
  if (fontSize <= 80) return 1.6
  return 2
}
export const getClassicWindowSize = () => {
  let fontSize = appState.appSetting['desktopLyric.classic.style.fontSize']
  const lines = appState.appSetting['desktopLyric.classic.showExtendedLyrics'] ? 6 : 4
  let height = Math.ceil(fontSize * lines * 1.2 + fontSize / 2 + fontSize * 0.16 * 4)
  let width = fontSize * appState.appSetting['desktopLyric.classic.widthByFontNum'] * getFontSizeLevel(fontSize)
  let x = appState.appSetting['desktopLyric.classic.x']
  let y = appState.appSetting['desktopLyric.classic.y']

  if (x == null || y == null) {
    if (width < minWidth) width = minWidth
    if (height < minHeight) height = minHeight
    if (appState.envParams.workAreaSize) {
      if (width > appState.envParams.workAreaSize.width) width = appState.envParams.workAreaSize.width
      if (height > appState.envParams.workAreaSize.height) height = appState.envParams.workAreaSize.height
      x = (appState.envParams.workAreaSize.width - width) / 2
      y = appState.envParams.workAreaSize.height - height
    } else {
      x = 0
      y = 0
    }
  } else {
    let bounds = getLyricWindowBounds({ x, y, width, height }, { x: 0, y: 0, w: width, h: height })
    x = bounds.x
    y = bounds.y
    width = bounds.width
    height = bounds.height
  }

  width = Math.trunc(width)
  height = Math.trunc(height)
  return {
    x,
    y,
    width,
    height,
  }
}

const initMiniPlayerWindowSize = () => {
  let x = appState.appSetting['desktopLyric.miniPlayer.x']
  let y = appState.appSetting['desktopLyric.miniPlayer.y']
  let width = appState.appSetting['desktopLyric.miniPlayer.width']
  let height = appState.appSetting['desktopLyric.miniPlayer.height']

  if (width < minWidth) width = minWidth
  if (height < minHeight) height = minHeight

  if (x == null || y == null) {
    if (appState.envParams.workAreaSize) {
      x = appState.envParams.workAreaSize.width - width - 24
      y = appState.envParams.workAreaSize.height - height - 24
    } else {
      x = 0
      y = 0
    }
  } else {
    const bounds = getLyricWindowBounds({ x, y, width, height }, { x: 0, y: 0, w: width, h: height })
    x = bounds.x
    y = bounds.y
    width = bounds.width
    height = bounds.height
  }

  return {
    x: Math.trunc(x),
    y: Math.trunc(y),
    width: Math.trunc(width),
    height: Math.trunc(height),
  }
}

export const initWindowSize = () => {
  switch (appState.appSetting['desktopLyric.mode']) {
    case 'classic':
      return getClassicWindowSize()
    case 'miniPlayer':
      return initMiniPlayerWindowSize()
    default:
      return initMultiLineWindowSize()
  }
}
