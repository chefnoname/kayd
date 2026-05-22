// Allow side-effect CSS imports (e.g. third-party stylesheets like driver.js)
// without TypeScript complaining about missing module declarations.
declare module "*.css" {
  const styles: { [className: string]: string };
  export default styles;
}
