<template>
  <v-speed-dial
    v-model="open"
    :open-on-hover="false"
    direction="bottom"
    transition="scale-transition"
  >
    <v-btn
      slot="activator"
      v-model="open"
      fab dark
    >
      <v-icon>menu</v-icon>
      <v-icon>close</v-icon>
    </v-btn>

    <v-btn
      v-for="tool in menuTools"
      :key="tool.name"
      @click="activate(tool)"
      fab dark
    >
      <icon :name="tool.icon"/>
    </v-btn>
  </v-speed-dial>
</template>

<script>

export default {
  props: {
    tools: Array
  },
  data () {
    return {
      open: false
    }
  },
  computed: {
    menuTools () {
      return this.tools.filter(t => t.icon)
    }
  },
  methods: {
    activate (tool) {
      this.$store.commit('activeTool', tool.name)
    }
  }
}
</script>

<style lang="scss" scoped>
.v-speed-dial {
  .v-btn--floating {
    border-radius: 20%;
    width: 2.75em;
    height: 2.75em;
  }
  svg.icon {
    width: 24px;
    height: 24px;
  }
}
</style>
