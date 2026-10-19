<script lang="ts">
  import ControlBtnsDesktop from './ControlBtnsDesktop.svelte'
  import ControlBtnsWeb from './ControlBtnsWeb.svelte'
</script>

<!-- <div class="container"> -->
<div class="btns">
  {#if import.meta.env.VITE_IS_DESKTOP}
    <ControlBtnsDesktop />
  {/if}
  {#if import.meta.env.VITE_IS_WEB}
    <ControlBtnsWeb />
  {/if}
</div>

<!-- </div> -->

<style lang="less">
  .btns {
    display: flex;
    flex-flow: row nowrap;
    gap: 2px;
    align-items: center;

    :global {
      .btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        color: rgb(255 255 255 / 82%);
        cursor: pointer;
        outline: none;
        background: none;
        border: none;
        border-radius: 999px;
        transition:
          background-color @transition-fast,
          color @transition-fast,
          transform @transition-fast;

        svg {
          width: 18px;
          height: 18px;
        }

        &:hover {
          color: #fff;
          background-color: rgb(255 255 255 / 16%);
          transform: scale(1.08);
        }

        &:active {
          transform: scale(0.94);
        }
      }
    }
  }
</style>
