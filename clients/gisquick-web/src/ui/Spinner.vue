<template>
  <!-- <svg
    :width="size"
    :height="size"
    class="spinner"
    viewBox="0 0 50 50"
  >
    <circle
      cx="25"
      cy="25"
      r="20"
      :stroke-width="width"
      class="path"
    />
  </svg> -->
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${size} ${size}`"
    class="spinner"
  >
    <circle
      cx="50%"
      cy="50%"
      :r="radius"
      :style="{'--diameter': 2 * radius}"
      :stroke-width="width"
      class="path"
    />
  </svg>
</template>

<script lang="js">
export default {
  props: {
    size: {
      type: [Number, String],
      default: 24
    },
    width: {
      type: [Number, String],
      default: 3
    }
  },
  computed: {
    radius () {
      const size = parseFloat(this.size)
      // return (size / 2)
      const width = parseFloat(this.width)
      return (size / 2) - width / 2
    }
  }
}
</script>

<style lang="scss" scoped>
.spinner {
  animation: 2s linear infinite spinner-rotate;
  circle {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    transform-origin: 50% 50%;
    animation: dash 1.5s ease-in-out infinite;
  }
}
@keyframes spinner-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg)
  }
}
// @keyframes dash {
//   0% {
//     stroke-dasharray: 1%, 320%;
//     stroke-dashoffset: 0;
//   }
//   50% {
//     stroke-dasharray: 160%, 200%;
//     stroke-dashoffset: -80%;
//   }
//   100% {
//     stroke-dasharray: 90%, 350%;
//     stroke-dashoffset: -310%;
//   }
// }
@keyframes dash {
  0% {
    stroke-dasharray: calc( 0.01px * var(--diameter) ), calc( 3.2px * var(--diameter) );
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: calc(1.6px * var(--diameter)), calc(2px * var(--diameter));
    stroke-dashoffset: calc(-0.8px * var(--diameter));

  }
  100% {
    stroke-dasharray: calc(0.9px * var(--diameter)), calc(3.5px * var(--diameter));
    stroke-dashoffset: calc(-3.1px * var(--diameter));
  }
}
</style>
