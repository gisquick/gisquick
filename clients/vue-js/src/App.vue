<template>
  <div id="app">
    <template v-if="project">
      <Map :config="project" />
      <LayersPanel
        :topics="project.topics"
        :baseLayers="project.base_layers"
        :layers="project.layers" />
    </template>
  </div>
</template>

<script>
import Map from './components/Map'
import LayersPanel from './components/LayersPanel'
import HTTP from './client'

export default {
  name: 'app',
  components: { Map, LayersPanel },
  data () {
    return {
      project: null
    }
  },
  created () {
    HTTP
      .login('user1', 'user1')
      .then(() => {
        HTTP
          .project('user1/prague/prague')
          // .project('user1/natural-earth/central-europe')
          // .project('user2/uster/uster')
          .then(resp => {
            this.project = resp.data
            window.cfg = resp.data
          })
      })
  }
}
</script>

<style>
html, body {
  margin: 0;
  width: 100%;
  height: 100%;
}
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  height: 100%;
}
</style>
