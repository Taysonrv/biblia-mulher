// Shared visual identity. Internal IDs and storage keys remain unchanged.
export const darkPalette = {
  background: '#080E1B',
  surface: '#111C30',
  surfaceRaised: '#192740',
  border: '#293953',
  text: '#F1F5FF',
  muted: '#AFBDD4',
  subtle: '#91A3C1',
  accent: '#68E3D5',
  accentSurface: '#12333D',
  accentBorder: '#28606A',
  violet: '#BBA6FF',
  violetSurface: '#26233E',
  violetBorder: '#4B4168',
  ink: '#071923',
  danger: '#FFB0BA',
  glow: 'rgba(104, 227, 213, 0.10)',
} as const;
export const darkGradients = {
  primary: ['#123944', '#162A45', '#23213E'],
  violet: ['#292747', '#1B2943', '#12313C'],
} as const;

export type Palette = { [K in keyof typeof darkPalette]: string };
export const lightPalette: Palette = {
  background: '#F7F6F1', surface: '#FFFFFF', surfaceRaised: '#EEEFE6',
  border: '#DADFD3', text: '#253429', muted: '#566353', subtle: '#667360',
  accent: '#496346', accentSurface: '#E6EDDF', accentBorder: '#BDCEB6',
  violet: '#705A75', violetSurface: '#F0E9F1', violetBorder: '#D9C9DC',
  ink: '#FFFFFF', danger: '#A12B3E', glow: 'rgba(104,123,101,0.10)',
};
export const lightGradients = { primary: ['#E5EDDF', '#EEF1E7', '#F1EBF1'], violet: ['#EEE5F0', '#EFEEE7', '#E5EDDF'] } as const;
