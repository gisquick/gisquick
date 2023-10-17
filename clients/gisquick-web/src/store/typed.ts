import type { Store } from 'vuex'

import untypedStore from './index'
import type { App, AttributeTable, Location, Project, User } from './interfaces'

export const baseUseStore = () => untypedStore

export interface GlobalState {
  app: App
  user: User
  project: Project
  activeTool: string
  showLogin: boolean
  baseLayerName: string
  location: Location
  attributeTable: AttributeTable
}

export type State = GlobalState

export const store = untypedStore as unknown as Store<GlobalState>

export function useStore() {
  return store
}
