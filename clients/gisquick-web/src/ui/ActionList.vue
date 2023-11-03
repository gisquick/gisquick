<template>
  <div class="f-col">
    <document-listener
      v-if="focused"
      src="list"
      @keydown.up.prevent="highlightPrev"
      @keydown.down.prevent="highlightNext"
      @keydown.enter.prevent="confirmSelected"
      @keydown.space.prevent="onSpace"
    />
    <v-tree-view
      item-key="key"
      item-children="items"
      indent="0"
      :items="items"
      :expanded="expanded"
    >
      <template v-slot:group="{ group }">
        <div
          role="menuitem"
          class="item group f-row-ac"
          :class="{highlighted: highlighted === group, expanded: expanded[group.key]}"
          @click="onClick(group)"
          @mouseover="highlighted = group"
        >
          <v-icon
            role="button"
            class="toggle p-2"
            color="#777"
            name="arrow-down"
            size="12"
            @click.stop="toggleExpand(group)"
          />
          <span class="label f-grow" v-text="group.text"/>
          <slot
            :name="group.slot ? `item-prepend(${group.slot})` : 'item-prepend'"
            :item="group"
          />
        </div>
      </template>
      <template v-slot:leaf="{ item }">
        <template v-if="item.separator">
          <div v-if="item.text" class="separator f-row-ac">
            <hr class="f-grow"/>
            <span class="separator mx-2" v-text="item.text"/>
            <hr class="f-grow"/>
          </div>
          <hr v-else/>
        </template>
        <div
          v-else
          class="item f-row-ac"
          :class="[item.slot, {highlighted: highlighted === item}]"
          role="menuitem"
          :aria-disabled="item.disabled"
          @click="onClick(item)"
          @mouseover="highlighted = item"
        >
          <slot
            :name="item.slot ? `item(${item.slot})` : 'item'"
            :item="item"
          >
            <!-- <span :style="style" class="label f-grow m-2" v-text="item.text"/>
            <v-icon v-if="item.icon" :name="item.icon" size="20" class="m-2"/> -->
            <render-func :slots="$scopedSlots" :item="item"/>
          </slot>
        </div>
      </template>
    </v-tree-view>
  </div>
</template>

<script lang="jsx">
import DocumentListener from './DocumentListener.js'
import VCollapsible from './Collapsible.vue'
import VIcon from './Icon.vue'
import VTreeView from './TreeView.vue'

const renderItem = (h, item) => [
  <span class="label f-grow m-2">{item.text}</span>,
  item.icon && <v-icon name={item.icon} size="20" class="m-2"/>
]

const renderLinkItem = (h, item) => {
  const content = renderItem(h, item)
  if (!item.disabled) {
    return h('a', { staticClass: 'f-row-ac f-grow', attrs: { href: item.link } }, content)
  }
  return content
}

const renderCheckItem = (h, item) => [
  <span class="f-grow m-2">{item.text}</span>,
  <v-icon name={item.checked ? 'check' : ''} class="m-2"/>
]

const renderSwitchItem = (h, item) => [
  <span class="f-grow m-2">{item.text}</span>,
  <v-switch value={item.activated} class="round m-2"/>
]

const RenderFunc = {
  functional: true,
  props: ['item'],
  render (h, ctx) {
    const { item } = ctx.props
    if (item.link) {
      return renderLinkItem(h, item)
    }
    if (item.checked !== undefined) {
      return renderCheckItem(h, item)
    } else if (item.activated !== undefined) {
      return renderSwitchItem(h, item)
    }
    return renderItem(h, item)
  }
}

export default {
  components: { DocumentListener, RenderFunc, VCollapsible, VIcon, VTreeView },
  props: {
    focused: Boolean,
    items: Array,
    // expanded: null
  },
  data () {
    return {
      expanded: {},
      highlighted: null
    }
  },
  computed: {
    visibleItems () {
      const list = []
      const _flatten = items => {
        items.forEach(item => {
          list.push(item)
          if (item.items && this.expanded[item.key]) {
            _flatten(item.items)
          }
        })
      }
      _flatten(this.items)
      return list.filter(i => !i.separator)
    }
  },
  watch: {
    focused (focused) {
      if (!focused) {
        this.highlighted = null
      }
    }
  },
  methods: {
    toggleExpand (item) {
      this.$set(this.expanded, item.key, !this.expanded[item.key])
      // this.$emit('update:expanded', item)
    },
    highlightPrev () {
      const index = this.highlighted ? this.visibleItems.indexOf(this.highlighted) : -1
      const prev = this.visibleItems[index - 1]
      if (prev) {
        this.highlighted = prev
        this.$nextTick(() => {
          this.$el.querySelector('.highlighted')?.scrollIntoView({ block: 'nearest' })
        })
      }
    },
    highlightNext () {
      const index = this.highlighted ? this.visibleItems.indexOf(this.highlighted) : -1
      const next = this.visibleItems[index + 1]
      if (next) {
        this.highlighted = next
        this.$nextTick(() => {
          this.$el.querySelector('.highlighted')?.scrollIntoView({ block: 'nearest' })
        })
      }
    },
    confirmSelected () {
      this.$el.querySelector('.highlighted')?.click()
      // 'confirm' event will be triggered by click handler
    },
    onSpace () {
      if (this.highlighted && !this.highlighted.disabled) {
        if (this.highlighted.items) {
          this.toggleExpand(this.highlighted)
        } else {
          this.confirmSelected()
        }
      }
    },
    onClick (item) {
      if (!item.disabled) {
        item.action?.(item)
        this.$emit('confirm', item)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.group {
  .toggle {
    transition: .3s cubic-bezier(.25,.8,.5,1);
  }
  &.expanded {
    .toggle {
      transform: rotate(180deg);
    }
  }
}
.item {
  a {
    text-decoration: none;
    color: currentColor;
  }
}
</style>
