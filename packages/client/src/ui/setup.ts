// Shared start-up for every page: bundled fonts (OFL, offline, with Vietnamese), tokens as CSS variables, icons.
// Only the Latin and Vietnamese subsets; each loads on demand by unicode-range.
import '@fontsource/pangolin/latin-400.css'
import '@fontsource/pangolin/latin-ext-400.css'
import '@fontsource/pangolin/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/latin-400.css'
import '@fontsource/be-vietnam-pro/latin-ext-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/latin-500.css'
import '@fontsource/be-vietnam-pro/latin-ext-500.css'
import '@fontsource/be-vietnam-pro/vietnamese-500.css'
import '@fontsource/be-vietnam-pro/latin-600.css'
import '@fontsource/be-vietnam-pro/latin-ext-600.css'
import '@fontsource/be-vietnam-pro/vietnamese-600.css'
import '@fontsource/be-vietnam-pro/latin-700.css'
import '@fontsource/be-vietnam-pro/latin-ext-700.css'
import '@fontsource/be-vietnam-pro/vietnamese-700.css'
import { installIcons } from './icons.ts'
import { installTokens } from './tokens.ts'

installTokens()
installIcons()
