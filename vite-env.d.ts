/**
 * Fix: Removed reference to "vite/client" to resolve type definition errors.
 * Manually declared necessary types for Vite environment.
 */

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  const svgSrc: string;
  export default svgSrc;
}

declare module '*.png' {
  const pngSrc: string;
  export default pngSrc;
}

declare module '*.jpg' {
  const jpgSrc: string;
  export default jpgSrc;
}

declare module '*.jpeg' {
  const jpegSrc: string;
  export default jpegSrc;
}

declare module '*.gif' {
  const gifSrc: string;
  export default gifSrc;
}

declare module '*.webp' {
  const webpSrc: string;
  export default webpSrc;
}

declare module '*.ico' {
  const icoSrc: string;
  export default icoSrc;
}
