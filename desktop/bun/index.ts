import { BrowserWindow, defineElectrobunRPC, Utils } from 'electrobun/bun'

type LektoRPCType = {
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

const rpc = defineElectrobunRPC<LektoRPCType>('bun', {
  handlers: {
    requests: {
      openFileDialog: async () => {
        const paths = await Utils.openFileDialog({
          allowedFileTypes: 'epub,pdf,docx,fb2,md,txt',
          canChooseFiles: true,
          canChooseDirectory: false,
          allowsMultipleSelection: true,
        })
        const filtered = paths.filter((p) => p.length > 0)
        return { paths: filtered }
      },
      readFile: async (params) => {
        const buffer = await Bun.file(params.path).arrayBuffer()
        const data = Buffer.from(buffer).toString('base64')
        return { data }
      },
    },
  },
})

new BrowserWindow({
  title: 'Lekto',
  url: 'views://main/index.html',
  frame: { width: 1200, height: 800, x: 0, y: 0 },
  preload: "window.__LEKTO_PLATFORM__ = 'electrobun'",
  rpc,
})
