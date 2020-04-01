<template>
  <v-list>
    <v-list-tile v-if="user && !user.is_guest" @click="logout">
      <v-list-tile-title key="logout">
        <translate>Logout</translate>
      </v-list-tile-title>
    </v-list-tile>
    <v-list-tile v-else @click="login">
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
    <slot/>

    <v-list-tile @click="openHelp">
      <v-list-tile-title>
        <translate>Help</translate>
      </v-list-tile-title>
    </v-list-tile>
  </v-list>
</template>

<script>
import { mapState } from 'vuex'
import FullscreenMixin from '@/mixins/Fullscreen'

export default {
  name: 'AppMenu',
  mixins: [FullscreenMixin],
  computed: {
    ...mapState(['app', 'user'])
  },
  methods: {
    logout () {
      this.$http.logout().then(() => location.reload())
    },
    login () {
      this.$store.commit('showLogin', true)
    },
    onLogin (user) {
      this.$store.commit('user', user)
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
