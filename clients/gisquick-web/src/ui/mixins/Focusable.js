// Source: https://zellwk.com/blog/keyboard-focusable-elements/
/**
 * Gets keyboard-focusable elements within a specified element
 * @param {HTMLElement} [element=document] element
 * @returns {Array}
 */
 export function getFocusableElement (element = document) {
  const targets = [...element.querySelectorAll(
    'a[href], button, input, textarea, select, details,[tabindex]:not([tabindex="-1"])'
  )]
  return targets.find(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
}

export default {
  computed: {
    focused () {
      const activeEl = this.$ui.activeEl
      return this.$el && (this.$el.contains(activeEl) || this.$ui.isLinked(activeEl, this.$el))
    }
  },
  watch: {
    focused (v) {
      // this.$emit(v ? 'focus' : 'blur')
    }
  },
  methods: {
    focus () {
      getFocusableElement(this.$el)?.focus()
    }
  }
}
