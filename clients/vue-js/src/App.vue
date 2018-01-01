<template>
  <v-app id="app" light>
    <Map v-if="project" :project="project"></Map>
    <SelectProjectDialog v-if="showProjects"/>
  </v-app>
</template>

<script>
import Map from './components/Map'
import HTTP from './client'
import SelectProjectDialog from './components/SelectProjectDialog'

export default {
  name: 'app',
  components: { Map, SelectProjectDialog },
  data () {
    return {
      showProjects: false,
      project: null
    }
  },
  mounted () {
    HTTP.login('user1', 'user1').then(() => {
      let project = new URLSearchParams(location.search).get('PROJECT')
      // project = 'user2/uster/uster'
      if (project) {
        this.loadProject(project)
      } else {
        this.showProjects = true
      }
    })
  },
  methods: {
    loadProject (project) {
      HTTP
        .project(project)
        .then(resp => {
          this.project = resp.data
        })
    }
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
