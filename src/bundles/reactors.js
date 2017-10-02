import { IS_BROWSER, flattenExtractedToArray, debounce } from '../utils'
import { getActionArgs } from '../middleware/custom-thunk'
const raf = IS_BROWSER && self.requestAnimationFrame || ((func) => { setTimeout(func, 0) })
const ric = IS_BROWSER && self.requestIdleCallback || ((func) => { setTimeout(func, 0) })

const defaults = {
  idleTimeout: 30000,
  idleAction: 'APP_IDLE',
  doneCallback: null
}

export const getIdleDispatcher = (timeout, fn) => debounce(() => {
  raf(fn)
}, timeout)

export default (opts) => ({
  name: 'reactors',
  extract: 'reactors',
  init: (store, extracted) => {
    opts || (opts = {})
    Object.assign(opts, defaults)
    const { idleAction, idleTimeout } = opts
    let idleDispatcher
    if (idleTimeout) {
      idleDispatcher = getIdleDispatcher(idleTimeout, () => store.dispatch({type: idleAction}))
    }

    const reactorNames = flattenExtractedToArray(extracted)

    store.reactors = reactorNames

    if (process.env.NODE_ENV !== 'production') {
      reactorNames.forEach(name => {
        if (!store[name]) {
          throw Error(`Reactor '${name}' not found on the store. Make sure you're defining as selector by that name.`)
        }
      })
    }

    const cancelIfDone = () => {
      if (!IS_BROWSER && !store.nextReaction && (!store.selectAsyncActive || !store.selectAsyncActive())) {
        idleDispatcher && idleDispatcher.cancel()
        opts.doneCallback && opts.doneCallback()
      }
    }

    const hasReactions = () => store.reactors.some(name => store[name]())
    const getActiveReactions = () => store.reactors.map(name => store[name]()).filter(Boolean)

    const dispatchNext = () => {
      if (hasReactions()) {
        ric(() => {
          const reactions = getActiveReactions()
          // if another action snuck in here due to requestIdleCallback delay
          // re-run the active selector test
          if (reactions.length) {
            const cleaned = reactions.map(action => {
              if (typeof action === 'function') {
                return action(getActionArgs(store))
              }
              const { actionCreator } = action
              if (!actionCreator) return action
              const { args } = action
              if (args) {
                return store.unboundActionCreators[actionCreator](...args)
              }
              return store.unboundActionCreators[actionCreator]()
            })
            store.dispatch(...cleaned)
          }
        })
      }
    }

    const callback = () => {
      dispatchNext()
      if (idleDispatcher) {
        idleDispatcher()
        cancelIfDone()
      }
    }

    store.subscribe(callback)
    callback()
  }
})
