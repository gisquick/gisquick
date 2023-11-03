<template>
  <svg viewBox="0 0 24 24" width="24" height="24">
    <path id="p1"/>
    <path id="p2"/>
    <path id="p3"/>
    <g v-if="transition">
      <template v-for="p in ['p1', 'p2', 'p3']">
        <animate
          :key="p"
          :xlink:href="`#${p}`"
          id="transition"
          ref="transition"
          attributeName="d"
          begin="0"
          dur="0.4s"
          :from="transition.from[p]"
          :to="transition.to[p]"
        />
      </template>
    </g>
    <g v-if="animation">
      <template v-for="p in ['p1', 'p2', 'p3']">
        <animate
          ref="animation"
          :key="p"
          :xlink:href="`#${p}`"
          attributeName="d"
          :values="animation.values[p]"
          :begin="transition ? 'transition.end' : 0"
          v-bind="animation.params"
        />
      </template>
    </g>
  </svg>
</template>

<script lang="js">
const pathDots = {
  p1: 'M6.95 12c0 0.85-0.69 1.53-1.53 1.53-0.85 0-1.53-0.69-1.53-1.53 0-0.85 0.69-1.53 1.53-1.53 0.85 0 1.53 0.69 1.53 1.53z',
  p2: 'M13.58 12c0 0.85-0.69 1.53-1.53 1.53-0.85 0-1.53-0.69-1.53-1.53 0-0.85 0.69-1.53 1.53-1.53 0.85 0 1.53 0.69 1.53 1.53z',
  p3: 'M20.11 12c0 0.85-0.69 1.53-1.53 1.53-0.85 0-1.53-0.69-1.53-1.53 0-0.85 0.69-1.53 1.53-1.53 0.85 0 1.53 0.69 1.53 1.53z'
}
const pathDots1 = {
  p1: 'M7.82 12c0 1.33-1.08 2.41-2.4 2.41-1.33 0-2.41-1.08-2.41-2.41 0-1.33 1.08-2.41 2.41-2.41 1.33 0 2.41 1.08 2.4 2.41z',
  p2: 'M13.58 12c0 0.85-0.69 1.53-1.53 1.53-0.85 0-1.53-0.69-1.53-1.53 0-0.85 0.69-1.53 1.53-1.53 0.85 0 1.53 0.69 1.53 1.53z',
  p3: 'M20.11 12c0 0.85-0.69 1.53-1.53 1.53-0.85 0-1.53-0.69-1.53-1.53 0-0.85 0.69-1.53 1.53-1.53 0.85 0 1.53 0.69 1.53 1.53z'
}
const pathDots2 = {
  p1: 'M6.95 12c0 0.85-0.69 1.53-1.53 1.53-0.85 0-1.53-0.69-1.53-1.53 0-0.85 0.69-1.53 1.53-1.53 0.85 0 1.53 0.69 1.53 1.53z',
  p2: 'M14.46 12c0 1.33-1.08 2.41-2.41 2.41-1.33 0-2.41-1.08-2.4-2.41 0-1.33 1.08-2.41 2.4-2.41 1.33 0 2.41 1.08 2.41 2.41z',
  p3: 'M20.11 12c0 0.85-0.69 1.53-1.53 1.53-0.85 0-1.53-0.69-1.53-1.53 0-0.85 0.69-1.53 1.53-1.53 0.85 0 1.53 0.69 1.53 1.53z'
}
const pathDots3 = {
  p1: 'M6.95 12c0 0.85-0.69 1.53-1.53 1.53-0.85 0-1.53-0.69-1.53-1.53 0-0.85 0.69-1.53 1.53-1.53 0.85 0 1.53 0.69 1.53 1.53z',
  p2: 'M13.58 12c0 0.85-0.69 1.53-1.53 1.53-0.85 0-1.53-0.69-1.53-1.53 0-0.85 0.69-1.53 1.53-1.53 0.85 0 1.53 0.69 1.53 1.53z',
  p3: 'M20.99 12c0 1.33-1.08 2.41-2.41 2.41-1.33 0-2.41-1.08-2.4-2.41 0-1.33 1.08-2.41 2.4-2.41 1.33 0 2.41 1.08 2.41 2.41z'
}
const pathCheck1 = {
  p1: 'M5.18 14.53c0 0.85 0.69 1.53 1.53 1.53 0.85 0 1.53-0.69 1.53-1.53 0-0.85-0.69-1.53-1.53-1.54-0.85 0-1.53 0.69-1.53 1.54z',
  p2: 'M12.48 18.28c0 0.85-0.69 1.53-1.53 1.53-0.85 0-1.53-0.69-1.53-1.53 0-0.85 0.69-1.53 1.53-1.53 0.85 0 1.53 0.69 1.53 1.53z',
  p3: 'M19.26 6.85c0 0.85-0.69 1.53-1.53 1.54-0.85 0-1.53-0.69-1.53-1.54 0-0.85 0.69-1.53 1.53-1.53 0.85 0 1.53 0.69 1.53 1.53z'
}
const pathCheck2 = {
  p1: 'M11.21 17.15c0 0.85 0.46 2.7 0.08 2.99-0.28 0.01-1.99-1.8-4.25-3.89-0.6-0.69-2.14-2.66-1.29-2.67 0.85 0 5.47 2.72 5.46 3.57z',
  p2: 'M17.5 5.29c0.47 0.67 1.4 1.81 0.86 2.84-0.83 0.84-7.08 12.86-7.07 12.01 0-0.85-0.29-2.14-0.26-3.42 0.8-1.81 6.47-12.27 6.47-11.43z',
  p3: 'M17.84 6.66c0 0.09-0.08 0.17-0.17 0.17-0.09 0-0.17-0.08-0.17-0.17 0-0.09 0.08-0.17 0.17-0.16 0.09 0 0.17 0.08 0.17 0.16z'
}
const pathError = {
  p1: 'M10.47 18.47C10.47 19.31 11.15 20 12 20c0.85 0 1.53-0.69 1.53-1.53 0-0.85-0.69-1.53-1.53-1.53-0.85 0-1.53 0.69-1.53 1.53z',
  p2: 'M10.47 4.88c0 0.85 0.69 10.05 1.53 10.04 0.85 0 1.53-9.2 1.53-10.04 0-0.85-0.69-1.53-1.53-1.53-0.85 0-1.53 0.69-1.53 1.53z',
  p3: 'M10.47 18.47C10.47 19.31 11.15 20 12 20c0.85 0 1.53-0.69 1.53-1.53 0-0.85-0.69-1.53-1.53-1.53-0.85 0-1.53 0.69-1.53 1.53z'
}

function createAnim (states) {
  return {
    p1: states.map(points => points.p1).join(';'),
    p2: states.map(points => points.p2).join(';'),
    p3: states.map(points => points.p3).join(';')
  }
}

export default {
  name: 'ProgressStatus',
  props: {
    status: String
  },
  data () {
    return {
      animation: null,
      transition: null
    }
  },
  watch: {
    status: {
      immediate: true,
      handler (value, old) {
        if (value === 'loading') {
          if (this.lastPath && this.lastPath !== pathDots3) {
            this.transition = {
              from: this.lastPath,
              to: pathDots
            }
          } else {
            this.transition = null
          }
          this.animation = {
            values: createAnim([pathDots, pathDots1, pathDots2, pathDots3]),
            params: {
              repeatCount: 'indefinite',
              keyTimes: '0; 0.33; 0.66; 1',
              dur: '1s'
            }
          }
          this.lastPath = pathDots
        } else if (value === 'success') {
          this.transition = null
          this.animation = {
            values: createAnim([this.lastPath || pathDots, pathCheck1, pathCheck2]),
            params: {
              fill: 'freeze',
              keyTimes: '0; 0.5; 1',
              dur: '0.4s'
            }
          }
          this.lastPath = pathCheck2
        } else if (value === 'error') {
          this.transition = null
          this.animation = {
            values: createAnim([this.lastPath || pathDots, pathError]),
            params: {
              fill: 'freeze',
              keyTimes: '0; 1',
              dur: '0.5s'
            }
          }
          this.lastPath = pathError
        } else {
          this.animation = null
        }
        if (this.transition) {
          this.$nextTick(() => this.$refs.transition.forEach(elem => elem.beginElement()))
        } else if (this.animation) {
          this.$nextTick(() => this.$refs.animation.forEach(elem => elem.beginElement()))
        }
        this.$emit('update:status', value)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
path {
  fill: currentColor;
}
.outline {
  fill: none;
  stroke: currentColor;
}
</style>
