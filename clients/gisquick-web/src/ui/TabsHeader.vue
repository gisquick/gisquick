<template>
  <div class="tabs-header">
    <div class="slider" :style="sliderStyle"/>
    <div
      v-for="item in items"
      :key="item.key"
      ref="items"
      class="item f-col-ac"
      :class="{active: item.key === value}"
      @click="$emit('input', item.key)"
    >
      <v-icon :name="item.icon"/>
      <span class="label" v-text="item.label"/>
    </div>
  </div>
</template>

<script lang="js">
export default {
  props: {
    items: Array,
    value: {}
  },
  data () {
    return {
      sliderStyle: null
    }
  },
  watch: {
    value: 'updateSlider'
  },
  mounted () {
    this.updateSlider()
  },
  methods: {
    updateSlider () {
      const index = this.items?.findIndex(i => i.key === this.value)
      const target = this.$refs.items?.[index]
      if (target) {
        this.sliderStyle = {
          left: target.offsetLeft + 'px',
          width: target.clientWidth + 'px'
        }
      } else {
        this.sliderStyle = null
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.tabs-header {
  display: flex;
  position: relative;
  user-select: none;
  .item {
    padding: 3px;
    cursor: pointer;
    flex-grow: 1;
    flex-basis: 0;
    position: relative;
    &:not(:last-child)::after {
      content: "";
      position: absolute;
      width: 1px;
      top: 10px;
      bottom: 10px;
      right: 0;
      background-color: #ddd;
      z-index: 1;
    }
    &.active {
      color: var(--color-primary);
      --icon-color: currentColor;
    }
  }
  .label {
    font-size: 12px;
  }
  .slider {
    position: absolute;
    height: 2px;
    background-color: var(--color-primary);
    bottom: 0;
    transition: .3s cubic-bezier(.25,.8,.5,1);

  }
}
</style>
