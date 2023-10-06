<template>
  <popup-content
    backhandler
    type="dialog"
    :backdrop="modal"
    :open.sync="open"
    :transition="transition"
    :popup-class="popupClass"
    @update:open="close"
    @click:out="closeIfAllowed"
    @keydown.esc="closeIfAllowed"
    @closed="$emit('closed')"
    @opened="$emit('opened')"
  >
    <!-- <slot name="header">
      <div class="header">
        <slot name="title">
          <span class="title">{{ title }}</span>
        </slot>
        <v-btn
          color="primary"
          class="icon"
          @click="close"
        >
          <v-icon size="16" name="close"/>
        </v-btn>
      </div>
    </slot> -->
    <slot
      v-if="open"
      :close="close"
      :data="data"
    />
  </popup-content>
</template>

<script lang="js">
import PopupContent from './PopupContent.vue'

export default {
  components: { PopupContent },
  props: {
    contentClass: {
      type: String,
      default: 'light'
    },
    modal: {
      type: Boolean,
      default: true
    },
    title: String,
    transition: {
      type: [String, Object],
      default: 'slide-y'
    },
    persistent: Boolean,
    value: Boolean
  },
  data () {
    return {
      data: null,
      open: false
    }
  },
  computed: {
    popupClass () {
      return ['dialog', 'popup-content', this.contentClass]
    }
  },
  watch: {
    value: {
      immediate: true,
      handler (val) {
        if (val !== this.open) {
          val ? this.show() : this.close()
        }
      }
    }
  },
  methods: {
    show (data) {
      this.open = true
      this.data = data
    },
    close () {
      this.open = false
      this.$emit('close')
      this.$emit('input', false)
    },
    closeIfAllowed () {
      !this.persistent && this.close()
    }
  }
}
</script>

<style lang="scss">
.dialog {
  text-align: left;
  font-size: 14px;
  .header {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    padding: 12px;
    text-align: center;
    .title {
      grid-area: 1 / 1 / 2 / 3;
      margin: 24px 6px 6px 6px;
      font-size: 34px;
      font-weight: bold;
      color: var(--color-primary);
      justify-self: center;
      max-width: calc(100% - 100px);
    }
    .btn {
      grid-area: 1 / 2 / 2 / 3;
      min-width: 26px;
      width: 26px;
      height: 26px;
      align-self: start;
    }
    @media (max-width: 600px) {
      padding: 6px;
      .title {
        font-size: 24px;
      }
    }
  }
}
</style>
