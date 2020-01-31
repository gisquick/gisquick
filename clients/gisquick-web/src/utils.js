import Vue from 'vue'

/**
 * Helper register function for global keydown listener
 * @param {Function} callback
 * @return {Function} unbind function
 */
export function keyListener (callback) {
  const listener = evt => {
    if (evt.target === document.body) {
      callback(evt)
    }
  }
  document.addEventListener('keydown', listener)
  const unbind = () => document.removeEventListener('keydown', listener)
  return unbind
}

/**
 * Creates shallow array container for complex objects, without automatic reactivity on stored items
 * @param {Array} initial items
 * @return {Array<Object>}
 */
export function ShallowArray (items = []) {
  const array = Vue.observable([])
  array.__ob__.observeArray = () => {}
  array.push(...items)
  return array
}

/**
 * Creates shallow reactive objects container from passed object. Assigned values will be not
 * automatically turned to reactive objects, only initial properties (references) will be reactive.
 * @param {Object} initial object
 * @return {Object}
 */
export function ShallowObj (obj) {
  const refs = {}
  Vue.observable(refs)
  Object.keys(obj).forEach(key => {
    Vue.util.defineReactive(refs, key, obj[key], null, true)
  })
  return refs
}

/**
 * Helper object to avoid infinitive update loop
 */
export function updateLock () {
  let updateOperation = false
  return {
    updateHandler (handler) {
      return (newVal, oldVal) => {
        updateOperation = true
        handler(newVal, oldVal)
        updateOperation = false
      }
    },
    eventHandler (handler) {
      return e => {
        if (!updateOperation) {
          handler(e)
        }
      }
    }
  }
}

/**
 * Creates object for updating external state with ability to
 * specify minimal duration period for holding this state.
 * @param {Function} update function
 * @return {Object} updater object
 */
export function queuedUpdater (updateFn) {
  let lastUpdate = performance.now()
  let currentMinDuration = 0
  const queue = []
  let updateLoop = null

  function checkQueue () {
    if (updateLoop !== null || queue.length === 0) {
      return
    }
    const { value, minDuration, cb } = queue.splice(0, 1)[0]
    const elapsed = performance.now() - lastUpdate
    if (elapsed > currentMinDuration) {
      updateFn(value)
      cb && cb()
      lastUpdate = performance.now()
      currentMinDuration = minDuration
      checkQueue()
    } else {
      updateLoop = setTimeout(() => {
        updateFn(value)
        cb && cb()
        lastUpdate = performance.now()
        currentMinDuration = minDuration
        updateLoop = null
        checkQueue()
      }, currentMinDuration - elapsed)
    }
  }
  return {
    set (value, minDuration = 600) {
      return new Promise(resolve => {
        queue.push({ value, minDuration, cb: resolve })
        checkQueue()
      })
    }
  }
}
