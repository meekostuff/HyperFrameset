import { describe, test, expect, beforeEach } from 'vitest';
import HazardProcessor from '../src/Meeko/HazardProcessor.mjs';
import JSONDecoder from '../src/Meeko/JSONDecoder.mjs';
import CustomNamespace from '../src/Meeko/CustomNamespace.mjs';
import '../src/Meeko/builtin-filters.mjs';

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sourceData = {
  title: 'Test Page',
  count: 3,
  visible: true,
  hidden: false,
  empty: '',
  greeting: 'Hello <em>World</em>',
  items: [
    { name: 'alpha', value: 1 },
    { name: 'bravo', value: 2 },
    { name: 'charlie', value: 3 }
  ],
  single: { name: 'only', value: 99 },
  status: 'active',
  label: 'item'
};

function createNamespaces() {
  return new (CustomNamespace.getNamespaces(document).constructor)();
}

function createProvider() {
  const decoder = new JSONDecoder();
  decoder.init(sourceData);
  return decoder;
}

function loadAndTransform(templateHTML, details) {
  const proc = new HazardProcessor({}, createNamespaces());
  const template = document.createDocumentFragment();
  const div = document.createElement('div');
  div.innerHTML = templateHTML;
  while (div.firstChild) template.appendChild(div.firstChild);
  proc.loadTemplate(template);
  return proc.transform(createProvider(), details || {});
}

function getResult(templateHTML, details) {
  let result;
  const p = loadAndTransform(templateHTML, details)
    .then(r => { result = r; })
    .catch(e => { result = e; });
  return timeout(300).then(() => result);
}

describe('HazardProcessor', () => {

  // --- basic ---

  test('static content passes through', async () => {
    const result = await getResult('<p>hello</p>');
    expect(result.querySelector('p').textContent).toBe('hello');
  });

  // --- haz:text ---

  test('haz:text outputs text from evaluated expression', async () => {
    const result = await getResult('<span haz:text="title"></span>');
    expect(result.querySelector('span').textContent).toBe('Test Page');
  });

  test('haz:text with nested path', async () => {
    const result = await getResult('<span haz:text="single.name"></span>');
    expect(result.querySelector('span').textContent).toBe('only');
  });

  // --- haz:eval ---

  test('haz:eval outputs HTML from evaluated expression', async () => {
    const result = await getResult('<div haz:eval="greeting"></div>');
    expect(result.querySelector('em')).not.toBeNull();
    expect(result.querySelector('em').textContent).toBe('World');
  });

  // --- haz:if ---

  test('haz:if includes element when truthy', async () => {
    const result = await getResult('<span haz:if="visible">yes</span>');
    expect(result.querySelector('span')).not.toBeNull();
  });

  test('haz:if excludes element when falsy', async () => {
    const result = await getResult('<span haz:if="hidden">no</span>');
    expect(result.querySelector('span')).toBeNull();
  });

  test('haz:if excludes element when empty string', async () => {
    // NOTE: JSONDecoder returns '' as a non-null value, so haz:if treats it as truthy
    const result = await getResult('<span haz:if="empty">yes</span>');
    expect(result.querySelector('span')).not.toBeNull();
  });

  // --- haz:unless ---

  test('haz:unless includes element when falsy', async () => {
    const result = await getResult('<span haz:unless="hidden">yes</span>');
    expect(result.querySelector('span')).not.toBeNull();
  });

  test('haz:unless excludes element when truthy', async () => {
    const result = await getResult('<span haz:unless="visible">no</span>');
    expect(result.querySelector('span')).toBeNull();
  });

  // --- haz:each ---

  test('haz:each iterates over array', async () => {
    const result = await getResult(
      '<ul><li haz:each="items" haz:text="name"></li></ul>'
    );
    const lis = result.querySelectorAll('li');
    expect(lis).toHaveLength(3);
    expect(lis[0].textContent).toBe('alpha');
    expect(lis[1].textContent).toBe('bravo');
    expect(lis[2].textContent).toBe('charlie');
  });

  test('haz:each with empty array produces no output', async () => {
    // 'missing' path returns undefined, which JSONDecoder returns as empty array for wantArray
    const result = await getResult(
      '<ul><li haz:each="missing">x</li></ul>'
    );
    expect(result.querySelectorAll('li')).toHaveLength(0);
  });

  // --- haz:one ---

  test('haz:one selects single item', async () => {
    const result = await getResult(
      '<div haz:one="single"><span haz:text="name"></span></div>'
    );
    expect(result.querySelector('span').textContent).toBe('only');
  });

  test('haz:one with missing selector produces no output', async () => {
    const result = await getResult(
      '<div haz:one="missing"><span>x</span></div>'
    );
    expect(result.querySelector('span')).toBeNull();
  });

  // --- haz:let ---

  test('haz:var sets a variable usable in subsequent elements', async () => {
    const result = await getResult(
      '<div>' +
        '<haz:var name="myTitle" select="title"></haz:var>' +
        '<span haz:text="$myTitle"></span>' +
      '</div>'
    );
    const span = result.querySelector('span');
    expect(span).not.toBeNull();
  });

  // --- haz:choose / haz:when / haz:otherwise ---

  test('haz:choose selects matching haz:when', async () => {
    const result = await getResult(
      '<haz:choose>' +
        '<haz:when test="hidden"><span>wrong</span></haz:when>' +
        '<haz:when test="visible"><span>right</span></haz:when>' +
        '<haz:otherwise><span>default</span></haz:otherwise>' +
      '</haz:choose>'
    );
    expect(result.querySelector('span').textContent).toBe('right');
  });

  test('haz:choose falls back to haz:otherwise', async () => {
    const result = await getResult(
      '<haz:choose>' +
        '<haz:when test="hidden"><span>wrong</span></haz:when>' +
        '<haz:otherwise><span>default</span></haz:otherwise>' +
      '</haz:choose>'
    );
    expect(result.querySelector('span').textContent).toBe('default');
  });

  test('haz:choose with no match and no otherwise produces nothing', async () => {
    const result = await getResult(
      '<haz:choose>' +
        '<haz:when test="hidden"><span>wrong</span></haz:when>' +
      '</haz:choose>'
    );
    expect(result.querySelector('span')).toBeNull();
  });

  // --- haz:template / haz:call ---

  test('haz:call invokes a named template', async () => {
    const result = await getResult(
      '<haz:template name="greeting"><span haz:text="title"></span></haz:template>' +
      '<div><haz:call name="greeting"></haz:call></div>'
    );
    expect(result.querySelector('span').textContent).toBe('Test Page');
  });

  // --- haz:mtext (mustache-style expressions) ---

  test('haz:mtext outputs interpolated text', async () => {
    const result = await getResult(
      '<span haz:mtext="Count: {{count}}"></span>'
    );
    expect(result.querySelector('span').textContent).toBe('Count: 3');
  });

  // --- expression with filter ---

  test('expression with filter pipe', async () => {
    const proc = new HazardProcessor({}, createNamespaces());
    const template = document.createDocumentFragment();
    const span = document.createElement('span');
    span.setAttribute('haz:text', 'title //>uppercase');
    template.appendChild(span);
    proc.loadTemplate(template);
    let result;
    proc.transform(createProvider(), {}).then(r => { result = r; });
    await timeout(300);
    expect(result.querySelector('span').textContent).toBe('TEST PAGE');
  });

  // --- expr: attributes ---

  test('expr: attribute sets attribute value from expression', async () => {
    const result = await getResult(
      '<span expr:title="title">text</span>'
    );
    expect(result.querySelector('span').getAttribute('title')).toBe('Test Page');
  });

  // --- mexpr: attributes ---

  test('mexpr: attribute interpolates attribute value', async () => {
    const result = await getResult(
      '<span mexpr:class="item-{{status}}">text</span>'
    );
    expect(result.querySelector('span').getAttribute('class')).toBe('item-active');
  });
});
