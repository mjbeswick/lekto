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
        <linearGradient id="pageFill" x1="512" y1="210" x2="512" y2="760" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.pageTop}" />
          <stop offset="1" stop-color="${colors.pageBottom}" />
        </linearGradient>
        <linearGradient id="bookmark" x1="512" y1="218" x2="512" y2="472" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.bookmarkTop}" />
          <stop offset="1" stop-color="${colors.bookmarkBottom}" />
        </linearGradient>
        <filter id="bookShadow" x="156" y="184" width="712" height="668" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="28" stdDeviation="32" flood-color="#000000" flood-opacity="0.28" />
        </filter>
      </defs>
      <rect x="44" y="44" width="936" height="936" rx="236" fill="url(#surface)" />
      <rect x="44" y="44" width="936" height="936" rx="236" stroke="${colors.border}" stroke-width="8" />
      <circle cx="310" cy="236" r="334" fill="url(#glowA)" />
      <circle cx="760" cy="790" r="248" fill="url(#glowB)" />
      <ellipse cx="512" cy="818" rx="280" ry="72" fill="#000000" fill-opacity="0.2" />
      <g filter="url(#bookShadow)">
        <path d="M222 292C222 250 252 218 294 216C378 213 444 230 494 270V758C441 726 379 711 301 714C255 716 222 685 222 642V292Z" fill="url(#pageFill)" />
        <path d="M802 292C802 250 772 218 730 216C646 213 580 230 530 270V758C583 726 645 711 723 714C769 716 802 685 802 642V292Z" fill="url(#pageFill)" />
        <path d="M222 292C222 250 252 218 294 216C378 213 444 230 494 270V758C441 726 379 711 301 714C255 716 222 685 222 642V292Z" stroke="${colors.pageStroke}" stroke-width="10" />
        <path d="M802 292C802 250 772 218 730 216C646 213 580 230 530 270V758C583 726 645 711 723 714C769 716 802 685 802 642V292Z" stroke="${colors.pageStroke}" stroke-width="10" />
        <path d="M484 270C494 262 503 257 512 254V744C502 742 493 746 484 752V270Z" fill="${colors.seamLight}" fill-opacity="0.72" />
        <path d="M540 270C530 262 521 257 512 254V744C522 742 531 746 540 752V270Z" fill="${colors.seamDark}" fill-opacity="0.22" />
        <path d="M470 218H554C571.673 218 586 232.327 586 250V472L512 426L438 472V250C438 232.327 452.327 218 470 218Z" fill="url(#bookmark)" />
        <path d="M512 426L586 472V250C586 232.327 571.673 218 554 218H512V426Z" fill="#000000" fill-opacity="0.08" />
        <path d="M306 410C354 401 407 404 456 420" stroke="${colors.pageEdge}" stroke-opacity="0.28" stroke-width="16" stroke-linecap="round" />
        <path d="M306 478C358 470 410 474 456 488" stroke="${colors.pageEdge}" stroke-opacity="0.18" stroke-width="16" stroke-linecap="round" />
        <path d="M570 410C618 401 671 404 720 420" stroke="${colors.pageEdge}" stroke-opacity="0.28" stroke-width="16" stroke-linecap="round" />
        <path d="M570 478C622 470 674 474 720 488" stroke="${colors.pageEdge}" stroke-opacity="0.18" stroke-width="16" stroke-linecap="round" />
      </g>
    </svg>
  `.trim()
}

function foregroundSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">
      <defs>
        <linearGradient id="pageFill" x1="512" y1="212" x2="512" y2="772" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.pageTop}" />
          <stop offset="1" stop-color="${colors.pageBottom}" />
        </linearGradient>
        <linearGradient id="bookmark" x1="512" y1="226" x2="512" y2="500" gradientUnits="userSpaceOnUse">
          <stop stop-color="${colors.bookmarkTop}" />
          <stop offset="1" stop-color="${colors.bookmarkBottom}" />
        </linearGradient>
        <filter id="bookShadow" x="184" y="188" width="656" height="678" color-interpolation-filters="sRGB">
          <feDropShadow dx="0" dy="24" stdDeviation="26" flood-color="#000000" flood-opacity="0.22" />
        </filter>
      </defs>
      <g filter="url(#bookShadow)">
        <path d="M246 314C246 268 280 232 326 230C404 227 462 244 506 280V778C458 748 403 734 334 738C284 740 246 705 246 658V314Z" fill="url(#pageFill)" />
        <path d="M778 314C778 268 744 232 698 230C620 227 562 244 518 280V778C566 748 621 734 690 738C740 740 778 705 778 658V314Z" fill="url(#pageFill)" />
        <path d="M246 314C246 268 280 232 326 230C404 227 462 244 506 280V778C458 748 403 734 334 738C284 740 246 705 246 658V314Z" stroke="${colors.pageStroke}" stroke-width="10" />
        <path d="M778 314C778 268 744 232 698 230C620 227 562 244 518 280V778C566 748 621 734 690 738C740 740 778 705 778 658V314Z" stroke="${colors.pageStroke}" stroke-width="10" />
        <path d="M486 280C495 273 504 268 512 266V764C503 762 495 766 486 772V280Z" fill="${colors.seamLight}" fill-opacity="0.72" />
        <path d="M538 280C529 273 520 268 512 266V764C521 762 529 766 538 772V280Z" fill="${colors.seamDark}" fill-opacity="0.22" />
        <path d="M474 232H550C567.673 232 582 246.327 582 264V500L512 456L442 500V264C442 246.327 456.327 232 474 232Z" fill="url(#bookmark)" />
        <path d="M512 456L582 500V264C582 246.327 567.673 232 550 232H512V456Z" fill="#000000" fill-opacity="0.08" />
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