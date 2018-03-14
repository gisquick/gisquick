<template>
  <svg class="icon">
    <use :xlink:href="'#'+name" />
  </svg>
</template>

<script>

const svgIcons = require.context('../../icons', false, /.*\.svg$/)

function requireAll (requireContext) {
  return requireContext.keys().map(requireContext)
}
requireAll(svgIcons)

export default {
  props: ['name']
}

</script>

<style>
.icon {
  fill: currentColor;
}
</style>
