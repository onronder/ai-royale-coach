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
    assert.deepEqual([...dictionary.keys()].sort(), [...english.keys()].sort());
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
        function checkKey(key: ts.Node | undefined) {
          if (!key) return;
          if (ts.isConditionalExpression(key)) {
            checkKey(key.whenTrue);
            checkKey(key.whenFalse);
          } else if (ts.isStringLiteralLike(key) && !english.has(key.text)) {
            missing.add(key.text + ' (' + entry.name + ')');
          }
        }
        if (ts.isCallExpression(node) && (
          (ts.isIdentifier(node.expression) && node.expression.text === 't') ||
          (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 't')
        )) checkKey(node.arguments[0]);
        if (ts.isPropertyAssignment(node) && ['titleKey', 'descriptionKey', 'labelKey'].includes(node.name.getText(tree))) {
          checkKey(node.initializer);
        }
        ts.forEachChild(node, inspect);
      }
      inspect(tree);
    }
  }
  visitDirectory(src);
  assert.deepEqual([...missing].sort(), []);
});

it('resolves runtime keys for trial actions, battle results, deck lessons and tournament formats in every language', () => {
  for (const language of languages) {
    const dictionary = messages(language);
    const groups = {
      trialFollowup: ['avoid_charge', 'value', 'price', 'technical', 'other', 'skip'],
      coaching: ['win', 'loss', 'draw'],
      'tournaments.formats': ['single_elimination', 'double_elimination', 'round_robin'],
      'templates.difficulty': ['beginner', 'intermediate', 'advanced'],
    };
    for (const [group, keys] of Object.entries(groups)) {
      for (const key of keys) assert.ok(dictionary.get(group + '.' + key), language + ': ' + group + '.' + key);
    }
    for (const deck of ['hogCycle', 'golemBeatdown', 'logBait', 'xbowSiege']) {
      for (const phase of ['phase1', 'phase2', 'phase3']) {
        assert.ok(dictionary.get(`landing.demo.difficulty.deckData.${deck}.${phase}.name`));
      }
    }
  }
});

it('uses the in-game card names in localized demo lessons and example coaching advice', () => {
  const englishOnlyNames = /\b(Fireball|Hog Rider|Musketeer|Ice Golem|Goblin Barrel|Inferno Tower|Goblin Gang|X-Bow)\b/i;
  for (const language of languages.filter(language => language !== 'en')) {
    for (const [key, text] of messages(language)) {
      if (key.startsWith('landing.demo.difficulty.deckData.') || key.startsWith('landing.demo.aiInsights.')) {
        assert.doesNotMatch(text, englishOnlyNames, language + ': ' + key);
      }
    }
  }
});
