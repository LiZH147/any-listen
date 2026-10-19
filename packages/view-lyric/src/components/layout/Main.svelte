<script>
  import { useSettingValue } from '@/modules/setting/reactive.svelte'
  import ClassicLyric from '@/views/classicLyric/ClassicLyric.svelte'
  import MiniPlayer from '@/views/miniPlayer/MiniPlayer.svelte'
  import MultiLineLyric from '@/views/multiLineLyric/MultiLineLyric.svelte'

  const mode = useSettingValue('desktopLyric.mode')
</script>

{#if mode.val === 'classic'}
  <ClassicLyric />
{:else if mode.val === 'multiLine'}
  <MultiLineLyric />
{:else if mode.val === 'miniPlayer'}
  <MiniPlayer />
{/if}
