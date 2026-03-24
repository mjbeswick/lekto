// TODO: replace with actual Electrobun webview RPC API once confirmed
// The documented API is: import { Electroview } from 'electrobun/view' and then
// electroview.rpc.request.functionName(args) — but this requires the Electroview
// instance to be initialised with matching RPC definitions on both sides.
// Until electrobun is added as a dependency and the app-level Electroview instance
// is wired up, we fall back to the window.__electrobun__ global shape below.
declare global {
  interface Window {
    __electrobun__: {
      rpc: {
        request: {
          openFileDialog: () => Promise<{ paths: string[] }>
          readFile: (args: { path: string }) => Promise<{ data: string }>
        }
      }
    }
  }
}

export async function rpcOpenFileDialog(): Promise<{ paths: string[] }> {
  return window.__electrobun__.rpc.request.openFileDialog()
}

export async function rpcReadFile(path: string): Promise<{ data: string }> {
  return window.__electrobun__.rpc.request.readFile({ path })
}
