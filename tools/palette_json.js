// Prints one palette as JSON, for the theme driver. Usage: gjs -m tools/palette_json.js mint
import System from 'system';
import {PALETTES} from '../lib/palettes.js';
print(JSON.stringify(PALETTES[System.programArgs[0]]));
