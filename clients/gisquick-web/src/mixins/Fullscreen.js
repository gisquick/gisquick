const fullscreenEvents = ['fullscreenchange', 'mozfullscreenchange', 'webkitfullscreenchange']

export default {
  data: () => ({
    fullscreen: false
  }),
  created () {
    const onChange = () => {
      this.fullscreen = Boolean(document.webkitIsFullScreen || document.mozFullScreen)
    }
    const keyHandler = (evt) => {
      // handle F11 key to 'replace' default (browser's) full screen mode
      // with custom full screen
      if (evt.code === 'F11') {
        evt.preventDefault()
        evt.stopPropagation()
        this.toggleFullscreen()
      }
    }
    document.addEventListener('keydown', keyHandler)
    this._listeners = {
      keydown: keyHandler
    }
    fullscreenEvents.forEach(name => {
      document.addEventListener(name, onChange)
      this._listeners[name] = onChange
    })
    onChange()
  },
  beforeDestroy () {
    Object.keys(this._listeners).forEach(name => document.removeEventListener(name, this._listeners[name]))
  },
  methods: {
    toggleFullscreen () {
      if (this.fullscreen) {
        const fullscreenExitFn = document.mozCancelFullScreen || document.webkitCancelFullScreen
        fullscreenExitFn.bind(document)()
      } else {
        const body = document.body
        const fullscreenFn = body.mozRequestFullScreen || body.webkitRequestFullscreen
        fullscreenFn.bind(body)()
      }
    }
  }
}
