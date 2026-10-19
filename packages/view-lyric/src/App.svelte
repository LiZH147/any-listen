<script lang="ts">
  import Icons from '@/components/layout/Icons.svelte'
  import AppLayout from '@/components/layout/index.svelte'
  import Loading from '@/components/layout/Loading.svelte'
  import { useAppAeady } from '@/modules/app/reactive.svelte'
  import { onMount } from 'svelte'
  import { useSettingValue } from './modules/setting/reactive.svelte'
  import usePauseHide from './shared/compositions/usePauseHide.svelte'
  import useHoverHide from './shared/compositions/useHoverHide.svelte'

  const appReady = useAppAeady()

  const lock = useSettingValue('desktopLyric.isLock')
  const mode = useSettingValue('desktopLyric.mode')
  const pauseHide = usePauseHide()
  const hoverHide = useHoverHide()

  // 小窗模式是常驻悬浮的播放器，暂停时不应隐藏，否则窗口会直接消失
  const isMiniPlayer = $derived(mode.val === 'miniPlayer')

  onMount(() => {
    document.getElementById('root')!.style.display = 'block'
  })
</script>

<div
  id="container"
  class="view-container"
  class:lock={lock.val}
  class:mini={isMiniPlayer}
  class:hide={!isMiniPlayer && (pauseHide.val || hoverHide.val)}
>
  <Icons />
  <div id="main">
    {#if import.meta.env.VITE_IS_DESKTOP}
      {#if appReady.appAeady}
        <AppLayout />
      {/if}
    {/if}
    {#if import.meta.env.VITE_IS_WEB}
      {#if appReady.appAeady}
        <AppLayout />
      {:else}
        <Loading />
      {/if}
    {/if}
  </div>
</div>
