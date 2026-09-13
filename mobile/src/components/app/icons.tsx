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
