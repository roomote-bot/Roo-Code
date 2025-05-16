/* eslint-disable @typescript-eslint/no-explicit-any */

// npx tsx scripts/find-missing-translations.ts

import fs from 'fs';
import path from 'path';

function extractKeys(obj: any, prefix = ''): string[] {
  let keys: string[] = [];

  for (const key in obj) {
    const currentKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = [...keys, ...extractKeys(obj[key], currentKey)];
    } else {
      keys.push(currentKey);
    }
  }

  return keys;
}

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const localesDir = path.join('src', 'i18n', 'locales');

  const files = fs
    .readdirSync(path.join(rootDir, localesDir))
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(rootDir, localesDir, file));

  const localeKeys: { [locale: string]: Set<string> } = {};
  const allKeys = new Set<string>();

  for (const file of files) {
    const keys = extractKeys(JSON.parse(fs.readFileSync(file, 'utf8')));
    const relativePath = path.join(localesDir, path.basename(file));
    localeKeys[relativePath] = new Set(keys);

    for (const key of keys) {
      allKeys.add(key);
    }
  }

  Object.entries(localeKeys).forEach(([locale, keys]) => {
    const missingKeys = Array.from(allKeys).filter((key) => !keys.has(key));

    if (missingKeys.length > 0) {
      console.log(
        `\n[${locale}] Missing ${missingKeys.length} translation(s):`,
      );

      const groupedMissing = new Map<string, string[]>();

      for (const key of missingKeys) {
        const parts = key.split('.');

        if (parts.length >= 2) {
          const namespace = parts[0];
          const subKey = parts.slice(1).join('.');

          if (namespace && subKey) {
            if (!groupedMissing.has(namespace)) {
              groupedMissing.set(namespace, []);
            }

            const group = groupedMissing.get(namespace);

            if (group) {
              group.push(subKey);
            }
          }
        }
      }

      for (const [namespace, keys] of groupedMissing.entries()) {
        console.log(`${namespace}`);
        keys.forEach((key) => console.log(`\t${key}`));
      }
    } else {
      console.log(`\n[${locale}] No missing translations`);
    }
  });
}

main();
