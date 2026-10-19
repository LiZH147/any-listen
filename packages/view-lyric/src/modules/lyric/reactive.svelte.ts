import { readable } from 'svelte/store'

import { lyricEvent } from './store/event'
import { lyricState } from './store/state'

const getLyricLine = () => lyricState.lines[lyricState.line] ?? { line: 0, text: '' }

export const lyricLines = readable(lyricState.lines, (set) => {
  set(lyricState.lines)
  return lyricEvent.on('linesChanged', (lines) => {
    set(lines)
  })
})

export const lyricLine = readable(getLyricLine(), (set) => {
  set(getLyricLine())
  return lyricEvent.on('lineChanged', () => {
    set(getLyricLine())
  })
})

// 用于小窗等“单行显示”场景的歌词文本。
//
// 歌词引擎只在播放推进时通过 onPlay 调用 setText(text, line)；
// 暂停中、或歌曲刚加载还没到第一行时，line 会停留在 -1 且 text 为空。
// 此时回退到第一行歌词，保证暂停时也能看到歌词而不是空白。
const getDisplayLyric = () => {
  if (lyricState.text) return lyricState.text
  if (lyricState.line < 0) return lyricState.lines[0]?.text ?? ''
  return lyricState.lines[lyricState.line]?.text ?? ''
}

export const lyricText = readable(getDisplayLyric(), (set) => {
  const update = () => set(getDisplayLyric())
  update()
  const unsub1 = lyricEvent.on('lineChanged', update)
  const unsub2 = lyricEvent.on('linesChanged', update)
  return () => {
    unsub1()
    unsub2()
  }
})
