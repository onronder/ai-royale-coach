import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';
import ts from 'typescript';
import { coachingTranslations } from '../src/i18n/coaching';

const src = new URL('../src/', import.meta.url).pathname;
const languages = ['en', 'tr', 'es', 'fr', 'pt'] as const;

function messages(language: typeof languages[number]) {
  const read = (suffix: string) => JSON.parse(readFileSync(join(src, 'i18n/locales', language + suffix + '.json'), 'utf8'));
  const dictionary = { ...read(''), ...read('.help'), coaching: coachingTranslations[language] };
  const entries = new Map<string, string>();
  function visit(value: unknown, key: string) {
    if (typeof value === 'string') entries.set(key, value);
    else if (value && typeof value === 'object') {
      for (const [name, child] of Object.entries(value)) visit(child, key ? key + '.' + name : name);
    }
  }
  visit(dictionary, '');
  return entries;
}

const english = messages('en');
const variables = (s: string) => [...s.matchAll(/{{\s*([^}]+?)\s*}}/g)].map(match => match[1]).sort();
for (const language of languages) {
  it('provides a local message with the original variables for every English key in ' + language, () => {
    const dictionary = messages(language);
    for (const [key, original] of english) {
      const local = dictionary.get(key);
      assert.ok(local?.trim(), language + ': ' + key);
      assert.deepEqual(variables(local), variables(original), language + ': ' + key);
    }
  });
}

it('resolves literal translation calls throughout application source without English defaults', () => {
  const missing = new Set<string>();
  function visitDirectory(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) { visitDirectory(file); continue; }
      if (!/\.tsx?$/.test(entry.name) || entry.name.endsWith('.d.ts')) continue;
      const tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      function inspect(node: ts.Node) {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
          const key = node.arguments[0];
          if (key && ts.isStringLiteralLike(key) && !english.has(key.text)) missing.add(key.text + ' (' + entry.name + ')');
        }
        ts.forEachChild(node, inspect);
      }
      inspect(tree);
    }
  }
  visitDirectory(src);
  assert.deepEqual([...missing].sort(), []);
});
