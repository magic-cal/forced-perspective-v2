import { createXRStore, DefaultXRController } from '@react-three/xr'

export const xrStore = createXRStore({
  controller: DefaultXRController,
  emulate: false,
})
