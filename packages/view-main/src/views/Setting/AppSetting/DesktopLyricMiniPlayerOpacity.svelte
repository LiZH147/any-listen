<script lang="ts">
  import Btn from '@/components/base/Btn.svelte'
  import SliderBar from '@/components/base/SliderBar.svelte'
  import { useSettingValue } from '@/modules/setting/reactive.svelte'
  import { updateSetting } from '@/modules/setting/store/action'
  import { t } from '@/plugins/i18n'
  import TitleContent from '../components/TitleContent.svelte'

  const opacity = useSettingValue('desktopLyric.miniPlayer.opacity')

  const setOpacity = (val: number) => {
    void updateSetting({ 'desktopLyric.miniPlayer.opacity': Math.min(Math.max(Math.round(val), 20), 100) })
  }

  const changeOpacity = (step: number) => {
    setOpacity(opacity.val + step)
  }
</script>

<TitleContent name={$t('settings.desktop_lyric.miniPlayer_opacity')}>
  <div class="settings-item-content">
    <Btn min onclick={() => changeOpacity(-5)}>-5</Btn>
    <div class="slider">
      <SliderBar step={1} value={opacity.val} min={20} max={100} onchange={setOpacity} />
    </div>
    <span class="val">{opacity.val}%</span>
    <Btn min onclick={() => changeOpacity(5)}>+5</Btn>
  </div>
</TitleContent>

<style lang="less">
  .settings-item-content {
    display: flex;
    flex-flow: row nowrap;
    gap: 12px;
    align-items: center;
    padding-top: 5px;
  }

  .slider {
    flex: auto;
    max-width: 260px;
  }

  .val {
    min-width: 42px;
    font-size: 13px;
    color: var(--color-font-label);
    text-align: right;
  }
</style>
