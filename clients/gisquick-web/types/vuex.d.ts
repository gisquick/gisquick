import { GlobalState } from '@/store/typed'

declare module 'vuex' {
  interface Mapper<R> {
    <Key extends keyof R>(map: Key[]): { [K in Key]: () => R[K] }
  }

  declare const mapState: Mapper<GlobalState>
  declare const mapGetters: Mapper<GlobalState>
}

export {}
