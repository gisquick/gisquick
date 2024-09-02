import keyBy from 'lodash/keyBy'

import {
  DateWidget, ValueMapWidget, BoolWidget, UrlWidget,
  createImageTableWidget, createMediaFileTableWidget, mediaUrlFormat
} from '@/components/GenericInfopanel.vue'

const ActionsHeader = {
  text: '',
  key: 'actions',
  sortable: false,
  header: {
    width: 1
  }
}

export default {
  computed: {
    attributes () {
      if (this.layer.attr_table_fields) {
        const attrsMap = keyBy(this.layer.attributes, 'name')
        return this.layer.attr_table_fields.map(name => attrsMap[name])
      }
      return this.layer.attributes
    },
    columns () {
      if (this.attributes) {
        const columns = this.attributes.map(attr => ({
          attr,
          key: attr.name,
          label: attr.alias || attr.name,
          header: {
            slot: 'filter'
          }
        }))
        return [ActionsHeader, ...columns]
      }
      return []
    },
    tableData () {
      return this.features?.map(f => ({
        _id: f.getId(),
        ...f.getProperties(),
        ...f.getFormattedProperties()
      }))
    },
    slots () {
      const slots = {}
      this.attributes.forEach(attr => {
        let widget
        if (attr.widget === 'ValueMap') {
          widget = ValueMapWidget
        } else if (attr.widget === 'Hyperlink') {
          widget = UrlWidget
        } else if (attr.widget === 'Image') {
          widget = createImageTableWidget()
        } else if (attr.widget === 'MediaFile' || attr.widget === 'MediaImage') {
          widget = createMediaFileTableWidget(mediaUrlFormat(this.project.config.name, this.layer, attr))
        } else if (attr.type === 'date') { // and also attr.widget === 'DateTime' ?
          widget = DateWidget
        } else if (attr.type === 'bool') {
          widget = BoolWidget
        }
        if (widget) {
          slots[attr.name] = { component: widget, attribute: attr }
        }
      })
      return slots
    }
  }
}
