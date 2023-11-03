<template>
  <div class="tools-menu f-col f-justify-start">
    <v-btn
      :color="color"
      class="icon"
      v-model="open"
      @click="open = !open"
    >
      <transition name="menu">
        <v-icon v-if="open" key="x" name="x"/>
        <v-icon v-else name="menu"/>
      </transition>
    </v-btn>

    <transition name="menu-items">
      <div class="items f-col" v-if="open">
        <v-btn
          v-for="tool in menuTools"
          :key="tool.name"
          :color="$store.state.activeTool === tool.name ? 'primary' : color"
          class="icon"
          :class="{active: $store.state.activeTool === tool.name}"
          @click="activate(tool)"
        >
          <v-icon :name="tool.icon" size="24"/>
        </v-btn>
      </div>
    </transition>
  </div>
</template>

<script lang="js">
export default {
  props: {
    color: String,
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
      this.open = false
    }
  }
}
</script>

<style lang="scss" scoped>
.tools-menu {
  margin: 3px;
  .btn {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    margin: 4px;
  }
}
.menu-enter-active {
  transition: all .4s ease;
}
.menu-leave-active {
  transition: all .4s ease;
  position: absolute;
}
.menu-enter, .menu-leave-to {
  opacity: 0;
  // transform: rotate(90deg);
}
.menu-leave-to {
  transform: rotate(90deg);
}
.menu-enter {
  transform: rotate(-90deg);
}

.menu-items-enter-active, .menu-items-leave-active {
  transition: all .4s ease;
  will-change: transform;
}
.menu-items-enter, .menu-items-leave-to {
  .btn {
    opacity: 0;
    transform: translate3d(0, -10px, 0) scale3d(0.1, 0.1, 0.1);
  }
}
.items {
  .btn {
    // will-change: transform;
    backface-visibility: hidden;
  }
  :nth-child(2) {
    transition-delay: 0.05s;
  }
  :nth-child(3) {
    transition-delay: 0.1s;
  }
  :nth-child(4) {
    transition-delay: 0.15s;
  }
}
</style>
