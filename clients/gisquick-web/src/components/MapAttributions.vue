<template>
  <div>
    <menu-items :items="menuItems"/>
  </div>
</template>

<script>
import Attribution from 'ol/control/attribution'
import MenuItems from '@/components/MenuItems.vue'

export default {
  components: { MenuItems },
  data () {
    return {
      attributionsHidden: true
    }
  },
  computed: {
    menuItems () {
      return [{
        key: 'attributions',
        text: this.$gettext('Display attributions'),
        action: this.toggleAttributions,
        activated: !this.attributionsHidden
      }]
    }
  },
  mounted () {
    this.attributions = new Attribution({
      target: this.$el
    })
    this.$map.addControl(this.attributions)
  },
  methods: {
    toggleAttributions () {
      this.attributionsHidden = !this.attributionsHidden
      this.attributions.setCollapsed(this.attributionsHidden)
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
