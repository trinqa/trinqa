// Metro bundler resolves static image assets to a number (asset ID).
declare module '*.png' {
  const value: number;
  export default value;
}
