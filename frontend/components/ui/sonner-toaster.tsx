"use client"

import { Toaster } from "sonner"

export function SonnerToaster() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
    />
  )
}
