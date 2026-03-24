export type LektoRPCType = {
  bun: {
    requests: {
      openFileDialog: { params: void; response: { paths: string[] } }
      readFile: { params: { path: string }; response: { data: string } }
    }
    messages: Record<never, never>
  }
  webview: {
    requests: Record<never, never>
    messages: Record<never, never>
  }
}
