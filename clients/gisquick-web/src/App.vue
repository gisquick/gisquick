<template>
  <div id="app" class="app f-col">
    <intro-page v-if="!projectName"/>
    <map-app v-if="projectStatus === 200" :key="projectKey"/>
    <login-dialog
      :value="showLogin"
      :login-required="projectStatus !== 200"
      :permission-denied="projectStatus === 403"
      :password-reset-url="app.reset_password_url"
      @login="onLogin"
      @close="$store.commit('showLogin', false)"
    />
    <project-not-found v-if="projectStatus === 400 || projectStatus === 404"/>
    <server-error v-if="projectStatus === 500"/>
    <popup-layer class="light"/>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import IntroPage from '@/IntroPage.vue'
import ProjectNotFound from '@/ProjectNotFound.vue'
import DesktopMap from '@/components/Map.vue'
import MobileMap from '@/components/MobileMap.vue'
import LoginDialog from '@/components/LoginDialog.vue'
import PopupLayer from '@/ui/PopupLayer.vue'
import ServerError from './ServerError.vue'

export default {
  components: {
    PopupLayer,
    ProjectNotFound,
    LoginDialog,
    IntroPage,
    ServerError,
    MapApp: async () => window.env.mobile ? MobileMap : DesktopMap
  },
  data () {
    return {
      projectKey: 0
    }
  },
  computed: {
    ...mapState(['app', 'user', 'project', 'showLogin']),
    projectName () {
      return new URLSearchParams(location.search).get('PROJECT') || this.app.landing_project
    },
    projectStatus () {
      return this.project && this.project.config.status
    }
  },
  created () {
    this.loadProject()
  },
  mounted () {
    if (window.env.mobile) {
      const setHeightStyle = () => {
        const vh = window.innerHeight / 100
        document.documentElement.style.setProperty('--vh', `${vh}px`)
      }
      window.addEventListener('resize', setHeightStyle)
      setHeightStyle()
      this.$once('hook:beforeDestroy', () => window.removeEventListener('resize', setHeightStyle))
    }
  },
  watch: {
    projectStatus: {
      immediate: true,
      handler (status) {
        if (status === 401 || status === 403) {
          this.$store.commit('showLogin', true)
        }
      }
    },
    project () {
      this.projectKey++
    }
  },
  methods: {
    loadProject () {
      if (this.projectName) {
        this.$http.project(this.projectName)
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
@import './theme.scss';
@import './transitions.scss';

html {
  overflow: auto;
  font-size: 16px;
  font-family: Roboto,sans-serif;
  line-height: 1.5;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
body {
  overscroll-behavior-x: none;
  touch-action: none;
}
</style>
