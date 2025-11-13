// keys.ts
// All environment variables must use NEXT_PUBLIC_ prefix to be accessible in the browser
export const GOOGLE_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyC49TAa2rCfGILYVDH6C3ml-GweQFDf3pc';
export const MAPTILER_KEY =
  process.env.NEXT_PUBLIC_MAPTILER_KEY || 'QB0jdUOABYup1ej0uiWi';
export const HERE_API_KEY =
  process.env.NEXT_PUBLIC_HERE_API_KEY || 'WZRsUOBKa2ZGDgOqAwlM4Clrj5R8VFwhhIiOhBvuiso';
