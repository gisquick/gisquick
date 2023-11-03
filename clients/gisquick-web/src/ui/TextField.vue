<template>
  <input-field
    class="text-field"
    :class="{focused}"
    :color="color"
    :focus="focus"
    :error="error"
    :label="label"
  >
    <div
      class="input"
      :class="{multiline}"
      :aria-disabled="disabled"
      :disabled="disabled"
      :tabindex="disabled ? -1 : 0"
      @click="onClick"
      @focus="focus"
    >
      <slot name="prepend"/>
      <component
        :is="inputTag"
        tabindex="-1"
        ref="inputEl"
        v-bind="$attrs"
        :name="name"
        :disabled="disabled || inputDisabled"
        @pointerup="updateCaretPosition"
        @input="onInput"
        @change="onChange"
        @blur="onInputBlur"
        @keyup="updateCaretPosition"
        @keydown="$emit('keydown', $event)"
      />
      <slot name="append"/>
    </div>
  </input-field>
</template>

<script lang="js">
import { colorVars } from './utils/colors'
import InputField from './InputField.vue'
import Focusable from '@/ui/mixins/Focusable'

const FormatSymbols = {
  N: /[0-9]/,
  S: /[a-zA-Z]/,
  A: /[0-9a-zA-Z]/
}

function cleanValue (value, mask) {
  const extraChars = {}
  const validators = []
  mask.split('').forEach(ms => {
    const regex = FormatSymbols[ms]
    if (regex) {
      validators.push(regex)
    } else {
      extraChars[ms] = true
    }
  })
  let validator = validators.shift()
  return value.split('').filter(ch => {
    if (!extraChars[ch] && validator && validator.test(ch)) {
      validator = validators.shift()
      return true
    }
  }).join('')
}

function formatValue (value, mask) {
  const chars = value.toString().split('')
  let val = ''
  let pos = 0
  let replaced = 0
  while (replaced < chars.length) {
    while (pos < mask.length && !FormatSymbols[mask[pos]]) {
      val += mask[pos]
      pos++
    }
    if (pos >= mask.length) {
      break
    }
    val += chars[replaced]
    replaced++
    pos++
  }
  return val
}
/*
function formatValue2 (value, mask) {
  const max = mask.split('').filter(c => !!FormatSymbols[c]).length
  const chars = value.toString().split('').slice(0, max)
  const output = []
  let pos = 0
  chars.forEach(ch => {
    while (!FormatSymbols[mask[pos]]) {
      output.push(mask[pos])
      pos++
    }
    output.push(ch)
    pos++
  })
  return output.join('')
}
*/

export default {
  mixins: [Focusable],
  components: { InputField },
  inheritAttrs: false,
  props: {
    autofocus: Boolean,
    value: [String, Number],
    name: String,
    error: String,
    color: {
      type: String,
      default: 'primary'
    },
    disabled: Boolean,
    inputDisabled: Boolean,
    label: String,
    lazy: Boolean,
    trim: Boolean,
    multiline: Boolean,
    displayFormat: String,
    validChars: String
    // valueFormat: String
  },
  computed: {
    inputTag () {
      return this.multiline ? 'textarea' : 'input'
    },
    colorVars () {
      return this.color && colorVars(this.color)
    },
    inputValue () {
      const value = this.value ?? ''
      if (this.displayFormat) {
        return formatValue(value, this.displayFormat)
      }
      return value
    },
    cleanFn () {
      if (this.validChars) {
        const re = new RegExp(this.validChars)
        return text => text.split('').filter(ch => re.test(ch)).join('')
      }
      return null
    }
  },
  watch: {
    focused (v) {
      this.$emit(v ? 'focus' : 'blur')
    },
    inputValue (v) {
      this.$refs.inputEl.value = v
    }
  },
  mounted () {
    this.$refs.inputEl.value = this.inputValue
    if (this.autofocus) {
      this.focus()
    }
  },
  methods: {
    focus (e) {
      if (this.disabled || this.inputDisabled || !this.$refs.inputEl) {
        return
      }
      if (!this.focused) {
        this.$refs.inputEl.value = this.inputValue
      }
      this.$refs.inputEl.focus()
    },
    onInputBlur (e) {
      if (this.$el.contains(e.relatedTarget)) {
        return
      }
      if (this.$refs.inputEl) {
        this.$refs.inputEl.value = this.inputValue
      }
    },
    onClick (e) {
      if (!this.disabled) {
        this.focus()
        this.$emit('click', e)
      }
    },
    updateCaretPosition (e) {
      this.lastCaretPosition = e.target.selectionStart
    },
    onInput (e) {
      let value = e.target.value
      if (this.cleanFn) {
        const cleaned = this.cleanFn(value)
        if (cleaned !== value) {
          e.target.value = cleaned
          value = cleaned
        }
      }
      const mask = this.displayFormat
      if (mask) {
        value = cleanValue(value, mask)
        let pos = e.target.selectionStart
        if (e.inputType === 'insertText' || e.inputType === 'insertFromPaste') {
          const offset = mask.slice(this.lastCaretPosition, pos).split('').filter(c => !FormatSymbols[c]).length
          pos += offset
        }
        e.target.value = formatValue(value, mask)
        e.target.setSelectionRange(pos, pos)
        this.lastCaretPosition = pos // helps when writing with long holding of single key
      }
      if (this.trim) {
        value = value.trim()
      }
      if (value !== this.value && !this.lazy) {
        this.$emit('input', value)
      }
    },
    onChange (e) {
      this.$emit(this.lazy ? 'input' : 'change', e.target.value)
    }
  }
}
</script>

<style lang="scss" scoped>
.input {
  display: flex;
  align-items: center;
  min-width: 0;
  line-height: normal; // (nice center alignment of span and input elements)

  outline: none;
  &.multiline {
    height: auto;
  }
  input, textarea {
    display: inline-block;
    border: none;
    font-size: inherit;
    outline: none;
    background-color: transparent;
    flex: 1;
    min-width: 0;
    align-self: stretch;
    color: inherit;
    text-align: inherit;
    font-family: inherit;
    padding: 0;
  }
  // input[type=number] {
  //   -moz-appearance: textfield;
  //   &::-webkit-inner-spin-button {
  //     -webkit-appearance: none;
  //   }
  // }
  textarea {
    line-height: 1.3;
  }
  textarea[noresize] {
    resize: none;
    min-height: 100%;
  }
  input[type="file"] {
    opacity: 0;
  }
}
</style>
