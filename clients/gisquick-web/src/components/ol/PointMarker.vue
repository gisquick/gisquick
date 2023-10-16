<script lang="jsx">
import Vue from 'vue'
import Overlay from 'ol/Overlay'

import Spinner from '@/ui/Spinner.vue'
import Poi from '@/assets/poi.svg?component'

export function createMarker () {
  const wrapper = document.createElement('div')
  const vm = new Vue({
    data () {
      return {
        error: false,
        loading: false
      }
    },
    render () {
      return (
        <div class="point-marker">
          <Poi class="poi"/>
          <transition name="fade">
            <Spinner vShow={this.loading} size="21" width="4.5"/>
          </transition>
          <transition name="bounce">
            <v-icon vShow={this.error} class="error" name="circle-error" size="22" color="red"/>
          </transition>
        </div>
      )
    }
  })
  vm.$mount(wrapper)
  return vm
}

export default {
  props: {
    coords: Array,
    error: Boolean,
    loading: Boolean
  },
  created () {
    const map = this.$map
    this.marker = createMarker()
    this.overlay = new Overlay({
      element: this.marker.$el,
      positioning: 'bottom-center',
      stopEvent: false
    })
    this.updatePosition(this.coords)
    this.overlay.setMap(map)
  },
  watch: {
    coords: 'updatePosition',
    loading (val) {
      this.marker.$data.loading = val
    },
    error (val) {
      this.marker.$data.error = val
    }
  },
  beforeDestroy () {
    this.overlay.setMap(null)
    this.marker.$destroy()
  },
  methods: {
    updatePosition (coords) {
      this.overlay.setPosition(coords)
    }
  },
  render () {
    return null
  }
}
</script>

<style lang="scss">
.point-marker {
  display: grid;
  align-items: center;
  justify-items: center;
  > * {
    grid-area: 1 / 1 / 2 / 2;
  }
  .poi {
    .body {
      fill: var(--color-primary);
    }
  }
  .spinner {
    align-self: start;
    margin-top: 5.5px;
    color: #555;
  }
  .error {
    align-self: start;
    margin-top: 6px;
    background-color: #fff;
    border-radius: 50%;
  }
}

.bounce-enter-active {
  // animation: bounce-in1 .5s;
  animation: bounce-in .6s;
}
.bounce-leave-active {
  // animation: bounce-in .5s reverse;
}
@keyframes bounce-in1 {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  45% {
    transform: scale(1.2);
  }
  70% {
    transform: scale(0.9);
  }
  85% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
</style>
