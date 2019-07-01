<template>
  <v-app id="app">
    <map-app v-if="project"/>
    <login-dialog v-if="showLogin" @login="bootstrap"/>
    <projects-dialog v-if="showProjects" :projects="projects"/>
  </v-app>
</template>

<script>
import { mapState } from 'vuex'
import MapApp from './components/Map'
import LoginDialog from './components/LoginDialog'
import ProjectsDialog from './components/SelectProjectDialog'

export default {
  name: 'app',
  components: { MapApp, LoginDialog, ProjectsDialog },
  data () {
    return {
      showProjects: false,
      showLogin: false
    }
  },
  computed: {
    ...mapState(['project'])
  },
  mounted () {
    this.bootstrap()
  },
  methods: {
    bootstrap () {
      let project = new URLSearchParams(location.search).get('PROJECT')
      if (project) {
        this.$http.project(project)
          .then(resp => {
            this.$store.commit('project', resp.data)
          })
          .catch(err => {
            console.error(err)
            this.showLogin = true
          })
      } else if (process.env.NODE_ENV === 'development') {
        // Show list of user projects
        this.$http.get('/projects.json')
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

html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  font-size: 1em!important;
  overflow: hidden!important;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100%;
  height: 100%;
}
</style>
