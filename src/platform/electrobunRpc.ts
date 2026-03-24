import { createRPC, Electroview } from 'electrobun/view'
import type { LektoRPCType } from './rpcTypes'

type LektoRPC = ReturnType<typeof createRPC<
  { requests: Record<never, never>; messages: Record<never, never> },
  { requests: LektoRPCType['bun']['requests']; messages: Record<never, never> }
>>

let _electroview: Electroview<LektoRPC> | null = null

// Lazily initialised — only constructed when running inside Electrobun,
// so the WebSocket attempt never fires in a regular browser dev session.
function getElectroview(): Electroview<LektoRPC> {
  if (!_electroview) {
    const rpc = createRPC<
      { requests: Record<never, never>; messages: Record<never, never> },
      { requests: LektoRPCType['bun']['requests']; messages: Record<never, never> }
    >({
      requestHandler: {},
      transport: { registerHandler: () => {} },
    })
    _electroview = new Electroview({ rpc })
  }
  return _electroview
}

export async function rpcOpenFileDialog(): Promise<{ paths: string[] }> {
  return getElectroview().rpc!.request.openFileDialog()
}

export async function rpcReadFile(path: string): Promise<{ data: string }> {
  return getElectroview().rpc!.request.readFile({ path })
}
