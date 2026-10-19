<script lang="ts">
  import { t } from '@/plugins/i18n'
  import Btn from '../base/Btn.svelte'
  import { showMusicComment } from '@/modules/player/store/actions'
</script>

<div class="icon">
  <Btn icon link onclick={showMusicComment} aria-label={$t('music_comment_btn')}>
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <use xlink:href="#icon-chat" />
    </svg>
  </Btn>
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
      color: inherit !important;
      border-radius: 50%;
      opacity: 0.9;
      transition:
        background-color @transition-fast,
        opacity @transition-fast,
        transform @transition-fast;

      svg {
        width: 20px;
        height: 20px;
        opacity: 0.78;
        transition: opacity @transition-fast;
      }

      &:hover {
        background-color: rgb(127 127 127 / 16%);
        opacity: 1;
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
