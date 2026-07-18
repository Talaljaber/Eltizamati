/**
 * `react-dom` ships no bundled types and this project doesn't carry
 * @types/react-dom (it's a React Native app; react-dom is only pulled in
 * transitively for the web target). Sheet.web.tsx needs exactly
 * `createPortal` — declared narrowly rather than adding a devDependency
 * for one function.
 */
declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react'

  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment,
  ): ReactPortal
}
