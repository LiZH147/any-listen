<script lang="ts">
  import { musicInfo } from '@/modules/player/reactive.svelte'
  import { t } from '@/plugins/i18n'
</script>

<div class="scroll info">
  <p><span>{$t('play_detail.music_name')}</span>{$musicInfo.name}</p>
  <p><span>{$t('play_detail.music_singer')}</span>{$musicInfo.singer}</p>
  {#if $musicInfo.album}
    <p><span>{$t('play_detail.music_album')}</span>{$musicInfo.album}</p>
  {/if}
</div>

<style lang="less">
  .info {
    flex: auto;
    width: var(--content-width);
    // padding-bottom: 15px;
    min-height: 0;
    margin-top: 15px;
    p {
      font-size: 15px;
      line-height: 1.7;
      overflow-wrap: break-word;
      margin: 3px 0;
      &:first-child {
        margin-top: 0;
        font-size: 24px;
        font-weight: 600;
        letter-spacing: 0.5px;
        span {
          font-size: 14px;
          font-weight: normal;
        }
      }

      span {
        font-size: 13px;
        color: var(--color-font-label);
      }
    }
  }
</style>
