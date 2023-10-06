<script lang="js">
export default {
  props: {
    items: Array
  },
  watch: {
    items: {
      immediate: true,
      handler (items) {
        this.$menu.setItems(items)
      }
    }
  },
  render () {
    return null
  }
}
</script>
