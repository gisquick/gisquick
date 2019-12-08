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
