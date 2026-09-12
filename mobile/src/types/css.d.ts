// Side-effect and CSS-module imports carry no types on their own. Metro handles
// them at build time (global.css via uniwind, *.module.css on web), so this
// only tells tsc they exist.
declare module "*.css";

declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
