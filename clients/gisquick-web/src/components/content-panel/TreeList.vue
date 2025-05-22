<script lang="jsx">
import _xor from 'lodash/xor'

export default {
  props: {
    items: Array,
    groupKey: String,
    itemKey: String,
    childrenKey: {
      type: String,
      default: 'children'
    },
    opened: Array,
    collapsed: Array,
    wrapperClass: String,
    inheritedAttrs: Function
  },
  methods: {
    toggleGroup (group) {
      if (this.collapsed) {
        const key = group[this.groupKey]
        this.$emit('update:collapsed', _xor(this.collapsed, [key]))
      } else {
        this.$emit('update:opened', _xor(this.opened, [key]))
      }
    },
    wrapContent (content, key, className, attrs) {
      if (content.length > 1) {
        return content.map((c, i) => <div key={`${key}_${i}`} class={[this.wrapperClass, className]} {...attrs}>{c}</div>)
      }
      return <div key={key} class={[this.wrapperClass, className]} {...attrs}>{content}</div>
    },
    renderLeafItem (item, group, depth, attrs) {
      const content = this.$scopedSlots.leaf({ item, group, depth, attrs })
      if (this.wrapperClass) {
        return this.wrapContent(content, item[this.itemKey], 'leaf', attrs)
      }
      return content
    },
    renderGroupContent (group, depth, attrs) {
      return group[this.childrenKey].map(item => item[this.childrenKey]
        ? this.renderGroup(item, group, depth, attrs)
        : this.renderLeafItem(item, group, depth, attrs)
      )
    },
    renderGroup (group, parent, depth, attrs) {
      const slot = this.$scopedSlots['group']
      let children = []
      let open = false
      const key = group[this.groupKey]
      open = this.collapsed
        ? !this.collapsed.includes(key)
        : this.opened?.includes(key) ?? false
      if (open) {
        const inherited = { ...attrs, ...this.inheritedAttrs?.(group) }
        children = this.renderGroupContent(group, depth + 1, inherited)
      }
      let groupNode = slot({ item: group, parent, depth, attrs, open, toggle: this.toggleGroup })
      if (this.wrapperClass) {
        groupNode = this.wrapContent(groupNode, key, 'group', attrs)
      }
      return [groupNode, ...children]
    }
  },
  render () {
    const root = { [this.childrenKey]: this.items }
    const children = this.renderGroupContent(root, 0)
    return (
      <transition-group name="list" tag="div" class="tree-list f-col">
        {children}
      </transition-group>
    )
  }
}
</script>
