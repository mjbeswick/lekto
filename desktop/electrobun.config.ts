export default {
  app: {
    name: 'Lekto',
    identifier: 'dev.lekto.app',
    version: '0.0.1',
  },
  build: {
    mac: {
      createDmg: false,
      icons: 'desktop/icon.iconset',
    },
    linux: {
      icon: 'desktop/icon.png',
    },
    win: {
      icon: 'desktop/icon.png',
    },
    bun: {
      entrypoint: 'desktop/bun/index.ts',
    },
  },
}
