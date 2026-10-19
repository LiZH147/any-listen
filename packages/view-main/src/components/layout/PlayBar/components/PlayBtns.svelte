<script lang="ts">
  import { skipNext, skipPrev, togglePlay } from '@/modules/player/actions'
  import { playing } from '@/modules/player/reactive.svelte'
  import { t } from '@/plugins/i18n'
  import { onDomSizeChanged } from '@any-listen/web'
  import { onMount } from 'svelte'
  let domContainer: HTMLDivElement | null = $state(null)
  let iconSize = $state('20px')
  let iconSize2 = $state('22px')

  onMount(() => {
    if (!domContainer) return
    return onDomSizeChanged(domContainer, (width, height) => {
      iconSize = `${Math.trunc(height * 0.3)}px`
      iconSize2 = `${Math.trunc(height * 0.34)}px`
    })
  })
</script>

<div class="container" bind:this={domContainer}>
  <button class="btn" aria-label={$t('player__prev')} onclick={async () => skipPrev()}>
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24">
      <use xlink:href="#icon-skip-prev" />
    </svg>
  </button>
  <button class="btn btn-main" aria-label={$playing ? $t('player__pause') : $t('player__play')} onclick={togglePlay}>
    {#if $playing}
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width={iconSize2} height={iconSize2} viewBox="0 0 24 24">
        <use xlink:href="#icon-pause" />
      </svg>
    {:else}
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width={iconSize2} height={iconSize2} viewBox="0 0 24 24">
        <use xlink:href="#icon-play" />
      </svg>
    {/if}
  </button>
  <button class="btn" aria-label={$t('player__next')} onclick={async () => skipNext()}>
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24">
      <use xlink:href="#icon-skip-next" />
    </svg>
  </button>
</div>

<style lang="less">
  .container {
    display: flex;
    flex: none;
    flex-flow: row nowrap;
    gap: 10px;
    align-items: center;
    height: 100%;
    padding-right: 8px;
    padding-left: 8px;
  }

  // 次要按钮：圆形半透明底，hover 浮现
  .btn {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    color: var(--color-button-font);
    cursor: pointer;
    background-color: transparent;
    border: none;
    border-radius: 50%;
    opacity: 0.9;
    transition:
      background-color @transition-fast,
      color @transition-fast,
      opacity @transition-fast,
      transform @transition-fast;

    &:hover {
      opacity: 1;
      background-color: rgb(127 127 127 / 16%);
      transform: scale(1.06);
    }

    &:active {
      transform: scale(0.94);
    }
  }

  // 主播放键：实心主色圆形按钮（网易云/QQ音乐风格）
  .btn-main {
    width: 40px;
    height: 40px;
    color: var(--color-primary-100, #fff);
    background-color: var(--color-primary-400);
    box-shadow: 0 4px 14px rgb(0 0 0 / 22%);
    opacity: 1;

    &:hover {
      background-color: var(--color-primary-500);
      box-shadow: 0 6px 18px rgb(0 0 0 / 28%);
      transform: scale(1.08);
    }

    &:active {
      transform: scale(0.96);
    }
  }
</style>
