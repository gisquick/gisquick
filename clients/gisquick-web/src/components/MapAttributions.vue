<template>
  <div>
    <portal to="app-menu">
      <v-list-tile @click="toggleAttributions">
        <v-list-tile-title>Display attributions</v-list-tile-title>
        <v-icon v-show="!attributionsHidden">check</v-icon>
      </v-list-tile>
    </portal>
  </div>
</template>

<script>
import Attribution from 'ol/control/attribution'

export default {
  data () {
    return {
      attributionsHidden: true
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
/deep/ .ol-attribution {
  bottom: 0.25em;
  right: 3em;
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
