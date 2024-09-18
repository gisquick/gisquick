<template>
  <div class="color-picker f-col">
    <label v-if="label" v-text="label"/>
    <div class="color-grid">
      <div
        v-for="color in colors"
        :key="color"
        :style="{ backgroundColor: color }"
        class="cell"
        @click="$emit('input', color)"
      />
    </div>
  </div>
</template>

<script>

const BasicColors = [
  [255, 0, 0],
  [255, 153, 0],
  [255, 255, 0],
  [0, 255, 0],
  [0, 255, 255],
  [0, 0, 255],
  [153, 0, 255],
  [255, 0, 255]
]

const PaletteColors = [
  [244, 204, 204],
  [252, 229, 205],
  [255, 242, 204],
  [217, 234, 211],
  [208, 224, 227],
  [207, 226, 243],
  [217, 210, 233],
  [234, 209, 220],

  [234, 153, 153],
  [249, 203, 156],
  [255, 229, 153],
  [182, 215, 168],
  [162, 196, 201],
  [159, 197, 232],
  [180, 167, 214],
  [213, 166, 189],

  [224, 102, 102],
  [246, 178, 107],
  [255, 217, 102],
  [147, 196, 125],
  [118, 165, 175],
  [111, 168, 220],
  [142, 124, 195],
  [194, 123, 160],

  [204, 0, 0],
  [230, 145, 56],
  [241, 194, 50],
  [106, 168, 79],
  [69, 129, 142],
  [61, 133, 198],
  [103, 78, 167],
  [166, 77, 121],

  [153, 0, 0],
  [180, 95, 6],
  [191, 144, 0],
  [56, 118, 29],
  [19, 79, 92],
  [11, 83, 148],
  [53, 28, 117],
  [116, 27, 71],

  [102, 0, 0],
  [120, 63, 4],
  [127, 96, 0],
  [39, 78, 19],
  [12, 52, 61],
  [7, 55, 99],
  [32, 18, 77],
  [76, 17, 48]
]

function formatColor ([r, g, b]) {
  return `rgb(${r},${g},${b})`
}

export default {
  props: {
    label: String
  },
  computed: {
    greyColors () {
      return [0, 68, 102, 153, 204, 238, 243, 255].map(v => `rgb(${v},${v},${v})`)
    },
    basicColors () {
      return BasicColors.map(formatColor)
    },
    colors () {
      return this.greyColors.concat(this.basicColors).concat(PaletteColors.map(formatColor))
    }
  }
}
</script>

<style lang="scss" scoped>
.color-picker {
  padding: 6px;
  label {
    font-size: 14px;
    margin: 2px 0;
  }
  .color-grid {
    display: grid;
    grid-template-columns: repeat(8, auto);
    grid-template-rows: repeat(2, 28px) repeat(6, auto);
  }
  .cell {
    width: 20px;
    height: 20px;
    cursor: pointer;
    border: 1px solid #fff;
    transition: border-color 0.2s ease;
    will-change: border-color;
    &:hover {
      border-color: var(--color-primary);
      border-color: #222;
    }
  }
}
</style>
