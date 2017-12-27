<template>
  <v-app id="app" light>
    <Map v-if="project" :project="project"></Map>
  </v-app>
</template>

<script>
import Map from './components/Map'
import HTTP from './client'

export default {
  name: 'app',
  components: { Map },
  data () {
    return {
      project: null
    }
  },
  created () {
    let project = new URLSearchParams(location.search).get('PROJECT')
    project = 'user1/prague/prague'
    // project = 'user1/natural-earth/central-europe'
    // project = 'user2/uster/uster'

    HTTP
      .login('user1', 'user1')
      .then(() => {
        HTTP
          .project(project)
          .then(resp => {
            this.project = resp.data
          })
      })
  }
}
</script>

<style lang="scss">
html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  font-size: 1em;
  overflow: hidden;
}
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  height: 100%;
}

.btn.btn--icon {
  .btn__content:before {
    /*border-radius: 0;*/
    display: none;
  }
}
.checkbox {
  .input-group--selection-controls__ripple{
    display: none;
  }
}
</style>
