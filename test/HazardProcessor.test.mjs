import { describe, test, expect, beforeEach } from 'vitest';
import HazardProcessor from '../src/Meeko/HazardProcessor.mjs';
import CustomNamespace from '../src/Meeko/CustomNamespace.mjs';

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
  return { source: sourceData };
}

function loadAndTransform(templateHTML, details) {
  const proc = new HazardProcessor({}, createNamespaces());
  const template = document.createElement('div');
  template.innerHTML = templateHTML;
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

  test('haz:text outputs text from JS expression', async () => {
    const result = await getResult('<span><haz:text select="root.title"></haz:text></span>');
    expect(result.querySelector('span').textContent).toBe('Test Page');
  });

  test('haz:text with nested path', async () => {
    const result = await getResult('<span><haz:text select="root.single.name"></haz:text></span>');
    expect(result.querySelector('span').textContent).toBe('only');
  });

  test('haz:text with template literal', async () => {
    const result = await getResult('<span><haz:text select="`Count: ${root.count}`"></haz:text></span>');
    expect(result.querySelector('span').textContent).toBe('Count: 3');
  });

  // --- haz:eval ---

  test('haz:eval outputs value as text when not a node', async () => {
    const result = await getResult('<div><haz:eval select="root.title"></haz:eval></div>');
    expect(result.querySelector('div').textContent).toBe('Test Page');
  });

  test('haz:eval renders fallback children when expression is null', async () => {
    const result = await getResult(
      '<div><haz:eval select="root.missing"><span class="fallback">not found</span></haz:eval></div>'
    );
    expect(result.querySelector('.fallback')).not.toBeNull();
    expect(result.querySelector('.fallback').textContent).toBe('not found');
  });

  test('haz:eval renders fallback children when expression is undefined', async () => {
    const result = await getResult(
      '<div><haz:eval select="root.nope"><p>fallback</p></haz:eval></div>'
    );
    expect(result.querySelector('p').textContent).toBe('fallback');
  });

  test('haz:eval does NOT render fallback when expression has value', async () => {
    const result = await getResult(
      '<div><haz:eval select="root.title"><span class="fallback">should not appear</span></haz:eval></div>'
    );
    expect(result.querySelector('.fallback')).toBeNull();
    expect(result.querySelector('div').textContent).toBe('Test Page');
  });

  test('haz:eval renders fallback on expression error', async () => {
    const result = await getResult(
      '<div><haz:eval select="root.foo.bar.baz"><span>error fallback</span></haz:eval></div>'
    );
    expect(result.querySelector('span').textContent).toBe('error fallback');
  });

  // --- haz:if ---

  test('haz:if includes children when truthy', async () => {
    const result = await getResult('<haz:if test="root.visible"><span>yes</span></haz:if>');
    expect(result.querySelector('span')).not.toBeNull();
  });

  test('haz:if excludes children when falsy', async () => {
    const result = await getResult('<haz:if test="root.hidden"><span>no</span></haz:if>');
    expect(result.querySelector('span')).toBeNull();
  });

  test('haz:if with empty string is falsy', async () => {
    const result = await getResult('<haz:if test="root.empty"><span>yes</span></haz:if>');
    expect(result.querySelector('span')).toBeNull();
  });

  test('haz:if with comparison expression', async () => {
    const result = await getResult('<haz:if test="root.count > 2"><span>yes</span></haz:if>');
    expect(result.querySelector('span')).not.toBeNull();
  });

  // --- haz:unless ---

  test('haz:unless includes children when falsy', async () => {
    const result = await getResult('<haz:unless test="root.hidden"><span>yes</span></haz:unless>');
    expect(result.querySelector('span')).not.toBeNull();
  });

  test('haz:unless excludes children when truthy', async () => {
    const result = await getResult('<haz:unless test="root.visible"><span>no</span></haz:unless>');
    expect(result.querySelector('span')).toBeNull();
  });

  // --- haz:each ---

  test('haz:each iterates over array with @as', async () => {
    const result = await getResult(
      '<ul><haz:each select="root.items" as="item"><li><haz:text select="item.name"></haz:text></li></haz:each></ul>'
    );
    const lis = result.querySelectorAll('li');
    expect(lis).toHaveLength(3);
    expect(lis[0].textContent).toBe('alpha');
    expect(lis[1].textContent).toBe('bravo');
    expect(lis[2].textContent).toBe('charlie');
  });

  test('haz:each with missing value produces no output', async () => {
    const result = await getResult(
      '<ul><haz:each select="root.missing" as="item"><li>x</li></haz:each></ul>'
    );
    expect(result.querySelectorAll('li')).toHaveLength(0);
  });

  test('haz:each with JS expression', async () => {
    const result = await getResult(
      '<ul><haz:each select="root.items.filter(i => i.value > 1)" as="item"><li><haz:text select="item.name"></haz:text></li></haz:each></ul>'
    );
    const lis = result.querySelectorAll('li');
    expect(lis).toHaveLength(2);
    expect(lis[0].textContent).toBe('bravo');
  });

  // --- haz:one ---

  test('haz:one selects single item with @as', async () => {
    const result = await getResult(
      '<haz:one select="root.single" as="s"><span><haz:text select="s.name"></haz:text></span></haz:one>'
    );
    expect(result.querySelector('span').textContent).toBe('only');
  });

  test('haz:one with missing value produces no output', async () => {
    const result = await getResult(
      '<haz:one select="root.missing" as="m"><span>x</span></haz:one>'
    );
    expect(result.querySelector('span')).toBeNull();
  });

  // --- haz:var ---

  test('haz:var sets a variable usable in subsequent elements', async () => {
    const result = await getResult(
      '<div>' +
        '<haz:var name="myTitle" select="root.title"></haz:var>' +
        '<span><haz:text select="myTitle"></haz:text></span>' +
      '</div>'
    );
    const span = result.querySelector('span');
    expect(span).not.toBeNull();
    expect(span.textContent).toBe('Test Page');
  });

  test('haz:var with computed value', async () => {
    const result = await getResult(
      '<div>' +
        '<haz:var name="doubled" select="root.count * 2"></haz:var>' +
        '<span><haz:text select="doubled"></haz:text></span>' +
      '</div>'
    );
    expect(result.querySelector('span').textContent).toBe('6');
  });

  // --- haz:choose / haz:when / haz:otherwise ---

  test('haz:choose selects matching haz:when', async () => {
    const result = await getResult(
      '<haz:choose>' +
        '<haz:when test="root.hidden"><span>wrong</span></haz:when>' +
        '<haz:when test="root.visible"><span>right</span></haz:when>' +
        '<haz:otherwise><span>default</span></haz:otherwise>' +
      '</haz:choose>'
    );
    expect(result.querySelector('span').textContent).toBe('right');
  });

  test('haz:choose falls back to haz:otherwise', async () => {
    const result = await getResult(
      '<haz:choose>' +
        '<haz:when test="root.hidden"><span>wrong</span></haz:when>' +
        '<haz:otherwise><span>default</span></haz:otherwise>' +
      '</haz:choose>'
    );
    expect(result.querySelector('span').textContent).toBe('default');
  });

  test('haz:choose with no match and no otherwise produces nothing', async () => {
    const result = await getResult(
      '<haz:choose>' +
        '<haz:when test="root.hidden"><span>wrong</span></haz:when>' +
      '</haz:choose>'
    );
    expect(result.querySelector('span')).toBeNull();
  });

  // --- haz:template / haz:call ---

  test('haz:call invokes a named template', async () => {
    const result = await getResult(
      '<haz:template name="greeting"><span><haz:text select="root.title"></haz:text></span></haz:template>' +
      '<div><haz:call name="greeting"></haz:call></div>'
    );
    expect(result.querySelector('span').textContent).toBe('Test Page');
  });

  test('haz:call passes params to template', async () => {
    const result = await getResult(
      '<haz:template name="card"><span><haz:text select="name"></haz:text></span></haz:template>' +
      '<div><haz:call name="card"><haz:param name="name" select="root.title"></haz:param></haz:call></div>'
    );
    expect(result.querySelector('span').textContent).toBe('Test Page');
  });

  test('haz:call with multiple params', async () => {
    const result = await getResult(
      '<haz:template name="badge"><span><haz:text select="`${label}: ${value}`"></haz:text></span></haz:template>' +
      '<div><haz:call name="badge">' +
        '<haz:param name="label" select="root.label"></haz:param>' +
        '<haz:param name="value" select="root.count"></haz:param>' +
      '</haz:call></div>'
    );
    expect(result.querySelector('span').textContent).toBe('item: 3');
  });

  test('haz:call params do not leak to outer scope', async () => {
    const result = await getResult(
      '<haz:template name="inner"><haz:text select="secret"></haz:text></haz:template>' +
      '<div>' +
        '<haz:call name="inner"><haz:param name="secret" select="\'hidden\'"></haz:param></haz:call>' +
        '<span><haz:text select="secret"></haz:text></span>' +
      '</div>'
    );
    // secret should be undefined outside the call
    expect(result.querySelector('span').textContent).toBe('');
  });

  // --- ${} attribute expressions ---

  test('${} attribute sets value from JS expression', async () => {
    const result = await getResult(
      '<span title="${root.title}">text</span>'
    );
    expect(result.querySelector('span').getAttribute('title')).toBe('Test Page');
  });

  test('${} attribute removes attribute when undefined', async () => {
    const result = await getResult(
      '<span title="${root.missing}">text</span>'
    );
    expect(result.querySelector('span').hasAttribute('title')).toBe(false);
  });

  test('${} on src attribute does not trigger fetch of literal expression', async () => {
    const result = await getResult(
      '<img src="${root.title}">'
    );
    // src should be the evaluated value, not the literal "${root.title}"
    expect(result.querySelector('img').getAttribute('src')).toBe('Test Page');
  });

  test('${} on href attribute evaluates correctly', async () => {
    const result = await getResult(
      '<a href="${root.status}">link</a>'
    );
    expect(result.querySelector('a').getAttribute('href')).toBe('active');
  });

  test('backtick on src attribute evaluates correctly', async () => {
    const result = await getResult(
      '<img src="`/images/${root.status}.png`">'
    );
    expect(result.querySelector('img').getAttribute('src')).toBe('/images/active.png');
  });

  // --- backtick attribute expressions ---

  test('backtick attribute interpolates value', async () => {
    const result = await getResult(
      '<span class="`item-${root.status}`">text</span>'
    );
    expect(result.querySelector('span').getAttribute('class')).toBe('item-active');
  });

  test('backtick attribute with multiple interpolations', async () => {
    const result = await getResult(
      '<span title="`${root.label}: ${root.count} items`">text</span>'
    );
    expect(result.querySelector('span').getAttribute('title')).toBe('item: 3 items');
  });

  // --- ${} content expressions ---

  test('${} as sole element content evaluates expression as text', async () => {
    const result = await getResult('<span>${root.title}</span>');
    expect(result.querySelector('span').textContent).toBe('Test Page');
  });

  test('${} content with method call', async () => {
    const result = await getResult('<span>${root.title.toUpperCase()}</span>');
    expect(result.querySelector('span').textContent).toBe('TEST PAGE');
  });

  test('${} content with numeric value', async () => {
    const result = await getResult('<span>${root.count}</span>');
    expect(result.querySelector('span').textContent).toBe('3');
  });

  test('${} content that evaluates to undefined produces empty', async () => {
    const result = await getResult('<span>${root.missing}</span>');
    expect(result.querySelector('span').textContent).toBe('');
  });

  // --- backtick content expressions ---

  test('backtick as sole element content evaluates template literal', async () => {
    const result = await getResult('<span>`Hello ${root.title}`</span>');
    expect(result.querySelector('span').textContent).toBe('Hello Test Page');
  });

  test('backtick content with multiple interpolations', async () => {
    const result = await getResult('<span>`${root.count} ${root.label} items`</span>');
    expect(result.querySelector('span').textContent).toBe('3 item items');
  });

  // --- negative tests: content expressions should NOT evaluate when mixed ---

  test('${} with leading text is treated as literal', async () => {
    const result = await getResult('<span>prefix ${root.title}</span>');
    expect(result.querySelector('span').textContent).toBe('prefix ${root.title}');
  });

  test('${} with trailing text is treated as literal', async () => {
    const result = await getResult('<span>${root.title} suffix</span>');
    expect(result.querySelector('span').textContent).toBe('${root.title} suffix');
  });

  test('${} with child elements is treated as literal', async () => {
    const result = await getResult('<div>${root.title}<span>child</span></div>');
    const div = result.querySelector('div');
    expect(div.querySelector('span').textContent).toBe('child');
    expect(div.textContent).toContain('${root.title}');
  });

  test('backtick with leading text is treated as literal', async () => {
    const result = await getResult('<span>prefix `Hello ${root.title}`</span>');
    expect(result.querySelector('span').textContent).toBe('prefix `Hello ${root.title}`');
  });

  test('backtick with trailing text is treated as literal', async () => {
    const result = await getResult('<span>`Hello ${root.title}` suffix</span>');
    expect(result.querySelector('span').textContent).toBe('`Hello ${root.title}` suffix');
  });

  test('backtick with child elements is treated as literal', async () => {
    const result = await getResult('<div>`Hello ${root.title}`<span>child</span></div>');
    const div = result.querySelector('div');
    expect(div.querySelector('span').textContent).toBe('child');
    expect(div.textContent).toContain('`Hello ${root.title}`');
  });

  // --- custom functions in scope ---

  test('custom function passed via details is available in expressions', async () => {
    const result = await getResult(
      '<span><haz:text select="upper(root.title)"></haz:text></span>',
      { upper: (s) => s.toUpperCase() }
    );
    expect(result.querySelector('span').textContent).toBe('TEST PAGE');
  });

});

// --- DOM source tests ---

describe('HazardProcessor with DOM source', () => {

  function createDOMProvider(html) {
    let doc = document.implementation.createHTMLDocument('');
    doc.body.innerHTML = html;
    return { source: doc };
  }

  function createElementProvider(html) {
    let el = document.createElement('div');
    el.innerHTML = html;
    return { source: el };
  }

  function loadAndTransformDOM(templateHTML, provider, details) {
    const proc = new HazardProcessor({}, createNamespaces());
    const template = document.createElement('div');
    template.innerHTML = templateHTML;
    proc.loadTemplate(template);
    return proc.transform(provider, details || {});
  }

  function getResultDOM(templateHTML, provider, details) {
    let result;
    loadAndTransformDOM(templateHTML, provider, details)
      .then(r => { result = r; })
      .catch(e => { result = e; });
    return timeout(300).then(() => result);
  }

  test('access Document title', async () => {
    let provider = createDOMProvider('<h1>Page Title</h1>');
    const result = await getResultDOM(
      '<span><haz:text select="root.querySelector(\'h1\').textContent"></haz:text></span>',
      provider
    );
    expect(result.querySelector('span').textContent).toBe('Page Title');
  });

  test('querySelector on document body', async () => {
    let provider = createDOMProvider('<p class="intro">Hello</p><p>World</p>');
    const result = await getResultDOM(
      '<span><haz:text select="root.querySelector(\'.intro\').textContent"></haz:text></span>',
      provider
    );
    expect(result.querySelector('span').textContent).toBe('Hello');
  });

  test('querySelectorAll with haz:each', async () => {
    let provider = createDOMProvider('<ul><li>a</li><li>b</li><li>c</li></ul>');
    const result = await getResultDOM(
      '<haz:each select="[...root.querySelectorAll(\'li\')]" as="item"><span><haz:text select="item.textContent"></haz:text></span></haz:each>',
      provider
    );
    const spans = result.querySelectorAll('span');
    expect(spans).toHaveLength(3);
    expect(spans[0].textContent).toBe('a');
    expect(spans[1].textContent).toBe('b');
    expect(spans[2].textContent).toBe('c');
  });

  test('getAttribute from DOM element', async () => {
    let provider = createElementProvider('<a href="/page" title="My Page">link</a>');
    const result = await getResultDOM(
      '<span><haz:text select="root.querySelector(\'a\').getAttribute(\'href\')"></haz:text></span>',
      provider
    );
    expect(result.querySelector('span').textContent).toBe('/page');
  });

  test('${} attribute with DOM source', async () => {
    let provider = createElementProvider('<img src="/photo.jpg" alt="Photo">');
    const result = await getResultDOM(
      '<a href="${root.querySelector(\'img\').src}">link</a>',
      provider
    );
    expect(result.querySelector('a').getAttribute('href')).toContain('/photo.jpg');
  });

  test('haz:if with DOM source - element exists', async () => {
    let provider = createDOMProvider('<div class="error">Something went wrong</div>');
    const result = await getResultDOM(
      '<haz:if test="root.querySelector(\'.error\')"><span>has error</span></haz:if>',
      provider
    );
    expect(result.querySelector('span')).not.toBeNull();
  });

  test('haz:if with DOM source - element does not exist', async () => {
    let provider = createDOMProvider('<div class="success">All good</div>');
    const result = await getResultDOM(
      '<haz:if test="root.querySelector(\'.error\')"><span>has error</span></haz:if>',
      provider
    );
    expect(result.querySelector('span')).toBeNull();
  });

  test('optional chaining with missing element', async () => {
    let provider = createDOMProvider('<p>hello</p>');
    const result = await getResultDOM(
      '<span><haz:text select="root.querySelector(\'h1\')?.textContent ?? \'no title\'"></haz:text></span>',
      provider
    );
    expect(result.querySelector('span').textContent).toBe('no title');
  });

  test('haz:one with DOM element', async () => {
    let provider = createElementProvider('<article><h2>Title</h2><p>Body</p></article>');
    const result = await getResultDOM(
      '<haz:one select="root.querySelector(\'article\')" as="article"><h1><haz:text select="article.querySelector(\'h2\').textContent"></haz:text></h1></haz:one>',
      provider
    );
    expect(result.querySelector('h1').textContent).toBe('Title');
  });

  test('children count with DOM', async () => {
    let provider = createElementProvider('<ul><li>1</li><li>2</li><li>3</li><li>4</li></ul>');
    const result = await getResultDOM(
      '<span><haz:text select="root.querySelectorAll(\'li\').length"></haz:text></span>',
      provider
    );
    expect(result.querySelector('span').textContent).toBe('4');
  });

});

/*
  These tests verify that IE11/Edge-specific workarounds in HazardProcessor are
  unnecessary on modern browsers.
*/
const FRAGMENTS_ARE_INERT = !(window.HTMLUnknownElement &&
    'runtimeStyle' in window.HTMLUnknownElement.prototype);

const PERFORMANCE_UNFRIENDLY_CONDITIONS = [
  { tag: '*', attr: 'style', description: 'an element with @style' },
  { tag: 'li', attr: 'value', description: 'a <li> element with @value' },
  { tag: undefined, description: 'an unknown or custom element' }
];

describe('modern browser assumptions', () => {

  test('FRAGMENTS_ARE_INERT is true', () => {
    expect(FRAGMENTS_ARE_INERT).toBe(true);
  });

  test('HTMLUnknownElement does not have runtimeStyle', () => {
    expect('runtimeStyle' in HTMLUnknownElement.prototype).toBe(false);
  });

  test('fragments safely handle all PERFORMANCE_UNFRIENDLY_CONDITIONS', () => {
    for (const cond of PERFORMANCE_UNFRIENDLY_CONDITIONS) {
      const frag = document.createDocumentFragment();
      let el;
      if (cond.tag === undefined) {
        el = document.createElement('my-custom-element');
      } else {
        el = document.createElement(cond.tag === '*' ? 'div' : cond.tag);
      }
      if (cond.attr) el.setAttribute(cond.attr, 'test');
      frag.appendChild(el);
      expect(frag.childNodes.length).toBe(1);
    }
  });

  test('fragment operations with risky elements are not slower than baseline', () => {
    const iterations = 1000;

    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const frag = document.createDocumentFragment();
      const el = document.createElement('div');
      frag.appendChild(el);
    }
    const baseline = Math.max(performance.now() - t0, 1);

    const t1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const frag = document.createDocumentFragment();
      const el = document.createElement('my-custom-element');
      el.setAttribute('style', 'color: red;');
      frag.appendChild(el);
    }
    const customStyled = Math.max(performance.now() - t1, 1);

    const t2 = performance.now();
    for (let i = 0; i < iterations; i++) {
      const frag = document.createDocumentFragment();
      const el = document.createElement('li');
      el.setAttribute('value', 'NaN');
      frag.appendChild(el);
    }
    const liValue = Math.max(performance.now() - t2, 1);

    expect(customStyled).toBeLessThan(baseline * 10);
    expect(liValue).toBeLessThan(baseline * 10);
  });

});
