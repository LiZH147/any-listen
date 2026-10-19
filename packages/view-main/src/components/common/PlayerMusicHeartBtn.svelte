<script lang="ts">
  import MusicHeartBtn from './MusicHeartBtn.svelte'
  import { playMusicInfo } from '@/modules/player/reactive.svelte'
</script>

<div class="icon">
  <MusicHeartBtn musicinfo={$playMusicInfo?.musicInfo} link />
</div>

<style lang="less">
  // .container {
  //   flex: none;
  //   height: 100%;
  // }

  .icon :global {
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      padding: 0;
      border-radius: 50%;
      transition:
        background-color @transition-fast,
        transform @transition-fast;

      svg {
        width: 20px;
        height: 20px;
        opacity: 0.78;
        transition: opacity @transition-fast;
      }

      &:hover {
        background-color: rgb(127 127 127 / 16%);
        transform: scale(1.06);

        svg {
          opacity: 1;
        }
      }

      &:active {
        transform: scale(0.94);

        svg {
          opacity: 1;
        }
      }
    }
  }
</style>
