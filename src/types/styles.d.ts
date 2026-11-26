// Type declarations for styles imported by the web-only components and theme.
// Expo generates expo-env.d.ts locally; CI needs these declarations in Git.
declare module '*.css';

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
