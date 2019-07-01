import Vue from 'vue'

export function reactive (...params) {
  return (target, name, descriptor) => {
    descriptor.configurable = false
    params.forEach(param => Vue.util.defineReactive(target[name], param))
    return descriptor
  }
}
