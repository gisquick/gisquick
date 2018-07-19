<template>
  <v-app id="app">
    <Map v-if="project" :project="project"></Map>
    <LoginDialog v-if="showLogin" @login="bootstrap" />
    <SelectProjectDialog v-if="showProjects" :projects="projects" />
  </v-app>
</template>

<script>
import HTTP from './client'
import Map from './components/Map'
import LoginDialog from './components/LoginDialog'
import SelectProjectDialog from './components/SelectProjectDialog'

export default {
  name: 'app',
  components: { Map, LoginDialog, SelectProjectDialog },
  data: () => ({
    showProjects: false,
    showLogin: false,
    project: null
  }),
  mounted () {
    this.bootstrap()
  },
  methods: {
    bootstrap () {
      let project = new URLSearchParams(location.search).get('PROJECT')
      // project = 'user1/prague/prague'
      if (project) {
        HTTP
          .project(project)
          .then(resp => {
            this.project = resp.data
          })
          .catch(resp => {
            this.showLogin = true
          })
      } else {
        // Show list of user projects
        HTTP.get('/projects.json')
          .then((resp) => {
            this.projects = resp.data.projects
            this.showProjects = true
          })
          .catch(resp => {
            this.showLogin = true
          })
      }
    }
  }
}
</script>

<style lang="scss">
@import './transitions/transitions.scss';
@import './common.scss';

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
.v-input--checkbox, .v-radio {
  input {
    width: 26px;
    height: 26px;
  }
}
</style>
