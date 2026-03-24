import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const colors = {
  surfaceTop: '#172445',
  surfaceBottom: '#10172B',
  border: '#FFFFFF26',
  glowPrimary: '#8852FF',
  glowSecondary: '#3FD2FF',
  mark: '#F3ECFF',
  accent: '#4CD2FF',
  accentShadow: '#0D1324',
}

const markPath = 'M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94Z'

const webPngIcons = [
  ['public/favicon-32x32.png', 32],
  ['public/favicon-16x16.png', 16],
  ['public/apple-touch-icon.png', 180],
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
]

const androidLauncherIcons = [
  ['android/app/src/main/res/mipmap-mdpi/ic_launcher.png', 48],
  ['android/app/src/main/res/mipmap-hdpi/ic_launcher.png', 72],
  ['android/app/src/main/res/mipmap-xhdpi/ic_launcher.png', 96],
  ['android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png', 144],
  ['android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', 192],
  ['android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png', 48],
  ['android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png', 72],
  ['android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png', 96],
  ['android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png', 144],
  ['android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png', 192],
]

const androidForegroundIcons = [
  ['android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png', 108],
  ['android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png', 162],
  ['android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png', 216],
  ['android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png', 324],
  ['android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png', 432],
]

const desktopIconsetIcons = [
  ['desktop/icon.iconset/icon_16x16.png', 16],
  ['desktop/icon.iconset/icon_16x16@2x.png', 32],
  ['desktop/icon.iconset/icon_32x32.png', 32],
  ['desktop/icon.iconset/icon_32x32@2x.png', 64],
  ['desktop/icon.iconset/icon_128x128.png', 128],
  ['desktop/icon.iconset/icon_128x128@2x.png', 256],
  ['desktop/icon.iconset/icon_256x256.png', 256],
  ['desktop/icon.iconset/icon_256x256@2x.png', 512],
  ['desktop/icon.iconset/icon_512x512.png', 512],
  ['desktop/icon.iconset/icon_512x512@2x.png', 1024],
]

const singlePngOutputs = [
  ['desktop/icon.png', 512],
  ['ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024],
]

function iconSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">
      <defs>
        <linearGradient id="surface" x1="176" y1="112" x2="860" y2="968" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.surfaceTop}" />
          <stop offset="1" stop-color="${colors.surfaceBottom}" />
        </linearGradient>
        <radialGradient id="glowA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(264 216) rotate(53.3) scale(424 478)">
          <stop stop-color="${colors.glowPrimary}" stop-opacity="0.82" />
          <stop offset="1" stop-color="${colors.glowPrimary}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(792 766) rotate(128.5) scale(284 324)">
          <stop stop-color="${colors.glowSecondary}" stop-opacity="0.95" />
          <stop offset="1" stop-color="${colors.glowSecondary}" stop-opacity="0" />
        </radialGradient>
        <filter id="shadow" x="132" y="112" width="736" height="744" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="28" stdDeviation="32" flood-color="#040814" flood-opacity="0.42" />
        </filter>
      </defs>
      <rect x="44" y="44" width="936" height="936" rx="236" fill="url(#surface)" />
      <rect x="44" y="44" width="936" height="936" rx="236" stroke="${colors.border}" stroke-width="8" />
      <circle cx="264" cy="216" r="332" fill="url(#glowA)" />
      <circle cx="792" cy="766" r="248" fill="url(#glowB)" />
      <g filter="url(#shadow)">
        <path d="${markPath}" fill="${colors.mark}" transform="translate(214 150) scale(12.45)" />
      </g>
      <circle cx="748" cy="726" r="88" fill="${colors.accent}" />
      <circle cx="748" cy="726" r="32" fill="${colors.accentShadow}" fill-opacity="0.22" />
    </svg>
  `.trim()
}

function foregroundSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">
      <defs>
        <filter id="shadow" x="164" y="140" width="696" height="708" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#040814" flood-opacity="0.36" />
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <path d="${markPath}" fill="${colors.mark}" transform="translate(236 164) scale(11.55)" />
      </g>
      <circle cx="704" cy="692" r="74" fill="${colors.accent}" />
    </svg>
  `.trim()
}

async function writeSvg(relativePath, contents) {
  const filePath = resolve(projectRoot, relativePath)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${contents}\n`, 'utf8')
}

async function writePng(relativePath, size, svgContents) {
  const filePath = resolve(projectRoot, relativePath)
  await mkdir(dirname(filePath), { recursive: true })
  await sharp(Buffer.from(svgContents))
    .resize(size, size)
    .png()
    .toFile(filePath)
}

async function main() {
  const fullIcon = iconSvg()
  const foregroundIcon = foregroundSvg()

  await writeSvg('public/favicon.svg', fullIcon)

  await Promise.all([
    ...webPngIcons.map(([relativePath, size]) => writePng(relativePath, size, fullIcon)),
    ...androidLauncherIcons.map(([relativePath, size]) => writePng(relativePath, size, fullIcon)),
    ...androidForegroundIcons.map(([relativePath, size]) => writePng(relativePath, size, foregroundIcon)),
    ...desktopIconsetIcons.map(([relativePath, size]) => writePng(relativePath, size, fullIcon)),
    ...singlePngOutputs.map(([relativePath, size]) => writePng(relativePath, size, fullIcon)),
  ])
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})