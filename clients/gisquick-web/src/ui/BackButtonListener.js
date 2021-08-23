export default {
  mounted () {
    if (history.backhandler) {
      const backHandler = () => this.$emit('back')
      history.backhandler.addHandler(backHandler)
      this.$once('hook:beforeDestroy', () => history.backhandler.removeHandler(backHandler))
    }
  },
  render: () => null
}
