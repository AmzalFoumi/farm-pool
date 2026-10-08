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
