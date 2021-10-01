function createBackHandler () {
  let backNavigationTimestamp = 0
  const handlers = []
  const popstate = () => {
    if (performance.now() - backNavigationTimestamp < 50) {
      return
    }
    const handler = handlers[handlers.length - 1]
    if (handler) {
      backNavigationTimestamp = performance.now()
      history.go(1)
      handler()
    }
  }
  window.addEventListener('popstate', popstate, true)
  return {
    init () {
      console.log('init')
      history.backhandler = this
      console.log('history.pushState')
      history.pushState({ ...history.state, gisquick: true }, document.title, location.href)
    },
    addHandler (handler) {
      handlers.push(handler)
    },
    removeHandler (handler) {
      const index = handlers.indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    },
    routerNext (next) {
      if (performance.now() - backNavigationTimestamp < 50) {
        next(false)
      } else {
        next()
      }
    }
  }
}

const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)
const backHandler = mobile ? createBackHandler() : null
if (mobile) {
  history.backhandler = backHandler
  history.pushState({ ...history.state, gisquick: true }, document.title, location.href)
}

// export default ({ app }) => {
//   if (mobile) {
//     history.backhandler = backHandler

//     let initialized = false
//     app.router.beforeEach((to, from, next) => {
//       if (!initialized) {
//         if (!history.state?.transparex) {
//           history.pushState({ ...history.state, transparex: true }, document.title, location.href)
//         }
//         initialized = true
//       }
//       if (history.backhandler) {
//         history.backhandler.routerNext(next)
//       } else {
//         next()
//       }
//     })
//     app.router.afterEach(() => {
//       setTimeout(() => {
//         history.replaceState({ ...history.state, transparex: true }, document.title, location.href)
//       })
//     })
//   }
// }
