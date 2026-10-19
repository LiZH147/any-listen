<script lang="ts">
  import { musicInfo } from '@/modules/player/reactive.svelte'

  let isError = $state(false)
  const pic = $derived($musicInfo.pic)

  // 切歌后重置封面加载失败状态
  $effect(() => {
    if (pic) isError = false
  })
</script>

<div class="cover">
  {#if pic && !isError}
    <img src={pic} alt="" onerror={() => (isError = true)} />
  {:else}
    <div class="empty">
      <svg version="1.1" viewBox="0 0 192 192">
        <use xlink:href="#icon-album" />
      </svg>
    </div>
  {/if}
</div>

<style lang="less" module>
  .cover {
    position: relative;
    flex: none;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: rgb(255 255 255 / 8%);
    border-radius: 10px;

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: rgb(255 255 255 / 45%);

    svg {
      width: 46%;
      height: 46%;
    }
  }
</style>
