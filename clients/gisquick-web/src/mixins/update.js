import { registerSW } from 'virtual:pwa-register'

export default {
  created() {
    if (import.meta.env.MODE === 'production' && import.meta.env.VITE_VUE_APP_MODE === 'pwa') {
      this.updateServiceWorker = registerSW({
        onNeedRefresh: () => {
          this.updateExists = true
        },
      })
    }
  },

  data () {
    return {
      // refresh variables
      refreshing: false,
      registration: null,
      updateExists: false,
    }
  },

  methods: {
    // Called when the user accepts the update
    refreshApp () {
      if (this.updateServiceWorker) {
        this.updateExists = false
        this.updateServiceWorker()
      }
    }
  }
}
