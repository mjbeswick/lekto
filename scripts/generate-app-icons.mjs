import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const colors = {
  surfaceTop: '#2B1F16',
  surfaceBottom: '#15100C',
  border: '#FFF7ED1F',
  glowPrimary: '#FB923C',
  glowSecondary: '#FACC15',
  pageTop: '#FFF9F0',
  pageBottom: '#E8D0AA',
  pageEdge: '#CDA875',
  pageStroke: '#FFF8EE66',
  seamLight: '#FFF2D9',
  seamDark: '#5B3D22',
  bookmarkTop: '#FB923C',
  bookmarkBottom: '#EA580C',
}

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
        <linearGradient id="surface" x1="164" y1="108" x2="844" y2="962" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.surfaceTop}" />
          <stop offset="1" stop-color="${colors.surfaceBottom}" />
        </linearGradient>
        <radialGradient id="glowA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(310 236) rotate(40) scale(468 422)">
          <stop stop-color="${colors.glowPrimary}" stop-opacity="0.76" />
          <stop offset="1" stop-color="${colors.glowPrimary}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="glowB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(760 790) rotate(125) scale(304 286)">
          <stop stop-color="${colors.glowSecondary}" stop-opacity="0.34" />
          <stop offset="1" stop-color="${colors.glowSecondary}" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="bookGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(512 528) scale(384 320)">
          <stop stop-color="#FFEDD8" stop-opacity="0.5" />
          <stop offset="0.65" stop-color="${colors.glowPrimary}" stop-opacity="0.1" />
          <stop offset="1" stop-color="${colors.glowPrimary}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="leftPage" x1="512" y1="0" x2="168" y2="0" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.pageEdge}" />
          <stop offset="0.22" stop-color="${colors.pageBottom}" />
          <stop offset="1" stop-color="${colors.pageTop}" />
        </linearGradient>
        <linearGradient id="rightPage" x1="512" y1="0" x2="856" y2="0" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.pageEdge}" />
          <stop offset="0.22" stop-color="${colors.pageBottom}" />
          <stop offset="1" stop-color="${colors.pageTop}" />
        </linearGradient>
        <linearGradient id="bookmark" x1="512" y1="176" x2="512" y2="476" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.bookmarkTop}" />
          <stop offset="1" stop-color="${colors.bookmarkBottom}" />
        </linearGradient>
        <clipPath id="iconClip">
          <rect x="44" y="44" width="936" height="936" rx="236" />
        </clipPath>
        <filter id="bookShadow" filterUnits="userSpaceOnUse" x="72" y="100" width="880" height="940">
          <feDropShadow dx="0" dy="28" stdDeviation="32" flood-color="#000000" flood-opacity="0.32" />
        </filter>
      </defs>
      <rect x="44" y="44" width="936" height="936" rx="236" fill="url(#surface)" />
      <g clip-path="url(#iconClip)">
        <circle cx="310" cy="236" r="334" fill="url(#glowA)" />
        <circle cx="760" cy="790" r="248" fill="url(#glowB)" />
        <ellipse cx="512" cy="528" rx="384" ry="320" fill="url(#bookGlow)" />
        <ellipse cx="512" cy="868" rx="288" ry="52" fill="#000000" fill-opacity="0.22" />
        <g filter="url(#bookShadow)">
          <path d="M512 176 C430 156 304 148 172 188 L168 852 C304 888 428 880 512 880 Z" fill="url(#leftPage)" />
          <path d="M512 176 C430 156 304 148 172 188 L168 852 C304 888 428 880 512 880 Z" stroke="${colors.pageStroke}" stroke-width="10" />
          <path d="M512 176 C594 156 720 148 852 188 L856 852 C720 888 596 880 512 880 Z" fill="url(#rightPage)" />
          <path d="M512 176 C594 156 720 148 852 188 L856 852 C720 888 596 880 512 880 Z" stroke="${colors.pageStroke}" stroke-width="10" />
          <path d="M509 176 L508 880" stroke="${colors.seamLight}" stroke-opacity="0.72" stroke-width="6" />
          <path d="M515 176 L516 880" stroke="${colors.seamDark}" stroke-opacity="0.22" stroke-width="10" />
          <path d="M478 176H546C559.255 176 570 186.745 570 200V476L512 440L454 476V200C454 186.745 464.745 176 478 176Z" fill="url(#bookmark)" />
          <path d="M512 440L570 476V200C570 186.745 559.255 176 546 176H512V440Z" fill="#000000" fill-opacity="0.08" />
          <path d="M238 440 C280 430 360 428 460 438" stroke="${colors.pageEdge}" stroke-opacity="0.26" stroke-width="16" stroke-linecap="round" />
          <path d="M238 516 C280 508 360 506 460 514" stroke="${colors.pageEdge}" stroke-opacity="0.18" stroke-width="14" stroke-linecap="round" />
          <path d="M238 592 C280 585 356 583 454 590" stroke="${colors.pageEdge}" stroke-opacity="0.12" stroke-width="12" stroke-linecap="round" />
          <path d="M564 440 C664 430 744 428 786 438" stroke="${colors.pageEdge}" stroke-opacity="0.26" stroke-width="16" stroke-linecap="round" />
          <path d="M564 516 C664 508 744 506 786 514" stroke="${colors.pageEdge}" stroke-opacity="0.18" stroke-width="14" stroke-linecap="round" />
          <path d="M564 592 C662 585 740 583 782 590" stroke="${colors.pageEdge}" stroke-opacity="0.12" stroke-width="12" stroke-linecap="round" />
        </g>
      </g>
      <rect x="44" y="44" width="936" height="936" rx="236" stroke="${colors.border}" stroke-width="8" fill="none" />
    </svg>
  `.trim()
}

function foregroundSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">
      <defs>
        <linearGradient id="leftPage" x1="512" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.pageEdge}" />
          <stop offset="0.22" stop-color="${colors.pageBottom}" />
          <stop offset="1" stop-color="${colors.pageTop}" />
        </linearGradient>
        <linearGradient id="rightPage" x1="512" y1="0" x2="824" y2="0" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.pageEdge}" />
          <stop offset="0.22" stop-color="${colors.pageBottom}" />
          <stop offset="1" stop-color="${colors.pageTop}" />
        </linearGradient>
        <linearGradient id="bookmark" x1="512" y1="184" x2="512" y2="484" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.bookmarkTop}" />
          <stop offset="1" stop-color="${colors.bookmarkBottom}" />
        </linearGradient>
        <filter id="bookShadow" filterUnits="userSpaceOnUse" x="100" y="120" width="824" height="900">
          <feDropShadow dx="0" dy="24" stdDeviation="26" flood-color="#000000" flood-opacity="0.22" />
        </filter>
      </defs>
      <g filter="url(#bookShadow)">
        <path d="M512 184 C440 166 316 158 200 196 L196 852 C316 888 440 880 512 884 Z" fill="url(#leftPage)" />
        <path d="M512 184 C440 166 316 158 200 196 L196 852 C316 888 440 880 512 884 Z" stroke="${colors.pageStroke}" stroke-width="10" />
        <path d="M512 184 C584 166 708 158 824 196 L828 852 C708 888 584 880 512 884 Z" fill="url(#rightPage)" />
        <path d="M512 184 C584 166 708 158 824 196 L828 852 C708 888 584 880 512 884 Z" stroke="${colors.pageStroke}" stroke-width="10" />
        <path d="M509 184 L508 884" stroke="${colors.seamLight}" stroke-opacity="0.72" stroke-width="6" />
        <path d="M515 184 L516 884" stroke="${colors.seamDark}" stroke-opacity="0.22" stroke-width="10" />
        <path d="M478 184H546C559.255 184 570 194.745 570 208V484L512 448L454 484V208C454 194.745 464.745 184 478 184Z" fill="url(#bookmark)" />
        <path d="M512 448L570 484V208C570 194.745 559.255 184 546 184H512V448Z" fill="#000000" fill-opacity="0.08" />
      </g>
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