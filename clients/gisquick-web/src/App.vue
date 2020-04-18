<template>
  <v-app id="app">
    <intro-page v-if="!projectPath"/>
    <map-app v-if="projectStatus === 200"/>
    <login-dialog
      :value="showLogin"
      :login-required="projectStatus !== 200"
      :permission-denied="projectStatus === 403"
      :password-reset-url="app.reset_password_url"
      @login="onLogin"
      @close="$store.commit('showLogin', false)"
    />
    <project-not-found v-if="projectStatus === 404"/>
  </v-app>
</template>

<script>
import { mapState } from 'vuex'
import IntroPage from '@/IntroPage.vue'
import ProjectNotFound from '@/ProjectNotFound.vue'
import DesktopMap from '@/components/Map.vue'
import MobileMap from '@/components/MobileMap.vue'
import LoginDialog from '@/components/LoginDialog.vue'

export default {
  components: {
    ProjectNotFound,
    LoginDialog,
    IntroPage,
    MapApp: async () => window.env.mobile ? MobileMap : DesktopMap
  },
  computed: {
    ...mapState(['app', 'user', 'project', 'showLogin']),
    projectPath () {
      return new URLSearchParams(location.search).get('PROJECT')
    },
    projectStatus () {
      return this.project && this.project.config.status
    }
  },
  created () {
    this.loadProject()
  },
  watch: {
    projectStatus: {
      immediate: true,
      handler (status) {
        if (status === 401 || status === 403) {
          this.$store.commit('showLogin', true)
        }
      }
    }
  },
  methods: {
    loadProject () {
      let project = new URLSearchParams(location.search).get('PROJECT')
      if (project) {
        this.$http.project(project)
          .then(data => {
            this.$store.commit('project', data)
            document.title = data.root_title
          })
          .catch(data => {
            this.$store.commit('project', data)
          })
      }
    },
    onLogin (user) {
      this.$store.commit('user', user)
      this.$store.commit('showLogin', false)
      this.loadProject()
    }
  }
}
</script>

<style lang="scss">
@import './common.scss';
@import './transitions.scss';

html {
  overflow: auto;
  font-size: 1em!important;
}
</style>
