import type * as Components from '@/ui'
import type { KebabKeys } from 'string-ts'

declare module 'vue' {
  export interface GlobalComponents extends KebabKeys<typeof Components> {}
}
