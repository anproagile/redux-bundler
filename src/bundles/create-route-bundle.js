import { createSelector } from 'create-selector'
import createRouteMatcher from 'feather-route-matcher'

const defaults = {
  routeInfoSelector: 'selectPathname'
}

export default (routes, spec) => {
  const opts = Object.assign({}, defaults, spec)
  const { routeInfoSelector } = opts
  const routeMatcher = createRouteMatcher(routes)
  return {
    name: 'routes',
    selectRoutes: () => routes,
    selectRouteMatcher: () => routeMatcher,
    selectRouteInfo: createSelector(routeInfoSelector, routeMatcher),
    selectRouteParams: createSelector(
      'selectRouteInfo',
      match => (match && match.params) || {}
    ),
    selectRoute: createSelector(
      'selectRouteInfo',
      match => (match && match.value) || null
    )
  }
}
