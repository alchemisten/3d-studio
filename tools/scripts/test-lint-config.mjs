import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

const eslint = new ESLint({
  overrideConfig: {
    rules: {
      'jsx-a11y/label-has-associated-control': ['error', { controlComponents: ['Form*'], assert: 'nesting', depth: 3 }],
      'react/forbid-component-props': ['error', { forbid: [{ propName: 'style', allowedForPatterns: ['Allowed*'] }] }],
      'react/no-danger': ['error', { customComponentNames: ['Unsafe*'] }],
      'react/jsx-pascal-case': ['error', { ignore: ['LEGACY_*'] }],
      'react/jsx-handler-names': ['error', { ignoreComponentNames: ['Ignored*'], checkLocalVariables: true }],
      'react/no-unstable-nested-components': ['error', { propNamePattern: 'render*' }],
    },
  },
});

const cases = [
  ['export const Label = () => <label>Name<FormInput /></label>;', 'jsx-a11y/label-has-associated-control', 0],
  ['export const Label = () => <label><FormInput /></label>;', 'jsx-a11y/label-has-associated-control', 1],
  ['export const Button = () => <AllowedButton style={{}} />;', 'react/forbid-component-props', 0],
  ['export const Button = () => <BlockedButton style={{}} />;', 'react/forbid-component-props', 1],
  ['export const Html = () => <UnsafeHtml dangerouslySetInnerHTML={{ __html: "" }} />;', 'react/no-danger', 1],
  ['export const Html = () => <SafeHtml dangerouslySetInnerHTML={{ __html: "" }} />;', 'react/no-danger', 0],
  ['export const Legacy = () => <LEGACY_BUTTON />;', 'react/jsx-pascal-case', 0],
  ['export const Legacy = () => <OTHER_BUTTON />;', 'react/jsx-pascal-case', 1],
  ['export const Button = () => <IgnoredButton onClick={badName} />;', 'react/jsx-handler-names', 0],
  ['export const Button = () => <OtherButton onClick={badName} />;', 'react/jsx-handler-names', 1],
  ['export const Parent = () => <Child renderFooter={() => <div />} />;', 'react/no-unstable-nested-components', 0],
  ['export const Parent = () => <Child footer={() => <div />} />;', 'react/no-unstable-nested-components', 1],
  ['console.log("unexpected");', 'no-console', 1],
  ['export const value = 1;;', '@stylistic/no-extra-semi', 1],
];

for (const [code, rule, count] of cases) {
  const [result] = await eslint.lintText(code, { filePath: 'libs/ui/src/lint-fixture.tsx' });
  assert.equal(result.messages.filter((message) => message.ruleId === rule).length, count, `${rule}: ${code}`);
}

console.log('Lint configuration: accessibility globs, React prop globs and console restriction passed.');
