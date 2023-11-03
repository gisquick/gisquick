<template>
  <div style="display:none;">
    <portal :to="portal">
      <template v-if="open">
        <div
          v-if="backdrop"
          class="popup-backdrop"
          :class="backdropClass"
          v-backdrop-scroll
        >
          <div/>
        </div>
        <document-listener
          v-if="interactive"
          stacked
          :key="_uid"
          :src="origin"
          @click="onDocumentClick"
          @keydown="$emit('keydown', $event)"
        />
        <back-button-listener
          v-if="backHandlerEnabled"
          @back="$emit('update:open', false)"
        />
        <document-listener src="popup-resize" @resize="onResize"/>
      </template>
      <!-- <transition
        v-if="persistent ? open || initialized : open || visible"
        :appear="persistent ? !initialized : true"
        :name="transitionName"
        v-on="transitionHooks"
        @enter="enter"
        @after-leave="leave"
      >
        <div
          v-show="open"
          ref="popupEl"
          class="popup-container"
          :class="popupClasses"
          :style="[popupStyle, contentStyle]"
          :tabindex="tabindex"
          @click="onClick"
        >
          <slot/>
        </div>
      </transition> -->
      <!-- <transition
        :name="transitionName"
        v-on="transitionHooks"
        @enter="enter"
        @after-leave="leave"
      >
        <component ref="popupEl" :is="popupContent2"/>
      </transition> -->
      <component ref="popupEl" :is="popupContent">
        <slot/>
      </component>
    </portal>
  </div>
</template>

<script lang="jsx">
import { Wormhole } from 'portal-vue'
import omit from 'lodash/omit'
// import throttle from 'lodash/throttle'
import DocumentListener from './DocumentListener'
import BackButtonListener from './BackButtonListener'
import { popupFixedPosition, pxObj, elementBounds } from './utils/popup'

function transformBounds (bounds, anchorInit, anchorCurrent) {
  const offsetY = anchorCurrent.top - anchorInit.top
  const { top, left, bottom, right, width, height } = bounds
  return {
    top: top + offsetY,
    bottom: bottom + offsetY,
    left,
    right,
    width,
    height
  }
}

function anchorLeftAlignmentStyle (offset) {
  return {
    alignSelf: 'flex-start',
    marginLeft: `${Math.max(0, offset - 10)}px`
  }
}

function anchorRightAlignmentStyle (offset) {
  return {
    alignSelf: 'flex-end',
    marginRight: `${Math.max(0, offset - 10)}px`
  }
}

export default {
  components: {
    BackButtonListener,
    DocumentListener
  },
  directives: {
    backdropScroll: {
      inserted (el) {
        el.scrollTop = 1
        el.addEventListener('scroll', () => {
          el.scrollTop = 1
        })
      }
    }
  },
  props: {
    align: String,
    arrowStyle: Boolean,
    backdrop: Boolean,
    backdropClass: [String, Array, Object],
    backhandler: Boolean,
    bounds: Object,
    interactive: {
      type: Boolean,
      default: true
    },
    origin: String,
    open: {
      type: Boolean,
      default: undefined
    },
    popupClass: {
      type: [String, Array, Object],
      default: 'light'
    },
    popupStyle: [Object, String],
    portal: {
      type: String,
      default: 'popup'
    },
    tabindex: [Number, String],
    transition: {
      type: [String, Object],
      default: 'fade'
    },
    type: String,
    persistent: Boolean
  },
  data () {
    return {
      contentStyle: {},
      alignment: null,
      popupBounds: null,
      visible: false,
      initialized: false
    }
  },
  computed: {
    backHandlerEnabled () {
      return this.backhandler && !!history.backhandler
    },
    transitionName () {
      return typeof this.transition === 'string' ? this.transition : this.transition?.name//undefined
    },
    transitionHooks () {
      return typeof this.transition === 'object' ? omit(this.transition, 'name') : null //{}
    },
    popupClasses () {
      if (this.alignment) {
        const [h, v] = this.alignment.split('-')
        return [this.popupClass, 'align-' + h, 'align-' + v]
      }
      return this.popupClass
    },
    targetBounds () {
      let bounds = this.bounds
      if (this.arrowStyle && bounds.width < 36) {
        bounds = {...bounds}
        const gap = 36 - bounds.width
        bounds.left -= gap / 2
        bounds.right += gap / 2
        bounds.width += gap
      }
      return bounds
    },
    anchorStyle () {
      if (this.arrowStyle && this.alignment) {
        const [h] = this.alignment.split('-')
        if (h === 'c') {
          return {
            alignSelf: 'center'
          }
        } else if (h === 'sr') {
          const offset = this.targetBounds.width / 2 + window.innerWidth - this.targetBounds.right
          return anchorRightAlignmentStyle(offset)
        } else if (h === 'sl') {
          const offset = this.targetBounds.width / 2 + this.targetBounds.left
          return anchorLeftAlignmentStyle(offset)
        } else {
          const offset = Math.min(this.targetBounds.width / 2, 0.33 * this.popupBounds.width)
          if (h === 'rr') {
            return anchorRightAlignmentStyle(offset)
          } else if (h === 'll') {
            return anchorLeftAlignmentStyle(offset)
          }
        }
      }
      return null
    },
    popupContent () {
      const _this = this
      return {
        render (h) {
          const { open, persistent, tabindex, popupClasses, popupStyle, contentStyle } = _this
          const data = {
            staticClass: 'popup-container',
            class: popupClasses,
            style: [popupStyle, contentStyle],
            attrs: {
              tabindex
            },
            on: {
              click: _this.onClick
            }
          }
          const content = persistent
            ? <div vShow={open} {...data}>{this.$slots.default}</div>
            : open && <div {...data}>{this.$slots.default}</div>

          const listeners = {
            // enter: _this.enter,
            // enter: (el) => setTimeout(() =>_this.enter(el), 0),
            enter: (el) => {
              el.style.opacity = '0'
              setTimeout(_this.enter, 0, el)
            },
            afterLeave: _this.leave
          }
          if (_this.transitionHooks) {
            Object.keys(_this.transitionHooks).forEach(name => {
              if (listeners[name]) {
                listeners[name] = [listeners[name], _this.transitionHooks[name]]
              } else {
                listeners[name] = _this.transitionHooks[name] //.bind(_this)
              }
            })
          }
          return h('transition', { props: { name: _this.transitionName }, on: listeners }, [content])
          // return (
          //   <transition
          //     name={_this.transitionName}
          //     vOn={_this.transitionHooks}
          //     onEnter={_this.enter}
          //     onAfterLeave={_this.leave}
          //   >
          //     {content}
          //   </transition>
          // )
        }
      }
    },
    popupContent2 () {
      const _this = this
      return {
        render () {
          const { open, popupClasses, popupStyle, contentStyle } = _this
          const cls = ['popup-container', popupClasses]
          const content = this.$slots.default
          return open ? <div class={cls} style={[popupStyle, contentStyle]}>{content}</div> : null
        }
      }
    }
  },
  mounted () {
    const containers = []
    let el = this.$el.parentElement
    while (el) {
      if (el.classList.contains('scrollable')) {
        containers.push(el)
      }
      el = el.parentElement
    }
    // const onScroll = throttle(() => this._updatePosition(this.popupElement()), 20)
    const onScroll = () => this._updatePosition(this.popupElement())
    ;[window].concat(containers).forEach(el => {
      el.addEventListener('scroll', onScroll)
    })
    this.$once('hook:beforeDestroy', () => {
      [window].concat(containers).forEach(el => {
        el.removeEventListener('scroll', onScroll)
      })
    })
    this._containers = containers
  },
  methods: {
    popupElement () {
      // return this.$refs.popupEl
      return this.$refs.popupEl.$el
    },
    _updatePosition (el, recalculate = false) {
      if (!el || !this.bounds) {
        return
      }
      let bounds
      if (recalculate) {
        this.alignment = null
        bounds = this.targetBounds
      } else {
        bounds = transformBounds(this.targetBounds, this._openBounds, this.$el.getBoundingClientRect())
      }

      // const popupContainer = document.scrollingElement
      const containerBox = Wormhole.targets.popup[0].$el.getBoundingClientRect()
      const elBox = el.getBoundingClientRect()
      // console.log(el.innerHTML, elBox)
      // setTimeout(() => {
      //   console.log('later', el.innerHTML, el.getBoundingClientRect())
      // })

      // console.log(containerBox, bounds)
      // console.log(elBox, el)
      const { key, position, info } = popupFixedPosition(containerBox, bounds, elBox, this.align)
      if (!this.alignment || this.alignment !== key) {
        Object.assign(position, info)
        this.contentStyle = pxObj(position)
      } else {
        Object.assign(this.contentStyle, pxObj(position))
        // this.contentStyle = { ...this.contentStyle, ...pxObj(position)}
      }
      this.alignment = key
    },
    enter (el) {
      this._openBounds = this.$el.getBoundingClientRect()
      this._updatePosition(el)
      this.popupBounds = elementBounds(el)
      this.$ui.addPopup(this._uid, this.$el, el)
      this.$emit('opened', { target: el })
      this.visible = true
      this.initialized = true
      el.style.opacity = ''
    },
    leave () {
      this.contentStyle = {}
      this.alignment = null
      this.$ui.removePopup(this._uid)
      this.$emit('closed')
      this.visible = false
    },
    onDocumentClick (e) {
      if (e.clientX < 0 || e.clientY < 0 || e.clientY > window.innerHeight) {
        return // outside of page, ignore (mouse drag with release/mouseup outside)
      }
      // e.composedPath().includes(this.$el)
      const popupEl = this.popupElement()
      if (!popupEl || !popupEl.contains(e.target)) {
        this.$emit('click:out', e)
      } else {
        // this.$emit('click:in', e)
      }
    },
    onClick (e) {
      this.$emit('click:in', e)
    },
    onResize () {
      this.alignment = null
      this._updatePosition(this.popupElement())
    },
    updatePosition () {
      this._updatePosition(this.popupElement(), true)
    }
  }
}
</script>

<style lang="scss">
.popup-container {
  position: absolute;
  z-index: 2;
  outline: 0;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  overscroll-behavior: contain;

  .anchor {
    display: flex;
    align-self: flex-end;
    z-index: 1;
    overflow: hidden;
    padding: 3px 3px 0 3px;
    margin: -1px;
    flex: 0 0;
    svg {
      margin: -1px;
    }
  }
  &.align-tt {
    flex-direction: column-reverse;
    .anchor {
      transform: scale(1, -1);
    }
  }
}
.popup-backdrop {
  background-color: rgba(0, 0, 0, 0.6);
  position: fixed;
  top: 0;
  left: 0;
  right: -20px;
  bottom: 0;
  z-index: 1;
  overflow: auto;
  pointer-events: auto;
  overscroll-behavior: contain;
  > div {
    width: 5px;
    height: 110%;
  }
}
</style>
