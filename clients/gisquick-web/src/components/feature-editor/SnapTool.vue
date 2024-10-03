<template>
  <div class="f-row-ac">
    <v-btn
      class="icon flat"
      :color="active ? 'primary' : ''"
      :disabled="snappingLayersList.length === 0"
      @click="$emit('update:active', !active)"
    >
      <v-tooltip slot="tooltip">
        <translate>Snapping</translate>
      </v-tooltip>
      <v-icon name="snap"/>
    </v-btn>
    <v-menu
      class="light"
      align="rr,ll;bb,tt"
      :items="menuItems"
    >
      <template v-slot:activator="{ toggle }">
        <v-btn class="icon small flat ml-0" @click="toggle">
          <v-tooltip slot="tooltip">
            <translate>Snapping layers</translate>
          </v-tooltip>
          <div class="f-col-ac">
            <v-icon name="layers" size="16"/>
            <svg
              class="toggle"
              width="10"
              height="4"
              viewBox="0 0 10 4"
            >
              <path d="M 1,0 L 5,4 L 9,0"/>
            </svg>
          </div>
        </v-btn>

      </template>
    </v-menu>
    <v-notification ref="notification"/>
    <snap-interaction
      v-if="active"
      :project="project"
      :layers="snappingLayers"
      :offset="offset"
      :ol-style="snapGeomStyle"
      @overlimit="showWarning(tr.OverLimitMsg)"
      @fetcherror="showError(tr.FetchError)"
    />
  </div>
</template>

<script>
import SnapInteraction from '@/components/ol/SnapInteraction.vue'
import VNotification from '@/ui/Notification.vue'
import { simpleStyle } from '@/map/styles'

export default {
  components: { SnapInteraction, VNotification },
  props: {
    active: Boolean,
    layers: Array,
    project: Object,
    offset: Object // when using Translate interaction
  },
  computed: {
    snappingLayersList () {
      return this.project.overlays.list.filter(l => l.queryable && !l.hidden && l.type === 'VectorLayer')
    },
    menuItems () {
      const layers = this.snappingLayersList.map(l => ({
        text: l.title,
        checked: this.layers.includes(l.name),
        keepOpen: true,
        action: () => {
          const index = this.layers.indexOf(l.name)
          if (index === -1) {
            this.layers.push(l.name)
          } else {
            this.layers.splice(index, 1)
          }
        }
      }))
      return [
        {
          text: this.$gettext('All visible layers'),
          checked: !this.layers?.length,
          action: () => {
            this.layers.splice(0, this.layers.length)
          }
        },
        { separator: true, text: 'Layers' },
        ...layers
      ]
    },
    snappingLayers () {
      if (!this.layers?.length) {
        return this.snappingLayersList.filter(l => l.visible).map(l => l.name)
      }
      return this.layers
    },
    snapGeomStyle () {
      return simpleStyle({
        stroke: '#2e6c9e',
        strokeWidth: 2
      })
    },
    tr () {
      return {
        OverLimitMsg: this.$gettext('You have reached the geometry snapping limit. Please zoom in to a smaller map area.'),
        FetchError: this.$gettext('Unable to retrieve snapping geometry.')
      }
    }
  },
  methods: {
    showWarning (msg) {
      return this.$refs.notification.showError(msg, { color: 'orange' })
    },
    showError (msg) {
      return this.$refs.notification.showError(msg)
    }
  }
}
</script>
