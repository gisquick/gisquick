<template>
  <v-menu
    bottom left
    class="app-menu"
    content-class="app-menu-content">
    <v-btn dark fab slot="activator">
      <v-icon>more_vert</v-icon>
    </v-btn>

    <v-list>
      <v-list-tile @click="logout">
        <v-list-tile-title>Logout</v-list-tile-title>
      </v-list-tile>

      <v-list-tile :href="userProfileLink">
        <v-list-tile-title>My profile</v-list-tile-title>
      </v-list-tile>

      <v-list-tile @click="toggleFullscreen">
        <v-list-tile-title>{{ fullscreen ? 'Exit Full Screen' : 'Full screen' }}</v-list-tile-title>
        <v-icon v-show="fullscreen">check</v-icon>
      </v-list-tile>

      <v-list-tile @click="toggleAttributions">
        <v-list-tile-title>Display attributions</v-list-tile-title>
        <v-icon v-show="!attributionsHidden">check</v-icon>
      </v-list-tile>

      <!-- <v-list-tile href="http://gisquick.readthedocs.io/en/latest/user-manual/user-interface.html"> -->
      <v-list-tile @click="openHelp">
        <v-list-tile-title>Help</v-list-tile-title>
        <!-- <icon name="zoom-to"></icon> -->
      </v-list-tile>
    </v-list>

  </v-menu>
</template>

<script>
import Attribution from 'ol/control/attribution'
import HTTP from '../client'
import FullscreenMixin from '../mixins/Fullscreen'

export default {
  name: 'app-menu',
  mixins: [FullscreenMixin],
  inject: ['$map', '$project'],
  data: () => ({
    attributionsHidden: false
  }),
  computed: {
    userProfileLink () {
      return '/user/'
      // return HTTP.absUrl('/user/')
    }
  },
  mounted () {
    setTimeout(() => {
      this.attributions = this.$map.getControls().getArray().find(c => c instanceof Attribution)
      this.attributionsHidden = this.attributions.getCollapsed()
    }, 200)
  },
  methods: {
    logout () {
      HTTP.logout().then(() => {
        location.reload()
      })
    },
    toggleAttributions () {
      this.attributionsHidden = !this.attributionsHidden
      this.attributions.setCollapsed(this.attributionsHidden)
    },
    openHelp () {
      const width = parseInt(window.innerWidth * 0.65)
      const height = parseInt(window.innerWidth * 0.85)
      const left = parseInt((window.innerWidth - width) / 2)
      const params = `left=${left},width=${width},height=${height},resizable=yes,menubar=no,scrollbars=yes,status=no`
      const link = 'http://gisquick.readthedocs.io/en/latest/user-manual/user-interface.html'
      // const link = this.$project.gislab_documentation
      window.open(link, 'Gisquick Documentation', params)
    }
  }
}
</script>

<style lang="scss">
.app-menu {
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
