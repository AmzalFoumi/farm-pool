/**
 * Icons exported from Figma, rendered verbatim.
 *
 * Each XML string below is the exact asset Figma exported for the node named
 * in its comment — not a redraw, and not a lookalike from an icon package.
 * Stroke colours are baked in because every one of these glyphs appears exactly
 * once, at exactly one colour, in the two onboarding screens. If a glyph later
 * needs a second colour, give it a `stroke="currentColor"` variant and pass
 * `color` to <SvgXml> rather than duplicating the path data.
 *
 * Rendered with react-native-svg's SvgXml, which was already a dependency.
 * That avoids adding react-native-svg-transformer and a Metro config change
 * for eleven icons — and `.plans/DECISIONS.md` is explicit that Metro should
 * not be hand-configured in this repo.
 */

import { SvgXml } from "react-native-svg";

type IconProps = { size?: number };
type GenericIconProps = { color?: string };

/* Figma 196:5547 — leaf lockup, 34×34, on the white logo tile */
const LEAF = `<svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17 28.3333C17 19.8333 21.25 14.1667 28.3333 12.75C28.3333 21.25 24.0833 26.9167 17 28.3333Z" stroke="#1E6B48" stroke-width="2.83333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17 28.3333C17 19.8333 12.75 14.1667 5.66667 12.75C5.66667 21.25 9.91667 26.9167 17 28.3333Z" stroke="#1E6B48" stroke-width="2.83333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17 28.3333V19.8333" stroke="#1E6B48" stroke-width="2.83333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* Figma 196:5561 — plus, 22×22, white on the primary button */
const PLUS = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11 4.58333V17.4167M4.58333 11H17.4167" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* Figma 196:5565 — log-in arrow, 22×22, on the outline button */
const LOGIN = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.75 2.75H17.4167C17.9029 2.75 18.3692 2.94315 18.713 3.28697C19.0568 3.63079 19.25 4.0971 19.25 4.58333V17.4167C19.25 17.9029 19.0568 18.3692 18.713 18.713C18.3692 19.0568 17.9029 19.25 17.4167 19.25H13.75" stroke="#1E6B48" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.16667 6.41667L13.75 11L9.16667 15.5833M13.75 11H2.75" stroke="#1E6B48" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* Figma 196:5569 — mail, 18×18, beside the "Need help?" line.
   Figma exported this one as two separately-positioned vectors rather than a
   single SVG. Both `d` strings are unaltered; the translate on each group
   reproduces the exact offsets Figma gave for them (left 2.1744 for both,
   top 4.05 and 5.925), so the composed glyph is geometrically identical to
   the export. */
const MAIL = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<g transform="translate(2.1744 4.05)"><path d="M0.825 2.325C0.825 1.92718 0.983035 1.54564 1.26434 1.26434C1.54564 0.983035 1.92718 0.825 2.325 0.825H11.325C11.7228 0.825 12.1044 0.983035 12.3857 1.26434C12.667 1.54564 12.825 1.92718 12.825 2.325V7.575C12.825 7.97282 12.667 8.35436 12.3857 8.63566C12.1044 8.91696 11.7228 9.075 11.325 9.075H2.325C1.92718 9.075 1.54564 8.91696 1.26434 8.63566C0.983035 8.35436 0.825 7.97282 0.825 7.575V2.325Z" stroke="#5A625C" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></g>
<g transform="translate(2.1744 5.925)"><path d="M0.82511 0.82511L6.82511 4.57511L12.8251 0.82511" stroke="#5A625C" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></g>
</svg>`;

/* Figma 196:5578 — back arrow, 24×24, in the app bar */
const BACK = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19 12H5" stroke="#191F1B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11 6L5 12L11 18" stroke="#191F1B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* Figma 196:5585 — farmer (leaf), 28×28, on the mint tile */
const FARMER = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14 23.3333C14 16.3333 17.5 11.6667 23.3333 10.5C23.3333 17.5 19.8333 22.1667 14 23.3333Z" stroke="#0E3A26" stroke-width="2.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 23.3333C14 16.3333 10.5 11.6667 4.66667 10.5C4.66667 17.5 8.16667 22.1667 14 23.3333Z" stroke="#0E3A26" stroke-width="2.33333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* Figma 196:5594 — wholesale buyer (bag), 28×28, on the lilac tile */
const BUYER = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.66667 8.16667H23.3333L21.5833 22.1667H6.41667L4.66667 8.16667Z" stroke="#3D2149" stroke-width="2.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10.5 8.16667V5.83333C10.5 4.90508 10.8687 4.01484 11.5251 3.35846C12.1815 2.70208 13.0717 2.33333 14 2.33333C14.9283 2.33333 15.8185 2.70208 16.4749 3.35846C17.1313 4.01484 17.5 4.90508 17.5 5.83333V8.16667" stroke="#3D2149" stroke-width="2.33333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* Figma 196:5603 — delivery partner (truck), 28×28, white on the deep-green tile */
const DELIVERY = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M3.5 8.16667H15.1667V19.8333H3.5V8.16667Z" stroke="white" stroke-width="2.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M15.1667 11.6667H19.8333L23.3333 15.1667V19.8333H15.1667V11.6667Z" stroke="white" stroke-width="2.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7.58333 22.75C8.872 22.75 9.91667 21.7053 9.91667 20.4167C9.91667 19.128 8.872 18.0833 7.58333 18.0833C6.29467 18.0833 5.25 19.128 5.25 20.4167C5.25 21.7053 6.29467 22.75 7.58333 22.75Z" stroke="white" stroke-width="2.33333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M19.8333 22.75C21.122 22.75 22.1667 21.7053 22.1667 20.4167C22.1667 19.128 21.122 18.0833 19.8333 18.0833C18.5447 18.0833 17.5 19.128 17.5 20.4167C17.5 21.7053 18.5447 22.75 19.8333 22.75Z" stroke="white" stroke-width="2.33333" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* Figma 196:5590 / 196:5599 — chevron, 22×22, on an unselected role card */
const CHEVRON = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M8.25 5.5L13.75 11L8.25 16.5" stroke="#5A625C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* Figma 196:5611 — check, 17×17, white inside the selected badge */
const CHECK = `<svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.1667 4.25L6.375 12.0417L2.83333 8.5" stroke="white" stroke-width="2.26667" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* Generic UI Icons for cards and menus */
const DOTS = `<svg viewBox="0 0 20 20" fill="currentColor">
  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
</svg>`;

const OFFERS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
</svg>`;

const CHEVRON_RIGHT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 5l7 7-7 7" />
</svg>`;

const POOL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
</svg>`;

const SOLO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 17l4 4 4-4m-4-5v9M4 4h16v8a4 4 0 01-4 4H8a4 4 0 01-4-4V4z" />
</svg>`;

const CHECK_MARK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 13l4 4L19 7" />
</svg>`;

const EDIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
</svg>`;

const EYE_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
</svg>`;

const SHARE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
</svg>`;

const DUPLICATE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
</svg>`;

const CHECK_CIRCLE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>`;

const TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
</svg>`;

const PLAY = `<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M8 5v14l11-7z" />
</svg>`;

const HOURGLASS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 22h14" />
  <path d="M5 2h14" />
  <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
  <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
</svg>`;

/* The FarmPool wordmark — assets/brand/farmpool-wordmark-white.svg, path data unaltered. The
   white fill became currentColor so a token sets it; see assets/brand/README.md. */
const WORDMARK = `<svg viewBox="0 0 3987 1128" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M3670.68 564Q3670.68 630.45 3637.45 688Q3604.23 745.55 3546.68 778.77Q3489.13 812 3422.68 812Q3356.23 812 3298.68 778.77Q3241.13 745.55 3207.9 688Q3174.68 630.45 3174.68 564Q3174.68 497.55 3207.9 440Q3241.13 382.45 3298.68 349.23Q3356.23 316 3422.68 316Q3489.13 316 3546.68 349.23Q3604.23 382.45 3637.45 440Q3670.68 497.55 3670.68 564ZM3142.68 564Q3142.68 630.45 3109.45 688Q3076.23 745.55 3018.68 778.77Q2961.13 812 2894.68 812Q2828.23 812 2770.68 778.77Q2713.13 745.55 2679.9 688Q2646.68 630.45 2646.68 564Q2646.68 497.55 2679.9 440Q2713.13 382.45 2770.68 349.23Q2828.23 316 2894.68 316Q2961.13 316 3018.68 349.23Q3076.23 382.45 3109.45 440Q3142.68 497.55 3142.68 564ZM3086.68 564Q3086.68 512.55 3060.96 468Q3035.23 423.45 2990.68 397.72Q2946.12 372 2894.68 372Q2843.23 372 2798.68 397.72Q2754.12 423.45 2728.4 468Q2702.68 512.55 2702.68 564Q2702.68 615.45 2728.4 660Q2754.12 704.55 2798.68 730.28Q2843.23 756 2894.68 756Q2946.12 756 2990.68 730.28Q3035.23 704.55 3060.96 660Q3086.68 615.45 3086.68 564ZM3614.68 564Q3614.68 512.55 3588.95 468Q3563.23 423.45 3518.68 397.72Q3474.12 372 3422.68 372Q3371.23 372 3326.68 397.72Q3282.12 423.45 3256.4 468Q3230.68 512.55 3230.68 564Q3230.68 615.45 3256.4 660Q3282.12 704.55 3326.68 730.28Q3371.23 756 3422.68 756Q3474.12 756 3518.68 730.28Q3563.23 704.55 3588.95 660Q3614.68 615.45 3614.68 564ZM3062.68 564Q3062.68 609.02 3040.17 648Q3017.66 686.98 2978.68 709.49Q2939.69 732 2894.68 732Q2849.66 732 2810.68 709.49Q2771.69 686.98 2749.19 648Q2726.68 609.02 2726.68 564Q2726.68 518.98 2749.19 480Q2771.69 441.02 2810.68 418.51Q2849.66 396 2894.68 396Q2939.69 396 2978.68 418.51Q3017.66 441.02 3040.17 480Q3062.68 518.98 3062.68 564ZM3590.68 564Q3590.68 609.02 3568.17 648Q3545.66 686.98 3506.68 709.49Q3467.69 732 3422.68 732Q3377.66 732 3338.68 709.49Q3299.69 686.98 3277.18 648Q3254.68 609.02 3254.68 564Q3254.68 518.98 3277.18 480Q3299.69 441.02 3338.68 418.51Q3377.66 396 3422.68 396Q3467.69 396 3506.68 418.51Q3545.66 441.02 3568.17 480Q3590.68 518.98 3590.68 564ZM2118.63 564Q2118.63 499.48 2150.08 443.14Q2181.52 386.8 2236.44 352.92Q2291.35 319.05 2355.81 316.24Q2420.27 313.42 2477.93 342.38Q2535.59 371.34 2571.83 424.72Q2608.06 478.11 2613.69 542.39Q2619.31 606.66 2592.9 665.53Q2566.48 724.4 2514.73 762.93Q2462.97 801.46 2399 809.88Q2336.93 818.05 2278.63 795.86L2278.63 734.69Q2286.92 738.93 2295.74 742.43Q2342.17 760.88 2391.69 754.36Q2441.22 747.84 2481.29 718.01Q2521.35 688.18 2541.8 642.6Q2562.25 597.03 2557.9 547.27Q2553.55 497.5 2525.49 456.17Q2497.44 414.84 2452.8 392.42Q2408.16 370 2358.26 372.18Q2308.35 374.36 2265.84 400.59Q2223.32 426.81 2198.98 470.43Q2174.63 514.05 2174.63 564L2174.63 988L2118.63 988ZM880.04 795.86Q821.74 818.05 759.67 809.88Q695.7 801.46 643.95 762.93Q592.19 724.4 565.78 665.53Q539.36 606.66 544.99 542.39Q550.61 478.11 586.85 424.72Q623.08 371.34 680.74 342.38Q738.4 313.42 802.86 316.24Q867.32 319.05 922.24 352.92Q977.15 386.8 1008.6 443.14Q1040.04 499.48 1040.04 564L1040.04 804L984.04 804L984.04 564Q984.04 514.05 959.7 470.43Q935.35 426.81 892.84 400.59Q850.32 374.36 800.42 372.18Q750.51 370 705.87 392.42Q661.23 414.84 633.18 456.17Q605.13 497.5 600.77 547.27Q596.42 597.03 616.87 642.6Q637.32 688.18 677.39 718.01Q717.46 747.84 766.98 754.36Q816.51 760.88 862.93 742.43Q871.75 738.93 880.04 734.69ZM2278.63 707.19L2278.63 633.28Q2279.21 634.01 2279.8 634.74Q2298.2 657.33 2325.28 668.09Q2352.36 678.85 2381.25 675.04Q2410.14 671.24 2433.51 653.84Q2456.89 636.44 2468.82 609.85Q2480.75 583.27 2478.21 554.24Q2475.67 525.21 2459.3 501.1Q2442.94 476.99 2416.9 463.91Q2390.86 450.84 2361.75 452.11Q2332.64 453.38 2307.83 468.67Q2283.03 483.97 2268.83 509.42Q2254.63 534.86 2254.63 564L2254.63 988L2198.63 988L2198.63 564Q2198.63 520.29 2219.93 482.12Q2241.23 443.96 2278.44 421.01Q2315.64 398.07 2359.3 396.16Q2402.97 394.25 2442.03 413.87Q2481.09 433.49 2505.64 469.65Q2530.18 505.82 2533.99 549.36Q2537.8 592.9 2519.91 632.78Q2502.01 672.66 2466.95 698.76Q2431.89 724.86 2388.56 730.56Q2345.23 736.27 2304.61 720.13Q2290.88 714.68 2278.63 707.19ZM1376.63 804L1376.63 524Q1376.63 468.27 1404.5 420Q1432.37 371.73 1480.63 343.87Q1528.9 316 1584.63 316Q1640.37 316 1688.63 343.87Q1736.9 371.73 1764.77 420Q1792.63 468.27 1792.63 524L1792.63 804L1736.63 804L1736.63 524Q1736.63 483.27 1716.27 448Q1695.9 412.73 1660.63 392.36Q1625.36 372 1584.63 372Q1543.9 372 1508.63 392.36Q1473.36 412.73 1453 448Q1432.63 483.27 1432.63 524L1432.63 804ZM960.04 564L960.04 804L904.04 804L904.04 564Q904.04 534.86 889.84 509.42Q875.64 483.97 850.84 468.67Q826.04 453.38 796.93 452.11Q767.82 450.84 741.78 463.91Q715.74 476.99 699.37 501.1Q683.01 525.21 680.47 554.24Q677.93 583.27 689.86 609.85Q701.79 636.44 725.16 653.84Q748.53 671.24 777.42 675.04Q806.31 678.85 833.39 668.09Q860.47 657.33 878.88 634.74Q879.47 634.01 880.04 633.28L880.04 707.19Q867.8 714.68 854.07 720.13Q813.45 736.27 770.11 730.56Q726.78 724.86 691.72 698.76Q656.66 672.66 638.77 632.78Q620.87 592.9 624.68 549.36Q628.49 505.82 653.04 469.65Q677.58 433.49 716.64 413.87Q755.7 394.25 799.37 396.16Q843.04 398.07 880.24 421.01Q917.44 443.96 938.74 482.12Q960.04 520.29 960.04 564ZM140 804L140 357Q140 310.64 163.18 270.5Q186.36 230.36 226.5 207.18Q266.64 184 313 184L560 184L560 240L313 240Q281.65 240 254.5 255.68Q227.35 271.35 211.67 298.5Q196 325.65 196 357L196 804ZM1712.63 804L1656.63 804L1656.63 524Q1656.63 504.71 1646.99 488Q1637.34 471.29 1620.63 461.65Q1603.92 452 1584.63 452Q1565.34 452 1548.63 461.65Q1531.92 471.29 1522.28 488Q1512.63 504.71 1512.63 524L1512.63 804L1456.63 804L1456.63 524Q1456.63 489.7 1473.78 460Q1490.93 430.3 1520.63 413.15Q1550.33 396 1584.63 396Q1618.93 396 1648.63 413.15Q1678.33 430.3 1695.48 460Q1712.63 489.7 1712.63 524ZM560 264L560 320L313 320Q303.09 320 294.5 324.96Q285.91 329.91 280.96 338.5Q276 347.09 276 357L276 804L220 804L220 357Q220 332.08 232.46 310.5Q244.92 288.92 266.5 276.46Q288.08 264 313 264ZM3006.68 564Q3006.68 533.99 2991.67 508Q2976.67 482.01 2950.68 467.01Q2924.69 452 2894.68 452Q2864.67 452 2838.68 467.01Q2812.69 482.01 2797.68 508Q2782.68 533.99 2782.68 564Q2782.68 594.01 2797.68 620Q2812.69 645.99 2838.68 660.99Q2864.67 676 2894.68 676Q2924.69 676 2950.68 660.99Q2976.67 645.99 2991.67 620Q3006.68 594.01 3006.68 564ZM3534.68 564Q3534.68 533.99 3519.67 508Q3504.67 482.01 3478.68 467.01Q3452.69 452 3422.68 452Q3392.67 452 3366.68 467.01Q3340.69 482.01 3325.68 508Q3310.68 533.99 3310.68 564Q3310.68 594.01 3325.68 620Q3340.69 645.99 3366.68 660.99Q3392.67 676 3422.68 676Q3452.69 676 3478.68 660.99Q3504.67 645.99 3519.67 620Q3534.68 594.01 3534.68 564ZM1086.04 804L1086.04 524Q1086.04 477.89 1105.53 436.1Q1125.02 394.3 1160.34 364.66Q1195.67 335.02 1240.21 323.09Q1284.75 311.15 1330.16 319.16Q1375.57 327.17 1413.35 353.62L1381.23 399.49Q1353.62 380.16 1320.44 374.31Q1287.25 368.46 1254.7 377.18Q1222.15 385.9 1196.34 407.56Q1170.52 429.22 1156.28 459.76Q1142.04 490.3 1142.04 524L1142.04 804ZM1779.49 398.06Q1764 373.96 1743.57 354.81Q1751.76 348.99 1760.63 343.87Q1808.9 316 1864.63 316Q1920.37 316 1968.63 343.87Q2016.9 371.73 2044.77 420Q2072.63 468.27 2072.63 524L2072.63 804L2016.63 804L2016.63 524Q2016.63 483.27 1996.27 448Q1975.9 412.73 1940.63 392.36Q1905.36 372 1864.63 372Q1823.9 372 1788.63 392.36Q1783.93 395.08 1779.49 398.06ZM3710.68 804L3710.68 140L3766.68 140L3766.68 804ZM3790.68 140L3846.68 140L3846.68 804L3790.68 804ZM1992.63 804L1936.63 804L1936.63 524Q1936.63 504.71 1926.99 488Q1917.34 471.29 1900.63 461.65Q1883.92 452 1864.63 452Q1845.34 452 1828.63 461.65Q1818.91 467.26 1811.59 475.26Q1805.37 446.06 1791.49 418.93Q1795.9 415.88 1800.63 413.15Q1830.33 396 1864.63 396Q1898.93 396 1928.63 413.15Q1958.33 430.3 1975.48 460Q1992.63 489.7 1992.63 524ZM1367.46 419.15L1335.34 465.02Q1322.26 455.87 1306.54 453.09Q1290.83 450.32 1275.41 454.45Q1259.99 458.58 1247.76 468.84Q1235.53 479.1 1228.79 493.57Q1222.04 508.04 1222.04 524L1222.04 804L1166.04 804L1166.04 524Q1166.04 495.62 1178.03 469.9Q1190.03 444.19 1211.77 425.95Q1233.5 407.71 1260.91 400.36Q1288.32 393.02 1316.27 397.94Q1344.21 402.87 1367.46 419.15ZM300 502L300 446L510 446L510 502ZM510 526L510 582L300 582L300 526Z"/></svg>`;

/* Each icon keeps the exact box Figma drew it at. `size` exists only for the
   role icons, which share one 28×28 rule; do not use it to rescale an icon
   into a box the design never gave it. */
export const LeafIcon = () => <SvgXml xml={LEAF} width={34} height={34} />;
export const PlusIcon = () => <SvgXml xml={PLUS} width={22} height={22} />;
export const LoginIcon = () => <SvgXml xml={LOGIN} width={22} height={22} />;
export const MailIcon = () => <SvgXml xml={MAIL} width={18} height={18} />;
export const BackIcon = () => <SvgXml xml={BACK} width={24} height={24} />;
export const ChevronIcon = () => <SvgXml xml={CHEVRON} width={22} height={22} />;
export const CheckIcon = () => <SvgXml xml={CHECK} width={17} height={17} />;

export const FarmerIcon = ({ size = 28 }: IconProps) => (
  <SvgXml xml={FARMER} width={size} height={size} />
);
export const BuyerIcon = ({ size = 28 }: IconProps) => (
  <SvgXml xml={BUYER} width={size} height={size} />
);
export const DeliveryIcon = ({ size = 28 }: IconProps) => (
  <SvgXml xml={DELIVERY} width={size} height={size} />
);

export const DotsIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={DOTS} width={16} height={16} color={color} />
);
export const OffersIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={OFFERS} width={14} height={14} color={color} />
);
export const ChevronRightIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={CHEVRON_RIGHT} width={14} height={14} color={color} />
);
export const PoolIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={POOL} width={14} height={14} color={color} />
);
export const SoloIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={SOLO} width={14} height={14} color={color} />
);
export const CheckMarkIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={CHECK_MARK} width={14} height={14} color={color} />
);
export const EditIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={EDIT} width={16} height={16} color={color} />
);
export const EyeOffIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={EYE_OFF} width={16} height={16} color={color} />
);
export const ShareIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={SHARE} width={16} height={16} color={color} />
);
export const DuplicateIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={DUPLICATE} width={16} height={16} color={color} />
);
export const CheckCircleIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={CHECK_CIRCLE} width={16} height={16} color={color} />
);
export const TrashIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={TRASH} width={16} height={16} color={color} />
);
export const PlayIcon = ({ color = "currentColor" }: GenericIconProps) => (
  <SvgXml xml={PLAY} width={16} height={16} color={color} />
);

export const HourglassIcon = ({
  color = "currentColor",
  size = 18
}: GenericIconProps & { size?: number }) => (
  <SvgXml xml={HOURGLASS} width={size} height={size} color={color} />
);

/** The wordmark is 3987 × 1128; height follows width so it is never squashed. */
export const WORDMARK_RATIO = 1128 / 3987;
export const WordmarkIcon = ({
  width,
  color = "currentColor"
}: { width: number } & GenericIconProps) => (
  <SvgXml
    xml={WORDMARK}
    width={width}
    height={width * WORDMARK_RATIO}
    color={color}
    accessibilityRole="image"
    accessibilityLabel="FarmPool"
  />
);
