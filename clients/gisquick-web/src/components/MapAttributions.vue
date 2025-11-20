<template>
  <div>
    <menu-items :items="menuItems"/>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

import Attribution from 'ol/control/Attribution'
import MenuItems from '@/components/MenuItems.vue'

function createAttribution (config) {
  const html = config.url
    ? `<a href="${config.url}" target="_blank">${config.title}</a>`
    : config.title
  return html
}

export default {
  components: { MenuItems },
  data () {
    return {
      collapsed: false
    }
  },
  computed: {
    ...mapGetters(['visibleBaseLayer', 'visibleLayers']),
    attributions () {
      const list = []
      const layers = this.visibleBaseLayer ? [this.visibleBaseLayer].concat(this.visibleLayers) : this.visibleLayers
      layers.filter(l => l.attribution).forEach(l => {
        const item = createAttribution(l.attribution)
        if (!list.includes(item)) {
          list.push(item)
        }
      })
      return list
    },
    menuItems () {
      return [{
        key: 'attributions',
        text: this.$gettext('Display attributions'),
        action: this.toggleAttributions,
        activated: !this.collapsed
      }]
    }
  },
  mounted () {
    this.control = new Attribution({
      target: this.$el,
      collapsed: this.collapsed
    })
    this.control.collectSourceAttributions_ = () => {
      return this.attributions
    }
    this.$map.addControl(this.control)
    this.$map.getAttributions = () => this.attributions
  },
  methods: {
    toggleAttributions () {
      this.collapsed = !this.collapsed
      this.control.setCollapsed(this.collapsed)
    }
  }
}
</script>

<style lang="scss" scoped>
::v-deep .ol-attribution {
  bottom: 4px;
  right: 48px;
  &.ol-collapsed {
    display: none;
  }
  a[href="https://openlayers.org/"] {
    display: none;
  }
  a:link, a:visited {
    text-decoration: none;
    color: #333;
  }
  a:hover {
    color: rgb(0, 150, 190);
    text-shadow: none;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 3px;
  }
  li > *::after {
    color: #333;
    content: "|";
    pointer-events: none;
    padding-left: 9px;
    padding-right: 5px;
  }
  li:last-child > *::after {
    display: none;
  }
  button {
    display: none;
  }
}
</style>
