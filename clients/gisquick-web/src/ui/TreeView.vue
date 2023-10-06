<script lang="jsx">
import VCollapsible from './Collapsible.vue'

function addStyle (cmp, style) {
  if (!cmp.data) {
    cmp.data = { style }
  } else {
    cmp.data.style = style
  }
}

export default {
  name: 'TreeView',
  components: { VCollapsible },
  props: {
    expanded: Object,
    expandedKey: String,
    items: Array,
    itemKey: String,
    itemChildren: {
      type: String,
      default: 'items'
    },
    itemsData: Object,
    baseIndent: [String, Number],
    indent: {
      type: [String, Number],
      default: 26
    },
    groupContentAttrs: Function
  },
  computed: {
    numBaseIndent () {
      return parseInt(this.baseIndent)
    },
    numIndent () {
      return parseInt(this.indent)
    }
  },
  methods: {
    isGroup (item) {
      return item[this.itemChildren]?.length > 0
    },
    isExpanded (group) {
      return this.expandedKey
        ? group[this.expandedKey]
        : Boolean(this.expanded?.[group[this.itemKey]])
    },
    indendStyle (depth) {
      return this.indent ? { paddingLeft: `${this.numBaseIndent + this.numIndent * depth}px` } : null
    },
    renderGroup (h, group, depth) {
      const style = this.indendStyle(depth)
      let groupContent = null
      const groupKey = group[this.itemKey]
      const expanded = this.isExpanded(group)
      if (expanded) {
        const contentData = this.groupContentAttrs?.(group)
        const children = group[this.itemChildren].map(item => this.isGroup(item) ? this.renderGroup(h, item, depth + 1) : this.renderLeaf(h, item, group, depth + 1))
        // groupContent = <div class="group-items f-col" key={`gi-${groupKey}`} {...contentData}>{children}</div>
        groupContent = h('div', { staticClass: 'group-items f-col', ...contentData }, children)
      }

      // const contentData = this.groupContentAttrs?.(item)
      // const children = item[this.itemChildren].map(item => this.isGroup(item) ? this.renderGroup(h, item, depth + 1) : this.renderLeaf(h, item, group, depth + 1))
      // groupContent = <div vShow={expanded} class="group-items f-col" key={`gi-${groupKey}`} {...contentData}>{children}</div>

      const groupItem = this.$scopedSlots.group({ group, depth, style })
      if (style) {
        // addStyle(groupItem[0], style)
      }
      return [
          groupItem,
          <v-collapsible key={`col-${groupKey}`}>
            {groupContent}
          </v-collapsible>
      ]
      // return (
      //   <div class="f-col" key={groupKey}>
      //     {groupItem}
      //     <v-collapsible key={`col-${groupKey}`}>
      //       {groupContent}
      //     </v-collapsible>
      //   </div>
      // )
    },
    renderLeaf (h, item, group, depth) {
      const style = this.indendStyle(depth)
      const props = { item, group, depth, style }
      if (this.itemsData) {
        props.data = this.itemsData[item[this.itemKey]]
        // Object.assign(props, this.itemsData[item[this.itemKey]])
      }
      const cmp = this.$scopedSlots.leaf(props)
      if (style) {
        // addStyle(cmp[0], style)
      }
      return cmp
    }
  },
  render (h) {
    const children = this.items.map(item => this.isGroup(item) ? this.renderGroup(h, item, 0) : this.renderLeaf(h, item, null, 0))
    return (
      <div class="tree-view f-col">
        {children}
      </div>
    )
  }
}
</script>
