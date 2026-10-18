# Role illustrations

The four character illustrations on the role picker (`src/app/sign-up-as.tsx`), one per role.

| File | Role | The illustration |
| ---- | ---- | ---------------- |
| `role-farmer.png` | `farmer` | Green apron and straw hat, holding a phone, on mint |
| `role-buyer.png` | `buyer` | Jacket and fedora, holding a tablet, on peach |
| `role-coordinator.png` | `coordinator` | Headset and clipboard, on pale mint |
| `role-logistics.png` | `logistics` | Cap and polo shirt, holding a clipboard, on pale blue |

## Replacing one

`sign-up-as.tsx` requires each file by path at module scope, which is what lets Metro resolve it at
build time. So a replacement only has to keep the filename — nothing in the app changes.

They are not Figma exports and have no node to point at; the art was chosen outside this repo.

## Shape

2D on a white ground, subject inside a filled circle, portrait, around 360 × 400. The four are each
403px tall and between 360 and 381 wide, and the screen renders them `resizeMode="contain"` against
the card's height — so they scale to a common height and the circles match, which is why the widths
being slightly different does not show.

## Weight

**584 KB for the four, and all of it is in the app download.** `.plans/PRODUCT.md` treats a rural
3G connection as a binding constraint, so this is the largest thing on a screen a user sees once.
They are flat-colour illustrations, which is the best case for WebP — converting would take this
under 100 KB without a visible difference. Not done yet, because it renames the files and so
touches the screen; worth doing before the APK goes to testers.
