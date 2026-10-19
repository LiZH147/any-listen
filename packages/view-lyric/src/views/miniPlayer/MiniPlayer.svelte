<script lang="ts">
  import { musicInfo, playing, progress } from '@/modules/player/reactive.svelte'
  import { skipNext, skipPrev, togglePlay } from '@/modules/player/actions'
  import { lyricText } from '@/modules/lyric/reactive.svelte'
  import { settingState } from '@/modules/setting/store/state'
  import { updateSetting } from '@/modules/setting/store/action'
  import { useSettingValue } from '@/modules/setting/reactive.svelte'
  import { t } from '@/plugins/i18n'
  import darg from '@/shared/compositions/drag.svelte'
  import Cover from './Cover.svelte'

  const opacity = useSettingValue('desktopLyric.miniPlayer.opacity')
  const showLyric = useSettingValue('desktopLyric.miniPlayer.showLyric')
  const isAlwaysOnTop = useSettingValue('desktopLyric.isAlwaysOnTop')

  // 歌词开关打开且当前行有内容时显示歌词，否则显示歌手名
  const isLyric = $derived(!!(showLyric.val && $lyricText))
  const subLine = $derived(isLyric ? $lyricText : $musicInfo.singer || '—')

  const handleClose = async () => {
    await updateSetting({ 'desktopLyric.enable': false })
  }

  const handleSwitchMode = async () => {
    await updateSetting({ 'desktopLyric.mode': 'classic' })
  }

  const handleToggleLyric = async () => {
    await updateSetting({
      'desktopLyric.miniPlayer.showLyric': !settingState.setting['desktopLyric.miniPlayer.showLyric'],
    })
  }

  const handleToggleAlwaysOnTop = async () => {
    await updateSetting({
      'desktopLyric.isAlwaysOnTop': !settingState.setting['desktopLyric.isAlwaysOnTop'],
    })
  }
</script>

<div class="container" style={`opacity: ${opacity.val / 100}`}>
  <div class="panel" {@attach darg}>
    <!-- 封面 -->
    <div class="cover-box">
      <Cover />
    </div>

    <!-- 信息与控制 -->
    <div class="body">
      <div class="meta">
        <div class="title" title={$musicInfo.name}>{$musicInfo.name || $t('player__stopped')}</div>
        {#if isLyric}
          <div class="lyric" title={subLine}>{subLine}</div>
        {:else}
          <div class="singer" title={subLine}>{subLine}</div>
        {/if}
      </div>

      <div class="controls">
        <button class="btn" aria-label={$t('player__prev')} title={$t('player__prev')} onclick={async () => skipPrev()}>
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <use xlink:href="#icon-skip-prev" />
          </svg>
        </button>
        <button
          class="btn btn-main"
          aria-label={$playing ? $t('player__pause') : $t('player__play')}
          title={$playing ? $t('player__pause') : $t('player__play')}
          onclick={togglePlay}
        >
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <use xlink:href={$playing ? '#icon-pause' : '#icon-play'} />
          </svg>
        </button>
        <button class="btn" aria-label={$t('player__next')} title={$t('player__next')} onclick={async () => skipNext()}>
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <use xlink:href="#icon-skip-next" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 右上角操作 -->
    <div class="actions">
      <button
        class={isAlwaysOnTop.val ? 'act act-on' : 'act'}
        aria-label={$t(`desktop_lyric.${isAlwaysOnTop.val ? 'win_top_off' : 'win_top_on'}`)}
        title={$t(`desktop_lyric.${isAlwaysOnTop.val ? 'win_top_off' : 'win_top_on'}`)}
        onclick={handleToggleAlwaysOnTop}
      >
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <use xlink:href={isAlwaysOnTop.val ? '#icon-top-off' : '#icon-top-on'} />
        </svg>
      </button>
      <button class="act" aria-label={$t('settings.desktop_lyric.classic_mode')} title={$t('settings.desktop_lyric.classic_mode')} onclick={handleSwitchMode}>
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <use xlink:href="#icon-window-minimize" />
        </svg>
      </button>
      <button
        class={showLyric.val ? 'act act-on' : 'act'}
        aria-label={$t(`settings.desktop_lyric.miniPlayer_lyric_${showLyric.val ? 'hide' : 'show'}`)}
        title={$t(`settings.desktop_lyric.miniPlayer_lyric_${showLyric.val ? 'hide' : 'show'}`)}
        onclick={handleToggleLyric}
      >
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <use xlink:href={showLyric.val ? '#icon-text' : '#icon-audio-wave'} />
        </svg>
      </button>
      <button class="act act-close" aria-label={$t('close')} title={$t('close')} onclick={handleClose}>
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <use xlink:href="#icon-close" />
        </svg>
      </button>
    </div>

    <!-- 进度条 -->
    <div class="progress">
      <div class="progress-bar" style={`transform: scaleX(${$progress.progress || 0})`}></div>
    </div>
  </div>
</div>

<style lang="less" module>
  .container {
    display: flex;
    flex-flow: column nowrap;
    width: 100%;
    height: 100%;
    padding: 6px;
    transition: opacity @transition-normal;
  }

  // 悬浮圆角卡片
  .panel {
    position: relative;
    display: flex;
    flex: auto;
    flex-flow: row nowrap;
    gap: 10px;
    align-items: center;
    min-height: 0;
    padding: 10px;
    overflow: hidden;
    background-color: rgb(28 28 30 / 82%);
    backdrop-filter: blur(20px) saturate(1.5);
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 14px;

  }

  .cover-box {
    flex: none;
    width: 56px;
    height: 56px;
  }

  .body {
    display: flex;
    flex: auto;
    flex-flow: column nowrap;
    gap: 4px;
    min-width: 0;
  }

  .meta {
    min-width: 0;
  }

  .title {
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .singer {
    overflow: hidden;
    font-size: 11px;
    color: rgb(255 255 255 / 55%);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 当前歌词行
  .lyric {
    overflow: hidden;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-primary-100, #fff);
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.95;
  }

  .controls {
    display: flex;
    flex-flow: row nowrap;
    gap: 4px;
    align-items: center;
    margin-top: 2px;
  }

  .btn {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    color: rgb(255 255 255 / 82%);
    cursor: pointer;
    background-color: transparent;
    border: none;
    border-radius: 50%;
    transition:
      background-color @transition-fast,
      color @transition-fast,
      transform @transition-fast;

    svg {
      width: 16px;
      height: 16px;
    }

    &:hover {
      color: #fff;
      background-color: rgb(255 255 255 / 16%);
      transform: scale(1.08);
    }

    &:active {
      transform: scale(0.94);
    }
  }

  // 主播放键：实心主色圆形
  .btn-main {
    width: 34px;
    height: 34px;
    color: #fff;
    background-color: var(--color-primary-400);
    box-shadow: 0 3px 10px rgb(0 0 0 / 30%);

    svg {
      width: 18px;
      height: 18px;
    }

    &:hover {
      background-color: var(--color-primary-500);
      transform: scale(1.1);
    }
  }

  .actions {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    flex-flow: row nowrap;
    gap: 2px;
    opacity: 0;
    transition: opacity @transition-fast;
  }

  .panel:hover .actions {
    opacity: 1;
  }

  .act {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    color: rgb(255 255 255 / 70%);
    cursor: pointer;
    background-color: rgb(255 255 255 / 10%);
    border: none;
    border-radius: 50%;
    transition:
      background-color @transition-fast,
      color @transition-fast;

    svg {
      width: 12px;
      height: 12px;
    }

    &:hover {
      color: #fff;
      background-color: rgb(255 255 255 / 24%);
    }
  }

  // 置顶按钮激活态
  .act-on {
    color: var(--color-primary-100, #fff);
    background-color: rgb(255 255 255 / 26%);
  }

  .act-close:hover {
    background-color: #e5484d;
  }

  // 底部细进度条
  .progress {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 3px;
    overflow: hidden;
    background-color: rgb(255 255 255 / 12%);
  }

  .progress-bar {
    width: 100%;
    height: 100%;
    background-color: var(--color-primary-400);
    transform-origin: 0;
    transition: transform 0.2s ease-out;
  }
</style>
