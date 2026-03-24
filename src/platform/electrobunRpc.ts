import { createRPC, Electroview } from 'electrobun/view'
import type { LektoRPCType } from './rpcTypes'

// Webview side: local handles nothing, remote is the bun process
const rpc = createRPC<
  { requests: Record<never, never>; messages: Record<never, never> },
  { requests: LektoRPCType['bun']['requests']; messages: Record<never, never> }
>({
  requestHandler: {},
  transport: { registerHandler: () => {} },
})

const electroview = new Electroview({ rpc })

export async function rpcOpenFileDialog(): Promise<{ paths: string[] }> {
  return electroview.rpc!.request.openFileDialog()
}

export async function rpcReadFile(path: string): Promise<{ data: string }> {
  return electroview.rpc!.request.readFile({ path })
}
