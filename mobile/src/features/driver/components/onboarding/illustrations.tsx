/**
 * The three driver-onboarding illustrations, exported from Figma and rendered verbatim.
 *
 * Kept apart from `components/app/icons.tsx` because these are not icons: each is a 320x260
 * scene used once, on one slide, and bundling them with the shared glyph set would mean every
 * screen in the app pays to parse them.
 *
 * ROUTE 1 (slides 2 and 3) exported as a single flattened SVG. ROUTE 2 (slide 1) did not, because
 * its frame contains text nodes, so Figma emitted eight separate vectors; they are composed here
 * into one SVG by centring each on the box Figma reported for it. The "1" and "2" badges on that
 * slide are rendered as React Native <Text> in `onboarding-slide.tsx` rather than SVG <text>,
 * so the Poppins face resolves through expo-font instead of react-native-svg own font lookup.
 */

import { SvgXml } from "react-native-svg";

type IllustrationProps = { width?: number; height?: number };

/* Figma 196:6161 — two numbered pickups joined by a route to one drop */
const ONE_JOB_ONE_ROUTE = `<svg width="320" height="260" viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg">
<g transform="translate(35.02 87)"><path id="Vector" d="M4.97649 133C-5.02351 83.0001 24.9765 33.0001 48.9765 3.00011" stroke="#1E6B48" stroke-width="6" stroke-linecap="round"/></g>
<g transform="translate(97 46.41)"><path id="Vector" d="M3.00035 19.5886C43.0004 -6.41139 93.0004 -0.411386 127 27.5886" stroke="#1E6B48" stroke-width="6" stroke-linecap="round"/></g>
<g transform="translate(175.5 101.5)"><path id="Vector" d="M56.5004 2.50041C64.5004 48.5004 34.5004 84.5004 2.50044 102.5" stroke="#1E6B48" stroke-width="5" stroke-linecap="round" stroke-dasharray="11 10"/></g>
<g transform="translate(28 216)"><path id="Vector" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="white" stroke="#1E6B48" stroke-width="4"/></g>
<g transform="translate(74 58)"><path id="Vector" d="M18 36C27.9411 36 36 27.9411 36 18C36 8.05887 27.9411 0 18 0C8.05887 0 0 8.05887 0 18C0 27.9411 8.05887 36 18 36Z" fill="#1E6B48"/></g>
<g transform="translate(214 68)"><path id="Vector" d="M18 36C27.9411 36 36 27.9411 36 18C36 8.05887 27.9411 0 18 0C8.05887 0 0 8.05887 0 18C0 27.9411 8.05887 36 18 36Z" fill="#1E6B48"/></g>
<g transform="translate(152 196)"><path id="Vector" d="M28 0H12C5.37258 0 0 5.37258 0 12V28C0 34.6274 5.37258 40 12 40H28C34.6274 40 40 34.6274 40 28V12C40 5.37258 34.6274 0 28 0Z" fill="#0E3A26"/></g>
<g transform="translate(160.8 207.8)"><path id="Vector" d="M1.2 18.2V7.2L11.2 1.2L21.2 7.2V18.2H1.2Z" stroke="white" stroke-width="2.4" stroke-linejoin="round"/></g>
</svg>`;

/* Figma 196:6187 — a QR code scanned at the depot, money released */
const SCAN_AT_THE_DROP = `<svg width="320" height="260" viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="SVG">
<path id="Vector" d="M154 52H70C60.0589 52 52 60.0589 52 70V154C52 163.941 60.0589 172 70 172H154C163.941 172 172 163.941 172 154V70C172 60.0589 163.941 52 154 52Z" fill="white"/>
<g id="Group">
<path id="Vector_2" d="M94 72H76C73.7909 72 72 73.7909 72 76V94C72 96.2091 73.7909 98 76 98H94C96.2091 98 98 96.2091 98 94V76C98 73.7909 96.2091 72 94 72Z" stroke="#3D2149" stroke-width="3"/>
<path id="Vector_3" d="M148 72H130C127.791 72 126 73.7909 126 76V94C126 96.2091 127.791 98 130 98H148C150.209 98 152 96.2091 152 94V76C152 73.7909 150.209 72 148 72Z" stroke="#3D2149" stroke-width="3"/>
<path id="Vector_4" d="M94 126H76C73.7909 126 72 127.791 72 130V148C72 150.209 73.7909 152 76 152H94C96.2091 152 98 150.209 98 148V130C98 127.791 96.2091 126 94 126Z" stroke="#3D2149" stroke-width="3"/>
<path id="Vector_5" d="M146 126H152M126 146H138M146 142V152M126 126H138V138H126V126Z" stroke="#3D2149" stroke-width="3"/>
</g>
<path id="Vector_6" d="M60 44H46V58M164 44H178V58M60 180H46V166M164 180H178V166" stroke="#7A3F91" stroke-width="5" stroke-linecap="round"/>
<g id="Vector_7">
<path d="M196 112H244Z" fill="black"/>
<path d="M196 112H244" stroke="#7A3F91" stroke-width="5" stroke-linecap="round"/>
</g>
<path id="Vector_8" d="M236 100L250 112L236 124" stroke="#7A3F91" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<path id="Vector_9" d="M290 152H244C237.373 152 232 157.373 232 164V186C232 192.627 237.373 198 244 198H290C296.627 198 302 192.627 302 186V164C302 157.373 296.627 152 290 152Z" fill="#1E6B48"/>
<path id="Vector_10" d="M267 186C273.075 186 278 181.075 278 175C278 168.925 273.075 164 267 164C260.925 164 256 168.925 256 175C256 181.075 260.925 186 267 186Z" stroke="white" stroke-width="3"/>
<g id="Vector_11">
<path d="M246 175H246.01ZM288 175H288.01Z" fill="black"/>
<path d="M246 175H246.01M288 175H288.01" stroke="white" stroke-width="4" stroke-linecap="round"/>
</g>
</g>
</svg>`;

/* Figma 196:6215 — a phone holding the route offline, syncing when signal returns */
const WEAK_SIGNAL_IS_FINE = `<svg width="320" height="260" viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg">
<g id="SVG">
<path id="Vector" d="M200 34H120C106.745 34 96 44.7452 96 58V206C96 219.255 106.745 230 120 230H200C213.255 230 224 219.255 224 206V58C224 44.7452 213.255 34 200 34Z" fill="white"/>
<path id="Vector_2" d="M201 62H119C115.134 62 112 65.134 112 69C112 72.866 115.134 76 119 76H201C204.866 76 208 72.866 208 69C208 65.134 204.866 62 201 62Z" fill="#E7EAE8"/>
<path id="Vector_3" d="M198 90H122C116.477 90 112 94.4772 112 100V120C112 125.523 116.477 130 122 130H198C203.523 130 208 125.523 208 120V100C208 94.4772 203.523 90 198 90Z" fill="#E3EFE8"/>
<path id="Vector_4" d="M198 140H122C116.477 140 112 144.477 112 150V170C112 175.523 116.477 180 122 180H198C203.523 180 208 175.523 208 170V150C208 144.477 203.523 140 198 140Z" fill="#E7EAE8"/>
<path id="Vector_5" d="M160 213C164.971 213 169 208.971 169 204C169 199.029 164.971 195 160 195C155.029 195 151 199.029 151 204C151 208.971 155.029 213 160 213Z" fill="#E2E0DC"/>
<g id="Group">
<path id="Vector_6" d="M240 92C244.592 90.5038 248.488 87.3963 250.968 83.2514C253.447 79.1066 254.343 74.2045 253.49 69.4505C252.637 64.6966 250.092 60.412 246.326 57.3882C242.559 54.3644 237.826 52.8057 233 53C230.999 46.9411 227.284 41.5924 222.305 37.6015C217.327 33.6105 211.298 31.1485 204.949 30.5136C198.6 29.8787 192.202 31.0981 186.532 34.0241C180.862 36.9502 176.161 41.4574 173 47" stroke="#64706A" stroke-width="6" stroke-linecap="round"/>
<path id="Vector_7" d="M176 68C169.9 68.5304 164.261 71.4623 160.322 76.1508C156.384 80.8392 154.47 86.9 155 93C155.53 99.1 158.462 104.739 163.151 108.678C167.839 112.616 173.9 114.53 180 114H236" stroke="#64706A" stroke-width="6" stroke-linecap="round"/>
</g>
<g id="Vector_8">
<path d="M168 44L252 128Z" fill="black"/>
<path d="M168 44L252 128" stroke="#B32C3A" stroke-width="7" stroke-linecap="round"/>
</g>
<path id="Vector_9" d="M196 135C205.389 135 213 127.389 213 118C213 108.611 205.389 101 196 101C186.611 101 179 108.611 179 118C179 127.389 186.611 135 196 135Z" fill="#1E6B48"/>
<path id="Vector_10" d="M188 118L194 124L205 112" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</g>
</svg>`;

/** The design draws every slide illustration at 320x260 inside a 393-wide frame. The component
 *  keeps that intrinsic size and the slide scales it down on a narrower phone. */
function Illustration({ xml, width = 320, height = 260 }: IllustrationProps & { xml: string }) {
  return <SvgXml xml={xml} width={width} height={height} />;
}

export function OneJobOneRouteArt(props: IllustrationProps) {
  return <Illustration xml={ONE_JOB_ONE_ROUTE} {...props} />;
}

export function ScanAtTheDropArt(props: IllustrationProps) {
  return <Illustration xml={SCAN_AT_THE_DROP} {...props} />;
}

export function WeakSignalArt(props: IllustrationProps) {
  return <Illustration xml={WEAK_SIGNAL_IS_FINE} {...props} />;
}
