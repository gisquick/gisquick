<template>
  <v-app id="app">
    <map-app v-if="projectStatus === 200"/>

    <!-- Main menu -->
    <v-menu
      bottom left
      class="app-menu"
    >
      <v-btn dark fab slot="activator">
        <v-icon>more_vert</v-icon>
      </v-btn>

      <v-list>
        <v-list-tile v-if="user && !user.is_guest" @click="logout">
          <v-list-tile-title key="logout">
            <translate>Logout</translate>
          </v-list-tile-title>
        </v-list-tile>
        <v-list-tile v-else @click="showLogin = true">
          <v-list-tile-title key="login">
            <translate>Login</translate>
          </v-list-tile-title>
        </v-list-tile>

        <v-list-tile v-if="user && !user.is_guest" href="/user/">
          <v-list-tile-title key="profile">
            <translate>My profile</translate>
          </v-list-tile-title>
        </v-list-tile>

        <v-list-tile @click="toggleFullscreen">
          <v-list-tile-title>
            <translate>Full screen</translate>
          </v-list-tile-title>
          <v-icon v-show="fullscreen" class="ml-3">check</v-icon>
        </v-list-tile>

        <portal-target name="app-menu" multiple/>

        <v-list-tile @click="openHelp">
          <v-list-tile-title>
            <translate>Help</translate>
          </v-list-tile-title>
        </v-list-tile>
      </v-list>
    </v-menu>

    <login-dialog
      :value="showLogin"
      :login-required="projectStatus !== 200"
      :permission-denied="projectStatus === 403"
      :password-reset="app.reset_password_url"
      @login="onLogin"
      @close="showLogin = false"
    />
    <projects-dialog v-if="showProjects" :projects="projects"/>
  </v-app>
</template>

<script>
import { mapState } from 'vuex'
import MapApp from './components/Map'
import LoginDialog from './components/LoginDialog'
import ProjectsDialog from './components/SelectProjectDialog'
import FullscreenMixin from './mixins/Fullscreen'

export default {
  name: 'app',
  mixins: [FullscreenMixin],
  components: { MapApp, LoginDialog, ProjectsDialog },
  data () {
    return {
      showProjects: false,
      showLogin: false
    }
  },
  computed: {
    ...mapState(['app', 'user', 'project']),
    projectStatus () {
      return this.project && this.project.config.status
    }
  },
  mounted () {
    if (process.env.NODE_ENV === 'development' && !location.search) {
      // Show list of user projects
      this.$http.get('/projects.json')
        .then((resp) => {
          this.projects = resp.data.projects
          this.showProjects = true
        })
        .catch(err => {
          console.error(err)
          this.showLogin = true
        })
    }
  },
  watch: {
    project: {
      immediate: true,
      handler (project) {
        if (!project || project.config.status !== 200) {
          this.showLogin = true
        }
      }
    }
  },
  methods: {
    loadProject () {
      let project = new URLSearchParams(location.search).get('PROJECT')
      if (project) {
        this.$http.project(project)
          .then(resp => {
            this.$store.commit('project', resp.data)
            document.title = resp.data.root_title
          })
          .catch(err => {
            console.error(err)
            const project = err && err.response && err.response.data
            if (project) {
              this.$store.commit('project', project)
            }
          })
      }
    },
    logout () {
      this.$http.logout().then(() => location.reload())
    },
    onLogin (user) {
      this.$store.commit('user', user)
      this.showLogin = false
      this.loadProject()
    },
    openHelp () {
      const width = parseInt(window.innerWidth * 0.65)
      const height = parseInt(window.innerWidth * 0.85)
      const left = parseInt((window.innerWidth - width) / 2)
      const params = `left=${left},width=${width},height=${height},resizable=yes,menubar=no,scrollbars=yes,status=no`
      const link = 'http://gisquick.readthedocs.io/en/latest/user-manual/user-interface.html'
      // const link = this.project.gislab_documentation
      window.open(link, 'Gisquick Documentation', params)
    }
  }
}
</script>

<style lang="scss">
@import './common.scss';
@import './transitions.scss';

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

<style lang="scss" scoped>
.app-menu {
  position: absolute;
  right: 0.5em;
  top: 0.5em;

  .v-menu__activator {
    .v-btn {
      margin: 0;
      width: 2.75em;
      height: 2.75em;
      border-radius: 20%;
      opacity: 0.8;
      .icon {
        font-size: 1.75em;
      }
    }
  }
}
</style>
