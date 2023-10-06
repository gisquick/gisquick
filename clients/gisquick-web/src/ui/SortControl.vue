<template functional>
  <svg
    height="18"
    viewBox="0 0 5 10"
    class="sort-control"
    :class="[data.class, data.staticClass]"
  >
    <path
      :class="{active: props.sort === 'asc'}"
      d="M 1,6 L 5,6 L 3,8 Z"
    />
    <path
      :class="{active: props.sort === 'desc'}"
      d="M 1,4 L 5,4 L 3,2 Z"
    />
  </svg>
</template>

<script lang="js">
export default {
  props: {
    sort: String // 'asc'|'desc'
  }
}
</script>

<style lang="scss" scoped>
.sort-control {
  flex-shrink: 0;
  path {
    fill: var(--color-primary);
    opacity: 0.4;
    &.active {
      opacity: 1;
    }
  }
}
</style>
