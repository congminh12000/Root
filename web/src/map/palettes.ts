import type { Suit } from './spec'

export interface Palette {
  paper: string; floor: string; floorDark: string; floorLight: string
  dirt: string; dirtDark: string; dirtLight: string; trail: string
  meadow: string; meadowLight: string; grass: string; plateauSide: string
  water: string; waterDeep: string; waterLight: string; bank: string
  conifer: string[]; coniferShade: string; trunk: string; leaves: Record<Suit | 'mixed', string[]>
  rock: string; rockLight: string; rockDark: string; moss: string
  wood: string; woodDark: string; parchment: string; parchmentDark: string
  ink: string; haze: string; suits: Record<Suit, string>
}

/** One palette per season; a map picks one with its "season" field. Muted, print-like tones. */
export const PALETTES: Record<string, Palette> = {
  autumn: {
    paper: '#efe3c4', floor: '#5a6243', floorDark: '#3f4732', floorLight: '#737a54',
    dirt: '#cdb98e', dirtDark: '#9c8760', dirtLight: '#e2d3ad', trail: '#f6efdc',
    meadow: '#d4c394', meadowLight: '#e9dcb4', grass: '#8f8d58', plateauSide: '#86704f',
    water: '#7aa3a2', waterDeep: '#5b8789', waterLight: '#c3d9cf', bank: '#a8946a',
    conifer: ['#2c4236', '#31493a', '#273b31', '#365040'], coniferShade: '#16241d', trunk: '#4a3a28',
    leaves: {
      fox: ['#b8532f', '#c6633b', '#a3442c'],
      rabbit: ['#d4a63d', '#dfb854', '#c39231'],
      mouse: ['#8c4c56', '#9e5d62', '#77404e'],
      mixed: ['#bb733a', '#cb9343', '#a65d34', '#807e40'],
    },
    rock: '#a8a292', rockLight: '#d3cdba', rockDark: '#625d52', moss: '#7d8a4f',
    wood: '#b08754', woodDark: '#6a4e31', parchment: '#f3e9cd', parchmentDark: '#c8b68c',
    ink: '#2b2720', haze: '#e3dfc7',
    suits: { fox: '#b96f48', rabbit: '#b5a35d', mouse: '#708f9c' },
  },
}
