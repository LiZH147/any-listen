<script lang="ts">
  import { skipNext, skipPrev, togglePlay } from '@/modules/player/actions'
  import { playing } from '@/modules/player/reactive.svelte'
  import { t } from '@/plugins/i18n'
  import { onDomSizeChanged } from '@any-listen/web'
  import { onMount } from 'svelte'
  let domContainer: HTMLDivElement | null = $state(null)
  let iconSize = $state('24px')
  let iconSize2 = $state('26px')

  onMount(() => {
    if (!domContainer) return
    return onDomSizeChanged(domContainer, (width, height) => {
      iconSize = `${Math.trunc(height * 0.36)}px`
      iconSize2 = `${Math.trunc(height * 0.4)}px`
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
    gap: 16px;
    align-items: center;
    height: 100%;
    padding-right: 24px;
    padding-left: 24px;
  }

  // 次要按钮：圆形半透明底
  .btn {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 46px;
    padding: 0;
    color: var(--color-button-font);
    cursor: pointer;
    background-color: rgb(127 127 127 / 12%);
    border: none;
    border-radius: 50%;
    opacity: 0.92;
    transition:
      background-color @transition-fast,
      color @transition-fast,
      opacity @transition-fast,
      transform @transition-fast;

    &:hover {
      opacity: 1;
      background-color: rgb(127 127 127 / 22%);
      transform: scale(1.06);
    }

    &:active {
      transform: scale(0.94);
    }
  }

  // 主播放键：实心主色圆形按钮
  .btn-main {
    width: 58px;
    height: 58px;
    color: var(--color-primary-100, #fff);
    background-color: var(--color-primary-400);
    box-shadow: 0 6px 20px rgb(0 0 0 / 26%);
    opacity: 1;

    &:hover {
      background-color: var(--color-primary-500);
      box-shadow: 0 8px 26px rgb(0 0 0 / 32%);
      transform: scale(1.08);
    }

    &:active {
      transform: scale(0.96);
    }
  }
</style>
