<template>
  <div class="tabs">
    <div
      class="swiper"
      :class="{animation}"
      :style="itemsStyle"
      v-touch:swipe="swipeHandler"
      @transitionend.self="onTransitionEnd"
    >
      <div class="tab-content" :class="{visible: placeholderVisible}"/>
      <div
        v-for="(tab, index) in items"
        :key="tab.key"
        class="tab-content f-col"
        :class="{visible: visible[index]}"
      >
        <slot :name="tab.key" :visible="visible[index]"/>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    items: Array,
    value: {}
  },
  data () {
    return {
      transform: null,
      visible: [],
      animation: false,
      placeholderVisible: false
    }
  },
  computed: {
    index () {
      return this.items?.findIndex(i => i.key === this.value)
    },
    itemsStyle () {
      return { transform: `translate3d(${100 * this.transform}%, 0, 0)` }
    }
  },
  watch: {
    index (index, prev) {
      // console.log(prev, '->', index)
      this.placeholderVisible = index > prev
      this.visible = this.items.map((item, i) => i === index || i === prev)
      this.transform = index > prev ? -2 : 0
      this.animation = true
    }
  },
  created () {
    this.visible = this.items.map((item, i) => i === this.index)
    this.transform = -1
    this.placeholderVisible = true
  },
  methods: {
    onTransitionEnd (e) {
      if (e.propertyName === 'transform') {
        this.visible = this.items.map((item, i) => i === this.index)
        this.transform = -1
        this.animation = false
        this.placeholderVisible = true
      }
    },
    swipeHandler (dir, e) {
      if (dir === 'right' && this.index > 0) {
        this.$emit('input', this.items[this.index - 1].key)
        e.stopPropagation()
      }
      if (dir === 'left' && this.index < this.items.length - 1) {
        this.$emit('input', this.items[this.index + 1].key)
        e.stopPropagation()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.tabs {
  display: flex;
  position: relative;
  overflow: hidden;
  .tab-content {
    // transition: transform .4s ease;
    position: relative;
    // transform: translate(-0%, 0);
    // width: 100%;
    // min-width: 100%;
    &.visible {
      width: 100%;
      min-width: 100%;
    }
    &:not(.visible) {
      display: none;
    }
  }
  .swiper {
    display: flex;
    // will-change: transform;
    
    width: 100%;
    // transform: translate(-100%, 0);
    position: relative;
    &.animation {
      transition: transform .4s ease;
      // transition: transform .4s cubic-bezier(.25,.8,.5,1);
    }
  }
}
</style>