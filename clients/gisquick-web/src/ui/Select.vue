<template>
  <input-field
    class="select"
    :class="{focused}"
    :focus="focusComponent"
    :label="label"
    :color="color"
  >
    <div
      ref="select"
      role="button"
      class="input"
      :class="{open}"
      :disabled="disabled"
      aria-haspopup="true"
      :aria-disabled="disabled"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-owns="listId"
      :tabindex="disabled ? -1 : 0"
      @focus="onFocus"
      @blur="onBlur"
      @click="toggle"
    >
      <slot
        v-if="selection.items.size"
        name="selection"
        v-bind="selection"
        :toggle="selectItem"
      >
        <span class="value f-grow" v-text="selection.text"/>
      </slot>
      <span v-else class="placeholder f-grow" v-text="placeholder"/>
      <svg
        class="toggle"
        width="11"
        height="11"
        viewBox="0 0 10 10"
        @click.stop="toggle"
      >
        <path d="M 1,3 L 5,7 L 9,3"/>
      </svg>
      <document-listener
        v-if="focused && !open && !disabled"
        @keydown.space.prevent="openPopup"
        @keydown.up.prevent="select(selection.index - 1)"
        @keydown.down.prevent="select(selection.index + 1)"
        @keydown="keyHandler"
      />
      <popup-content
        backhandler
        transition="slide-y"
        :open.sync="open"
        :bounds="bounds"
        :align="align"
        :popup-class="contentClass"
        :popup-style="popupStyle"
        @click:out="clickOut"
        @keydown.esc="closePopup"
        @keydown.tab.prevent="closePopup"
        @keydown.up.prevent="keyboardHighlightPrev"
        @keydown.down.prevent="keyboardHighlightNext"
        @keydown.enter="selectHighlighted"
        @keydown.space.prevent="selectHighlighted"
        @keydown="keyHandler"
        @opened="onOpened"
      >
        <div
          class="popup-content popup-list"
          role="listbox"
          tabindex="-1"
          :id="listId"
          :style="colorVars"
          @mousemove="keyboardLock = false"
        >
          <template v-for="(item, index) in normItems">
            <template v-if="item.separator">
              <div v-if="item.text" :key="index" class="separator f-row-ac">
                <hr class="f-grow"/>
                <span class="separator mx-2" v-text="item.text"/>
                <hr class="f-grow"/>
              </div>
              <hr v-else :key="index"/>
            </template>
            <div
              v-else
              :key="index"
              ref="item"
              tabindex="0"
              role="option"
              class="item"
              :class="{
                highlighted: highlightIndex === index,
                selected: selection.items.has(item)
              }"
              :aria-disabled="item.disabled"
              :disabled="item.disabled"
              @click="selectItem(item)"
              @mouseover="onMouseOver(index)"
            >
              <slot
                name="item"
                :item="item"
                :index="index"
                :selected="selection.items.has(item)"
              >
                <span v-text="item[itemText]" class="f-grow m-2"/>
              </slot>
            </div>
          </template>
        </div>
      </popup-content>
    </div>
  </input-field>
</template>

<script lang="js">
import debounce from 'lodash/debounce'
import InputField from './InputField.vue'
import PopupContent from './PopupContent.vue'
import DocumentListener from './DocumentListener.js'
import { escapeRegExp, removeDiacritics } from './utils/text'
import { elementBounds } from './utils/popup'
import { colorVars } from './utils/colors'


let counter = 1
export default {
  components: { InputField, PopupContent, DocumentListener },
  props: {
    align: {
      type: String,
      // default: 'rr;bb,tt'
    },
    color: {
      type: String,
      default: 'primary'
    },
    contentClass: {
      type: String,
      default: 'popup-select'
    },
    disabled: Boolean,
    items: Array,
    itemText: {
      type: String,
      default: 'text'
    },
    itemValue: {
      type: String,
      default: 'value'
    },
    label: String,
    placeholder: String,
    value: {},
    multiple: Boolean
  },
  data () {
    return {
      open: false,
      bounds: null,
      highlightIndex: -1,
      focused: false,
      search: '',
      listId: null,
      keyboardLock: false
    }
  },
  computed: {
    popupStyle () {
      return this.bounds && { minWidth: this.bounds.width + 'px' }
    },
    colorVars () {
      return colorVars(this.color)
    },
    simpleItems () {
      return this.items.some(i => !Object.prototype.hasOwnProperty.call(i, this.itemText)) // ?? getItemValue
    },
    normItems () {
      return this.simpleItems ? this.items.map(v => ({ [this.itemText]: v?.toString() || '', [this.itemValue]: v })) : this.items
    },
    selection () {
      if (this.multiple) {
        const items = this.value?.map(v => this.normItems.find(i => this.getItemValue(i) === v)) || []
        const texts = items.map(i => i[this.itemText])
        return { items: new Set(items), text: texts.join(', ') }
      }
      const index = this.normItems.findIndex(i => this.getItemValue(i) === this.value)
      if (index !== -1) {
        const item = this.normItems[index]
        return { index, item, items: new Set().add(item), text: item[this.itemText] }
      }
      return { items: new Set() }
    }
  },
  watch: {
    focused (v) {
      this.$emit(v ? 'focus' : 'blur')
    }
  },
  created () {
    this.listId = `select-list-${counter++}`
  },
  methods: {
    getItemValue (item) {
      return this.itemValue ? item[this.itemValue] : item
    },
    focusComponent () {
      if (!this.disabled) {
        // this.$el.focus()
        this.$refs.select.focus()
      }
    },
    onFocus () {
      if (!this.disabled) {
        this.focused = true
      }
    },
    onBlur () {
      if (!this.open) {
        this.focused = false
      }
    },
    openPopup () {
      if (!this.disabled) {
        this.bounds = elementBounds(this.$el)
        this.open = true
      }
    },
    closePopup () {
      this.open = false
    },
    onOpened () {
      this.highlightIndex = 0
      if (!this.multiple) {
        this.highlight(this.selection.index)
      } else {
        // this.highlight(0)
      }
    },
    clickOut (e) {
      if (!this.$el.contains(e.target)) {
        this.closePopup()
        this.focused = false
      }
    },
    toggle () {
      if (!this.disabled) {
       this.open ? this.closePopup() : this.openPopup()
      }
    },
    highlight (index) {
      this.highlightIndex = Number.isInteger(index) ? Math.max(0, Math.min(this.items.length - 1, index)) : 0
      const el = this.$refs.item?.[this.highlightIndex]
      el && el.scrollIntoView({ block: 'nearest' })
    },
    isItemSelectable (item) {
      return !item.disabled && !item.separator
    },
    findIndex (predicate, start = 0, end) {
      end = end || this.items.length
      for (let i = start; i < end; i++) {
        if (predicate(this.normItems[i])) {
          return i
        }
      }
      return -1
    },
    keyboardHighlightNext () {
      this.keyboardLock = true
      const index = this.findIndex(this.isItemSelectable, this.highlightIndex + 1)
      if (index !== -1) {
        this.highlight(index)
      }
    },
    keyboardHighlightPrev () {
      this.keyboardLock = true
      for (let i = this.highlightIndex - 1; i >= 0; i--) {
        if (this.isItemSelectable(this.normItems[i])) {
          this.highlight(i)
          break
        }
      }
    },
    selectHighlighted (e) {
      if (e?.code === 'Space' && this.search) {
        return
      }
      const item = this.normItems[this.highlightIndex]
      if (item) {
        this.selectItem(item)
      }
    },
    select (index) {
      const item = this.normItems[index]
      item && this.selectItem(item)
    },
    selectItem (item) {
      if (item.disabled) {
        return
      }
      let value = this.getItemValue(item)
      if (this.multiple) {
        if (this.value?.includes(value)) {
          value = this.value.filter(v => v !== value)
        } else {
          value = this.value?.concat(value) || [value]
        }
      } else {
        this.closePopup()
      }
      this.$emit('input', value)
      this.focusComponent()
    },
    onMouseOver (index) {
      if (!this.keyboardLock) {
        this.highlightIndex = index
      }
    },
    _clearSearch: debounce(function () {
      this.search = ''
    }, 450),
    _search: debounce(function () {
      const action = this.open ? this.highlight : this.select
      const currentIndex = this.open ? this.highlightIndex : this.selection?.index || 0

      const re = new RegExp('^' + escapeRegExp(removeDiacritics(this.search)), 'i')
      const testItem = item => this.isItemSelectable(item) && re.test(removeDiacritics(item[this.itemText]))
      const startIndex = currentIndex !== -1 ? currentIndex + 1 : 0
      let index = this.findIndex(testItem, startIndex)
      if (index === -1 && startIndex > 0) { // search again from the beginning
        index = this.findIndex(testItem)
      }
      if (index !== -1) {
        action(index)
      }
    }, 100),
    keyHandler (e) {
      if (!this.open && this.multiple) {
        return
      }
      if (e.key.length === 1) {
        this.search += e.key
        this._search()
        this._clearSearch()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.input {
  display: flex;
  align-items: center;

  transition: all .4s cubic-bezier(.25,.8,.25,1);
  outline: none;
  cursor: default;

  .placeholder {
    opacity: 0.6;
  }
  .toggle {
    padding: 4px;
    margin-left: 8px;
    transition: 0.25s transform ease;
    box-sizing: content-box;
    path {
      stroke: none;
      fill: currentColor;
    }
  }
  &.open {
    .toggle {
      transform: rotate(180deg);
    }
  }
}
.focused {
  border-color: var(--status-color, var(--color));
  .toggle {
    color: var(--status-color, var(--color));
  }
}
</style>
