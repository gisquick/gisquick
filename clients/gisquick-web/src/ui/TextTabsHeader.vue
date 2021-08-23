<template>
  <div class="text-tabs-header f-row-ac">
    <div
      v-for="item in items"
      :key="item.key"
      role="button"
      class="tab"
      :class="{active: value === item.key}"
      @click="$emit('input', item.key)"
    >
      <span v-text="item.label"/>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    items: Array,
    value: {}
  }
}
</script>

<style lang="scss" scoped>
.text-tabs-header {
  margin: 6px;
  font-size: 13px;
  font-weight: 500;
  user-select: none;
  .tab {
    padding: 3px 6px;
    flex: 1;
    text-align: center;
    background-color: #eee;
    cursor: pointer;
    border: 1px solid #ddd;
    &:first-child {
      border-top-left-radius: 6px;
      border-bottom-left-radius: 6px;
    }
    &:last-child {
      border-top-right-radius: 6px;
      border-bottom-right-radius: 6px;
    }
    &.active {
      color: #fff;
      background-color: var(--color-primary);
      border-color: var(--color-primary);
    }
  }
}
</style>