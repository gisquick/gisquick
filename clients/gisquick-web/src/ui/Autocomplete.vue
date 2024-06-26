<template>
  <input-field
    class="autocomplete"
    :class="{focused}"
    :error="error"
    :label="label"
    :color="color"
    :disabled="disabled"
    aria-haspopup="true"
    :aria-disabled="disabled"
    :aria-expanded="showPopup ? 'true' : 'false'"
    role="combobox"
  >
    <div class="input f-row-ac" tabindex="-1" @click="focusInput">
      <v-icon v-if="icon" :name="icon" class="mx-2" color="grey"/>
      <span
        v-if="value && !hideValue"
        class="f-grow"
        v-text="itemText ? value[itemText] : value"
        @click="onValueClick"
      />
      <input
        v-show="!value || hideValue"
        ref="input"
        :placeholder="placeholder"
        autocomplete="off"
        :value="text"
        v-on="proxyListeners"
        @click="openPopup"
        @blur="onTextfieldBlur"
        @input="updateText"
      />
      <v-spinner v-if="loading" class="ml-2" size="16" width="2"/>
      <v-btn v-else-if="text" tabindex="-1" class="icon flat ml-2" @click.stop="clear">
        <v-icon name="x" size="16"/>
      </v-btn>
      <slot name="append"/>
    </div>
    <template v-slot:error="scope">
      <slot name="error" v-bind="scope"/>
    </template>
    <popup-content
      backhandler
      :align="align"
      :transition="transition"
      :open="showPopup"
      :bounds="bounds"
      :popup-class="contentClass"
      :popup-style="popupStyle"
      @update:open="open = $event"
      @click:out="popupClick"
      @click:in="closePopup"
      @keydown.esc="closePopup"
      @keydown.tab.prevent="closePopup"
      @keydown.up.prevent="highlight(highlightIndex - 1)"
      @keydown.down.prevent="highlight(highlightIndex + 1)"
      @keydown.home.prevent="highlight(0)"
      @keydown.end.prevent="highlight(displayedItems.length)"
      @keydown.enter="onEnter"
      @closed="onClosed"
      @opened="popupOpened"
      tabindex="-1"
    >
      <div
        v-if="items && items.length > 0"
        ref="popup"
        tabindex="-1"
        role="listbox"
        class="popup-content popup-list"
        :style="colorVars"
      >
        <template v-for="(item, index) in renderItems">
          <div
            :key="index"
            ref="item"
            tabindex="0"
            class="item"
            role="option"
            :class="{
              highlighted: highlightIndex === index
            }"
            @click="selectItem(item)"
            @mouseover="highlightIndex = index"
          >
            <slot v-if="item === appendItem" name="append-item"/>
            <slot
              v-else
              name="item"
              :item="item"
              :index="index"
              :html="highlights[index] || {}"
            >
              <span v-if="highlights[index]" v-html="highlights[index][itemText]"/>
            </slot>
          </div>
        </template>
      </div>
    </popup-content>
  </input-field>
</template>

<script>
import clamp from 'lodash/clamp'
import pick from 'lodash/pick'
import PopupContent from './PopupContent.vue'
import InputField from './InputField.vue'
import { elementBounds } from './utils/popup'
import { colorVars } from './utils/colors'
import Focusable from './mixins/Focusable'


import { sanitize, escapeRegExp, removeDiacritics } from './utils/text'

function _highlight (orig, search, re) {
  const m = re.exec(search)
  if (m) {
    const s = m.index
    const e = s + m[0].length
    return orig.substring(0, s) + `<strong>${orig.substring(s, e)}</strong>` + _highlight(orig.substring(e), search.substring(e), re)
  }
  return orig
}

export function highlight (text, query) {
  text = sanitize(text)
  if (query.length === 0) {
    return text
  }
  const searchText = sanitize(removeDiacritics(text))
  const re = new RegExp(escapeRegExp(removeDiacritics(query)), 'i')
  return _highlight(text, searchText, re)
}

export default {
  components: { PopupContent, InputField },
  mixins: [Focusable],
  props: {
    align: String,
    color: {
      type: String,
      default: 'primary'
    },
    error: String,
    label: String,
    value: {},
    disabled: Boolean,
    transition: {
      type: [String, Object],
      default: 'slide-y'
    },
    placeholder: String,
    icon: String,
    items: Array,
    itemText: {
      type: String,
      default: 'text'
    },
    /**
     * Comma separated list of fields
     */
    highlightFields: String,
    itemValue: String,
    minChars: {
      type: Number,
      default: 1
    },
    multi: Boolean,
    contentClass: {
      type: String,
      default: 'popup-autocomplete'
    },
    uniformWidth: Boolean,
    loading: Boolean
  },
  data () {
    return {
      text: '',
      open: false,
      highlightIndex: -1,
      hideValue: false
    }
  },
  computed: {
    proxyListeners () {
      return pick(this.$listeners, ['focus', 'click', 'keydown'])
    },
    colorVars () {
      return colorVars(this.color)
    },
    showPopup () {
      return !!(this.open && this.text.length >= this.minChars && this.items?.length)
    },
    bounds () {
      return this.showPopup ? elementBounds(this.$el) : null
    },
    popupStyle () {
      const style = { ...this.colorVars }
      if (this.bounds) {
        const width = this.bounds.width + 'px'
        style.minWidth = width
        if (this.uniformWidth) {
          style.width = width
        }
      }
      return style
    },
    regex () {
      // return this.text && new RegExp(escapeRegExp(this.text), 'i')
      return this.text && new RegExp(escapeRegExp(sanitize(removeDiacritics(this.text))), 'i')
    },
    displayedItems () {
      return this.items
      /*
      if (!this.text) {
        return this.items
      }
      // filter only matched items (with highlight)
      // return this.items.filter(i => i[this.itemText].match(this.regex))
      return this.items.filter(i => this.regex.test(removeDiacritics(i[this.itemText])))
      */
    },
    renderItems () {
      return this.appendItem ? this.displayedItems.concat(this.appendItem) : this.displayedItems
    },
    highlights () {
      const fields = this.highlightFields?.split(',') || [this.itemText]
      return this.displayedItems.map(item => {
        return fields.reduce((obj, field) => {
          const text = item[field]
          obj[field] = this.text.length > 1 ? highlight(text, this.text) : text
          return obj
        }, {})
      })
    },
    appendItem () {
      return this.$scopedSlots['append-item'] && {}
    }
  },
  watch: {
    value: {
      immediate: true,
      handler (v) {
        // this.text = v?.[this.itemText] || ''
        // if (!v) {
        //   this.text = ''
        // } else if (!this.multi) {
        //   this.text = v?.[this.itemText] || ''
        // }
      }
    },
    focused (v) {
      if (!v) {
        // this.text = ''
        // this.onTextfieldBlur()
      }
    }
  },
  methods: {
    focus () {
      if (!this.disabled) {
        this.$refs.input?.focus()
      }
    },
    cleanup () {
      if (!this.text && !this.multi && this.value) {
        this.$emit('input', null)
      }
      if (!this.multi && this.text) {
        this.text = this.value?.[this.itemText] || ''
      }
    },
    onTextfieldBlur (e) {
      // console.log('onTextfieldBlur')
      return
      if (!this.showPopup || !this.value) {
        this.cleanup()
        this.$emit('blur', e)
      }
    },
    onInput (item) {
      this.hideValue = false
      let value = this.itemValue ? item[this.itemValue] : item
      if (this.multi) {
        value = Array.isArray(this.value) ? [...this.value, value] : [value]
      }
      this.$emit('input', value)
    },
    onValueClick () {
      this.hideValue = true
      this.openPopup()
    },
    selectItem (item) {
      if (item === this.appendItem) {
        this.$emit('append-item:click')
      } else {
        this.onInput(item)
      }
      if (this.multi) {
        this.text = ''
      }
      // this.text = ''
      this.focusInput()
    },
    updateText (e) {
      const text = e.target.value
      this.text = text
      this.open = true
      this.$emit('text:update', this.text)
    },
    openPopup () {
      this.open = true
      // this.$refs.textField.focus()
    },
    closePopup () {
      this.open = false
      this.$emit('close')
    },
    popupClick (e) {
      if (!this.$el.contains(e.target)) {
        this.closePopup()
      }
    },
    focusInput () {
      if (!this.disabled) {
        // this.$el.querySelector('[tabindex]').focus()
        this.$refs.input?.focus()
      }
    },
    highlight (index) {
      this.highlightIndex = clamp(index, -1, this.renderItems.length - 1)
      const el = this.$refs.item && this.$refs.item[this.highlightIndex]
      el && el.scrollIntoView({ block: 'nearest' })
    },
    onEnter (e) {
      if (this.highlightIndex !== -1) {
        this.selectItem(this.renderItems[this.highlightIndex])
        this.closePopup()
      } else {
        this.$emit('enter', e)
      }
    },
    clear () {
      this.text = ''
      if (!this.multi && this.value) {
        this.$emit('input', null)
      }
      this.$emit('clear')
    },
    removeItem (item) {
      const value = this.value.filter(i => i !== item)
      this.$emit('input', value)
    },
    onClosed () {
      return
      this.highlightIndex = -1
      if (!this.$refs.textField?.focused) {
        this.cleanup()
        this.$emit('blur')
      }
      this.$emit('closed')
    },
    popupOpened (e) {
      // console.log('popupOpened', e.target)
    }
  }
}
</script>

<style lang="scss" scoped>
.autocomplete {
  margin: var(--gutter);
  input {
    outline: none;
    border: none;
    background-color: transparent;
    font-size: inherit;
    color: inherit;
    text-align: inherit;
    font-family: inherit;
    flex-grow: 1;
    font-size: 15px;
  }
}
.popup-list {
  .item {
    outline: none;
    border: 1px solid;
    border-color: transparent;
    transition: all .3s cubic-bezier(.25,.8,.25,1);
    &.highlighted {
      border-color: var(--color);
      background-color: rgba(var(--color-rgb), 0.04);
    }
  }
}
</style>
