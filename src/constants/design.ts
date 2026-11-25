// Shared editorial identity: warm neutrals, forest green and restrained bronze.
// Legacy violet keys remain compatible with all existing feature components.
export const darkPalette = {
  background: '#1C201D',
  surface: '#272D28',
  surfaceRaised: '#303831',
  border: '#465047',
  text: '#EFEDE5',
  muted: '#C0C7BC',
  subtle: '#ACB7AB',
  accent: '#A8C5AF',
  accentSurface: '#2C3D31',
  accentBorder: '#6C8D75',
  violet: '#CEB58A',
  violetSurface: '#383126',
  violetBorder: '#89734F',
  ink: '#17231B',
  danger: '#F0AEB2',
  glow: 'rgba(168,197,175,0.06)',
} as const;
export const darkGradients = {
  primary: ['#29392F', '#29332C', '#2A3029'],
  violet: ['#363127', '#302E26', '#2B3029'],
} as const;

export type Palette = { [K in keyof typeof darkPalette]: string };
export const lightPalette: Palette = {
  background: '#F7F4ED',
  surface: '#FFFDFA',
  surfaceRaised: '#EEEDE5',
  border: '#DDDED3',
  text: '#28332C',
  muted: '#59645B',
  subtle: '#626D62',
  accent: '#355743',
  accentSurface: '#E8EEE6',
  accentBorder: '#8B9F90',
  violet: '#806239',
  violetSurface: '#F2EADD',
  violetBorder: '#B49A72',
  ink: '#FFFDFA',
  danger: '#A12B3E',
  glow: 'rgba(53,87,67,0.04)',
};
export const lightGradients = {
  primary: ['#EDF1E9', '#F2F3EC', '#F7F5EE'],
  violet: ['#F3EDDF', '#F6F1E7', '#F8F5ED'],
} as const;
