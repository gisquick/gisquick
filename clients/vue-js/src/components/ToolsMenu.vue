<template>
  <v-speed-dial
    class="tools"
    v-model="open"
    :open-on-hover="false"
    direction="bottom"
    transition="scale-transition">
    <v-btn
      fab dark
      color="gray"
      slot="activator"
      v-model="open">
      <v-icon>menu</v-icon>
      <v-icon>close</v-icon>
    </v-btn>

    <v-btn
      v-for="tool in tools"
      :key="tool.name"
      fab dark
      color="gray"
      @click="activate(tool)">
      <icon :name="tool.icon" />
    </v-btn>
  </v-speed-dial>
</template>

<script>
import Identification from './Identification'
import Measure from './measure/Measure'

export default {
  inject: ['$map', '$project'],
  data: () => ({
    open: false
  }),
  created () {
    this.tools = [
      Identification,
      Measure
    ]
  },
  methods: {
    activate (tool) {
      if (tool.activate) {
        tool.activate(this.$project)
      } else {
        this.$root.$panel.setPanel(tool)
      }
      this.activeTool = tool
    }
  }
}
</script>

<style lang="scss">
.tools.speed-dial {
  .btn--floating {
    border-radius: 20%;
    width: 2.75em;
    height: 2.7em;
  }
  svg.icon {
    width: 24px;
    height: 24px;
  }
}
</style>
