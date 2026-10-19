<script lang="ts">
  import Modal from '@/components/material/Modal.svelte'
  import { t } from '@/plugins/i18n'
  import AudioConvolution from './AudioConvolution.svelte'
  import BiquadFilter from './BiquadFilter.svelte'
  import PitchShifter from './PitchShifter.svelte'
  import AudioPanner from './AudioPanner.svelte'
  let { teleport }: { teleport?: 'string' } = $props()
  let visible = $state(false)
</script>

<button
  class="btn"
  aria-label={$t('player__sound_effect')}
  onclick={() => {
    visible = true
  }}
>
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <use xlink:href="#icon-tune" />
  </svg>
</button>
<Modal bind:visible bgclose {teleport}>
  <!-- <main class="main"> -->
  <!-- <h2 class="title">{{ $t('theme_edit_modal__title') }}</h2> -->
  <div class="content">
    <div class="scroll row">
      <AudioConvolution />
      <PitchShifter />
      <AudioPanner />
    </div>
    <div class="scroll row">
      <BiquadFilter />
    </div>
  </div>
  <!-- </main> -->
</Modal>

<style lang="less">
  .btn {
    position: relative;
    display: flex;
    flex-flow: column nowrap;
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
    transition:
      background-color @transition-fast,
      color @transition-fast,
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

  // .main {
  //   min-width: 300px;
  //   // max-height: 100%;
  //   // overflow: hidden;
  //   display: flex;
  //   flex-flow: column nowrap;
  //   justify-content: center;
  //   min-height: 0;
  // }
  // .title {
  //   flex: none;
  //   font-size: 16px;
  //   color: var(--color-font);
  //   line-height: 1.3;
  //   text-align: center;
  //   padding: 10px;
  // }
  .content {
    position: relative;
    display: flex;
    flex-flow: row nowrap;
    gap: 10px;
    min-height: 0;
    padding: 0 5px;
    margin: 15px 0;

    &::before {
      .mixin-after();

      position: absolute;
      left: 50%;
      height: 100%;
      border-left: 1px dashed var(--color-primary-light-100-alpha-700);
    }
    // width: 400px;

    :global {
      // .player__sound_effect_contnet {
      //   display: flex;
      // }
      .player-sound-effect-title {
        padding-bottom: 8px;
        // margin-bottom: 10px;
        font-size: 14px;
      }
    }
  }

  .row {
    display: flex;
    flex-flow: column nowrap;
    gap: 15px;
    width: 50%;
    padding: 0 10px;
  }

  // .tip {
  //   padding: 0 15px 15px;
  //   margin-top: 5px;
  //   font-size: 12px;
  //   line-height: 1.25;
  //   color: var(--color-font);
  // }
</style>
