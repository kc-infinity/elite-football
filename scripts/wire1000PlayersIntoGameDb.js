/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

const filePath = 'src/data/gameDatabase.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Add import at the top if not present
if (!content.includes("from './players1000Database'")) {
  content = `import { PLAYERS_1000_DB } from './players1000Database';\n` + content;
}

// Replace the large PLAYERS_DB array with PLAYERS_1000_DB
const startIndex = content.indexOf('export const PLAYERS_DB: FootballPlayer[] = [');
const endIndex = content.indexOf('export interface UpgradeCardItem {');

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find boundaries for PLAYERS_DB");
  process.exit(1);
}

const before = content.slice(0, startIndex);
const after = content.slice(endIndex);

const replacement = `// 1,000 WORLD-CLASS FOOTBALL PLAYERS (EXACTLY 100 PLAYERS PER POSITION: GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST)
export const PLAYERS_DB: FootballPlayer[] = PLAYERS_1000_DB;\n\n`;

const updatedContent = before + replacement + after;
fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log("Successfully connected PLAYERS_1000_DB into src/data/gameDatabase.ts!");
