let stack = []
const windowEvents = ['resize']

const DocumentListener = {
  props: {
    stacked: Boolean,
    src: String // for easier debugging
  },
  mounted () {
    if (this.stacked) {
      stack.push(this._uid)
    }
    const listeners = {}
    setTimeout(() => {
      if (!this._isDestroyed) {
        for (const type in this.$listeners) {
          listeners[type] = e => {
            if (!this.stacked || stack[stack.length - 1] === this._uid) {
              this.$emit(type, e)
            }
          }
          const target = windowEvents.includes(type) ? window : document
          target.addEventListener(type, listeners[type], true)
        }
      }
    }, 100)
    this.$once('hook:beforeDestroy', () => {
      stack = stack.filter(uid => uid !== this._uid)
      for (const type in listeners) {
        const target = windowEvents.includes(type) ? window : document
        target.removeEventListener(type, listeners[type], true)
      }
    })
  },
  render: () => null
}

export default DocumentListener
