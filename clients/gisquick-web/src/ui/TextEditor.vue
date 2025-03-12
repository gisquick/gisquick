<template>
  <input-field
    color="primary"
    class="text-editor"
    :class="{focused}"
    :error="error"
    :label="label"
  >
    <svg-sprite/>
    <div v-show="!disabled && !readonly" class="input">
      <!-- wrapped in another container for proper scrolling and highlight line position -->
      <div class="content" ref="editor"/>
    </div>
    <div
      v-show="disabled || readonly"
      class="input"
      :aria-disabled="disabled"
      :disabled="disabled"
      v-html="value"
    />
    <scroll-area>
      <div class="toolbar f-row">
        <v-btn
          class="icon small"
          :disabled="inactive"
          @click="undo"
        >
          <v-tooltip slot="tooltip" align="c;tt">{{ tr.Undo }} (Ctrl+Z)</v-tooltip>
          <v-icon name="undo"/>
        </v-btn>
        <v-btn
          class="icon small"
          :disabled="inactive"
          @click="redo"
        >
          <v-tooltip slot="tooltip" align="c;tt">{{ tr.Redo }} (Ctrl+Y)</v-tooltip>
          <v-icon name="redo"/>
        </v-btn>
        <div class="separator"/>
        <v-btn
          class="icon small"
          :class="{active: bold}"
          :disabled="inactive"
          @click="toggleFormat('bold')"
        >
          <v-tooltip slot="tooltip" align="c;tt">{{ tr.Bold }} (Ctrl+B)</v-tooltip>
          <v-icon name="format_bold"/>
        </v-btn>
        <v-btn
          class="icon small"
          :class="{active: italic}"
          :disabled="inactive"
          @click="toggleFormat('italic')"
        >
          <v-tooltip slot="tooltip" align="c;tt">{{ tr.Italic }} (Ctrl+I)</v-tooltip>
          <v-icon name="format_italic"/>
        </v-btn>
        <v-btn
          class="icon small"
          :class="{active: underline}"
          :disabled="inactive"
          @click="toggleFormat('underline')"
        >
          <v-tooltip slot="tooltip" align="c;tt">{{ tr.Underline }} (Ctrl+U)</v-tooltip>
          <v-icon name="format_underlined"/>
        </v-btn>
        <v-btn
          class="icon small"
          :class="{active: strike}"
          :disabled="inactive"
          @click="toggleFormat('strike')"
        >
          <v-tooltip slot="tooltip" align="c;tt">{{ tr.Strike }} (Ctrl+Shift+7)</v-tooltip>
          <v-icon name="format_strikethrough"/>
        </v-btn>
        <v-menu align="ll,rr;tb,bt" @closed="toggleLink" @opened="$refs.hyperlink.focus()">
          <template v-slot:activator="{ toggle }">
            <v-btn
              class="icon small"
              :disabled="inactive"
              @click="hyperlink ? toggleLink() : toggle()"
            >
              <v-tooltip slot="tooltip" align="c;tt">{{ tr.Hyperlink }}</v-tooltip>
              <v-icon name="link-chain"/>
            </v-btn>
          </template>
          <template v-slot:menu="{ close }">
            <div class="hyperlink-menu popup-content light">
              <v-text-field
                ref="hyperlink"
                class="filled"
                label="URL"
                v-model="link.url"
                @keydown.enter="close"
              />
            </div>
          </template>
        </v-menu>

        <div class="separator"/>
        <v-btn
          class="icon small"
          :class="{active: unorderedList}"
          :disabled="inactive"
          @click="toggleFormat('unorderedList')"
        >
          <v-tooltip slot="tooltip" align="c;tt">{{ tr.UnorderedList }} (Ctrl+Shift+8)</v-tooltip>
          <v-icon name="format_list_bulleted"/>
        </v-btn>
        <v-btn
          class="icon small"
          :class="{active: orderedList}"
          :disabled="inactive"
          @click="toggleFormat('orderedList')"
        >
          <v-tooltip slot="tooltip" align="c;tt">{{ tr.OrderedList }} (Ctrl+Shift+9)</v-tooltip>
          <v-icon name="format_list_numbered"/>
        </v-btn>
        <div class="separator"/>
        <v-menu
          align="ll,rr;tb,bt"
          :items="textSizeMenu"
        >
          <template v-slot:activator="{ toggle }">
            <v-btn
              class="icon small wide"
              :disabled="inactive"
              @click="toggle"
            >
              <v-tooltip slot="tooltip" align="c;tt">{{ tr.TextSize }}</v-tooltip>
              <v-icon name="format_size"/>
              <svg width="10" height="10">
                <path d="M 1,3 L 9,3 L 5,7 Z"/>
              </svg>
            </v-btn>
          </template>
          <template v-slot:menu-item="{ item }">
            <span v-text="item.title" :style="{ fontSize: item.size }"/>
          </template>
        </v-menu>
        <v-menu
          align="ll,rr;tb,bt"
          close-on-click
        >
          <template v-slot:activator="{ toggle }">
            <v-btn
              class="icon small wide"
              :disabled="inactive"
              @click="toggle"
            >
              <v-tooltip slot="tooltip" align="c;tt">{{ tr.TextColor }}</v-tooltip>
              <v-icon name="format_text"/>
              <svg width="10" height="10">
                <path d="M 1,3 L 9,3 L 5,7 Z"/>
              </svg>
            </v-btn>
          </template>
          <template v-slot:menu>
            <div class="popup-content f-row">
              <color-picker
                :label="tr.BackgroundColor"
                @input="setBackgroundColor"
              />
              <color-picker
                :label="tr.TextColor"
                @input="setColor"
              />
            </div>
          </template>
        </v-menu>
        <div class="separator"/>
        <v-btn
          class="icon small"
          :class="{active: alignment === 'left'}"
          :disabled="inactive"
          @click="align('left')"
        >
          <v-tooltip slot="tooltip" align="c;tt">{{ tr.AlignLeft }}</v-tooltip>
          <v-icon name="format_align_left"/>
        </v-btn>
        <v-btn
          class="icon small"
          :class="{active: alignment === 'center'}"
          :disabled="inactive"
          @click="align('center')"
        >
          <v-tooltip slot="tooltip" align="c;tt">{{ tr.AlignCenter }}</v-tooltip>
          <v-icon name="format_align_center"/>
        </v-btn>
        <v-btn
          class="icon small"
          :class="{active: alignment === 'right'}"
          :disabled="inactive"
          @click="align('right')"
        >
          <v-tooltip slot="tooltip" align="c;tt">{{ tr.AlignRight }}</v-tooltip>
          <v-icon name="format_align_right"/>
        </v-btn>
        <div class="separator"/>
        <v-menu align="ll,rr;tb,bt" :items="menuItems">
          <template v-slot:activator="{ toggle }">
            <v-btn
              class="icon small"
              :disabled="inactive"
              @click="toggle"
            >
              <v-tooltip slot="tooltip" align="c;tt">{{ tr.Menu }}</v-tooltip>
              <v-icon name="menu-dots"/>
            </v-btn>
          </template>
        </v-menu>
      </div>
    </scroll-area>
  </input-field>
</template>

<script>
import Squire from 'squire-rte'
// import DOMPurify from 'dompurify'
import createDOMPurify from 'dompurify'

import InputField from '@/ui/InputField.vue'
import Focusable from '@/ui/mixins/Focusable'
import ColorPicker from '@/ui/ColorPicker.vue'

// icons sprite generated by command: node svg-sprite.js src/ui/icons/text-editor/ src/assets/text-editor.svg
import SvgSprite from '@/assets/text-editor.svg?inline'

const DOMPurify = createDOMPurify(window)
DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if ('target' in node) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener')
  }
})

const Formats = {
  bold: {
    tag: 'b',
    set: 'bold',
    unset: 'removeBold'
  },
  italic: {
    tag: 'i',
    set: 'italic',
    unset: 'removeItalic'
  },
  underline: {
    tag: 'u',
    set: 'underline',
    unset: 'removeUnderline'
  },
  strike: {
    tag: 's',
    set: 'strikethrough',
    unset: 'removeStrikethrough'
  },
  unorderedList: {
    tag: 'ul',
    set: 'makeUnorderedList',
    unset: 'removeList'
  },
  orderedList: {
    tag: 'ol',
    set: 'makeOrderedList',
    unset: 'removeList'
  }
}
function sanitizeToDOMFragment (html) {
  const frag = DOMPurify.sanitize(html, {
    ALLOW_UNKNOWN_PROTOCOLS: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: true,
    RETURN_DOM_FRAGMENT: true,
    FORCE_BODY: false
  })
  // return frag
  return frag ? document.importNode(frag, true) : document.createDocumentFragment()
}


export default {
  components: { ColorPicker, InputField, SvgSprite },
  mixins: [ Focusable ],
  props: {
    body: String,
    autofocus: Boolean,
    value: [String, Number],
    name: String,
    error: String,
    color: {
      type: String,
      default: 'primary'
    },
    disabled: Boolean,
    label: String,
    readonly: {
      type: Boolean,
      default: undefined
    },
    overrideFont: Boolean
  },
  data () {
    return {
      alignment: null,
      bold: false,
      italic: false,
      underline: false,
      strike: false,
      unorderedList: false,
      orderedList: false,
      hyperlink: false,
      link: {
        url: ''
      }
    }
  },
  computed: {
    textSizeMenu () {
      return [
        {
          text: 'Small',
          size: '13px',
          action: () => this.setSize('13px')
        }, {
          text: 'Normal',
          size: '16px',
          action: () => this.setSize('16px')
        }, {
          text: 'Large',
          size: '20px',
          action: () => this.setSize('20px')
        }
      ]
    },
    menuItems () {
      return [{
        text: this.$gettext('Copy HTML'),
        action: this.copyHTML
      }, {
        text: this.$gettext('Paste HTML'),
        action: this.pasteHTML
      }, {
        text: this.$gettext('Reset formatting'),
        action: () => {
          this.squire.removeAllFormatting()
        }
      }]
    },
    inactive () {
      return this.disabled || this.readonly
    },
    tr () {
      return {
        Undo: this.$gettext('Undo'),
        Redo: this.$gettext('Redo'),
        Bold: this.$gettext('Bold'),
        Italic: this.$gettext('Italic'),
        Underline: this.$gettext('Underline'),
        Strike: this.$gettext('Strike'),
        Hyperlink: this.$gettext('Hyperlink'),
        UnorderedList: this.$gettext('Unordered list'),
        OrderedList: this.$gettext('Ordered list'),
        TextSize: this.$gettext('Text size'),
        BackgroundColor: this.$gettext('Background color'),
        TextColor: this.$gettext('Text color'),
        AlignLeft: this.$gettext('Align left'),
        AlignCenter: this.$gettext('Align center'),
        AlignRight: this.$gettext('Align right'),
        Menu: this.$gettext('Menu')
      }
    }
  },
  watch: {
    value (value) {
      if (this._lastValue !== value) {
        this.squire.setHTML(value)
        this._lastValue = value
      }
    },
    focused (focused) {
      if (!focused) {
        const value = this.$refs.editor.textContent ? this.getText() : ''
        if (value !== this._lastValue) {
          this.$emit('input', value)
          this._lastValue = value
        }
      }
    }
  },
  async mounted () {
    const squire = new Squire(this.$refs.editor, {
      blockTag: 'p',
      blockAttributes: { 'class': '' },
      sanitizeToDOMFragment
    })
    // squire.addEventListener('select', this.checkFormat)
    // squire.addEventListener('cursor', this.checkFormat)
    squire.addEventListener('willPaste', (e) => {
      const frag = DOMPurify.sanitize(e.detail.html, {
        ALLOW_UNKNOWN_PROTOCOLS: true,
        WHOLE_DOCUMENT: false,
        RETURN_DOM: true,
        RETURN_DOM_FRAGMENT: true,
        FORCE_BODY: false
      })
      // replace selected unsupported fonts
      frag.querySelectorAll('[face*="Tahoma"], [face*="Calibri"]')
        .forEach(el => el.setAttribute('face', 'Roboto'))
      frag.querySelectorAll('[style*="Tahoma"], [style*="Calibri"]')
        .forEach(el => el.setAttribute('style', el.getAttribute('style').replaceAll('Calibri', 'Roboto')))

      e.detail.fragment = frag

      if (this.overrideFont) {
        setTimeout(() => {
          const range = new Range()
          const content = squire.getRoot()
          range.setStartBefore(content.firstChild)
          range.setEndAfter(content.lastChild)
          squire.setSelection(range)
          squire.setFontFace('Roboto')
          squire.setSelection(new Range)
        })
      }
    })
    squire.addEventListener('pathChange', this.checkFormat)
    this.$once('hook:beforeDestroy', () => squire.destroy())
    this.squire = squire
    this.squire.insertHTML(this.value, true)
  },
  methods: {
    toggleFormat (format) {
      const { tag, set, unset } = Formats[format]
      const fn = this.squire.hasFormat(tag) ? unset : set
      this.squire[fn]()
    },
    toggleLink () {
      const isLink = this.squire.hasFormat('a')
      if (isLink) {
        this.squire.removeLink()
      } else {
        this.squire.makeLink(this.link.url, { target: '_blank', rel: 'noopener' })
        this.link.url = ''
      }
    },
    align (alignment) {
      this.squire.setTextAlignment(alignment)
    },
    setColor (color) {
      this.squire.setTextColor(color)
    },
    setBackgroundColor (color) {
      this.squire.setHighlightColor(color)
    },
    setSize (size) {
      this.squire.setFontSize(size)
    },
    undo () {
      this.squire.undo()
    },
    redo () {
      this.squire.redo()
    },
    checkFormat (e) {
      this.bold = this.squire.hasFormat('b')
      this.italic = this.squire.hasFormat('i')
      this.underline = this.squire.hasFormat('u')
      this.strike = this.squire.hasFormat('s')
      this.unorderedList = this.squire.hasFormat('ul')
      this.orderedList = this.squire.hasFormat('ol')
      this.hyperlink = this.squire.hasFormat('a')
    },
    getText () {
      return DOMPurify.sanitize(this.squire.getHTML())
    },
    insertText (html) {
      const cleanHTML = DOMPurify.sanitize(html)
      this.squire.insertHTML(cleanHTML)
    },
    copyHTML () {
      navigator.clipboard.writeText(this.getText())
    },
    async pasteHTML () {
      const content = await navigator.clipboard.readText()
      const cleanHTML = DOMPurify.sanitize(content)
      this.squire.insertHTML(cleanHTML)
    }
  }
}
</script>

<style lang="scss" scoped>
.text-editor {
  .toolbar {
    background-color: #f2f2f2;
    border-radius: 2px;
    position: relative;
    height: auto;
    user-select: none;
    .separator {
      width: 1px;
      background-color: #ddd;
      margin: 3px;
    }
    .btn, .menu {
      margin: 1px 2px;
    }
    .btn {
      &.active {
        background-color: #ccc;
      }
    }
    .btn.wide {
      width: 32px;
    }
  }
  .input {
    display: grid;
    min-width: 0;
    min-height: 100px;
    line-height: normal; // (nice center alignment of span and input elements)

    outline: none;
    // make it resizable
    resize: vertical;
    overflow: hidden;
    // height: auto;
    // white-space: pre-line;
    transition: none;
    position: relative;
    .content {
      outline: none;
      overflow: auto;
    }
  }
}
.hyperlink-menu {
  width: clamp(320px, 400px, 50vw);
}
</style>
