<template>
  <v-menu
    :items="items"
    v-bind="$attrs"
    align="rr;bb"
  >
    <template
      v-for="(index, name) in $scopedSlots"
      v-slot:[name]="slotData"
    >
      <slot :name="name" v-bind="slotData"/>
    </template>
  </v-menu>
</template>

<script lang="js">
import Vue from 'vue'
import { mapState } from 'vuex'
import FullscreenMixin from '@/mixins/Fullscreen'

export default {
  name: 'AppMenu',
  mixins: [FullscreenMixin],
  data () {
    return {
      // extraItems: {}
      extraItems: []
    }
  },
  computed: {
    ...mapState(['app', 'user']),
    userMenuItems () {
      if (this.user && !this.user.is_guest) {
        return [
          {
            key: 'logout',
            text: this.$gettext('Logout'),
            action: this.logout,
            icon: 'logout'
          }, {
            key: 'profile',
            text: this.$gettext('My profile'),
            link: '/user/'
          }
        ]
      }
      return [{
        key: 'login',
        text: this.$gettext('Login'),
        action: this.login,
        icon: 'login'
      }]
    },
    items () {
      return [
        ...this.userMenuItems,
        ...this.extraItems,
        {
          key: 'fullscreen',
          text: this.$gettext('Full screen'),
          action: this.toggleFullscreen,
          activated: this.fullscreen
        },
        {
          key: 'permalink',
          text: this.$gettext('Permalink'),
          action: this.createPermalink
        }, {
          key: 'help',
          text: this.$gettext('Help'),
          action: this.openHelp
        }
      ]
    }
  },
  created () {
    Vue.prototype.$menu = {
      setItems: (items, key) => {
        this.extraItems = items || []
      }
    }
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
    },
    createPermalink () {
      const permalink = this.$map.ext.createPermalink()
      navigator.clipboard.writeText(permalink)
    }
  }
}
</script>
