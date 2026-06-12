// Allow CSS module imports without TypeScript complaining about missing module declarations.
declare module "*.css" {
  const styles: { [className: string]: string };
  export default styles;
}
