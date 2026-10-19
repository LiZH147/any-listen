<script lang="ts">
  import { useSettingValue } from '@/modules/setting/reactive.svelte'
  import ControlBtns from './ControlBtns.svelte'
  import { fade } from 'svelte/transition'
  const lock = useSettingValue('desktopLyric.isLock')
</script>

{#if !lock.val}
  <header class="header" transition:fade>
    <div class="bar">
      <ControlBtns />
    </div>
  </header>
{/if}

<style lang="less" module>
  .header {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
    display: flex;
    flex: none;
    flex-flow: row nowrap;
    justify-content: flex-end;
    padding: 8px;
    pointer-events: none;
  }

  // 悬浮圆角胶囊：替代原来的左上角黑条
  .bar {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    padding: 4px 8px;
    pointer-events: auto;
    background-color: rgb(28 28 30 / 72%);
    backdrop-filter: blur(16px) saturate(1.4);
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 999px;
    box-shadow:
      0 8px 28px rgb(0 0 0 / 42%),
      0 1px 0 rgb(255 255 255 / 8%) inset;
  }
</style>
