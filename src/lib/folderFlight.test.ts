/** Protects frozen artwork, unique SVG references and inaccessible viewport layers without launching a browser; depends on a minimal DOM fixture. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFolderFlight } from './folderFlight';

class ArtworkElement {
  attributesMap = new Map<string, string>();
  children: ArtworkElement[] = [];
  inert = false;
  className = '';
  computed: Record<string, string> = {
    transform: 'matrix(1,0,0,1,0,0)',
    '--category-accent': '#bad689',
  };
  style: Record<string, string>;
  constructor(attributes: Record<string, string> = {}) {
    Object.entries(attributes).forEach(([key, value]) => this.attributesMap.set(key, value));
    const attributesMap = this.attributesMap;
    this.style = {
      get cssText() {
        return attributesMap.get('style') ?? '';
      },
      set cssText(value) {
        attributesMap.set('style', value);
      },
    };
  }
  get id() {
    return this.attributesMap.get('id') ?? '';
  }
  set id(value: string) {
    this.attributesMap.set('id', value);
  }
  get attributes() {
    return Array.from(this.attributesMap, ([name, value]) => ({ name, value }));
  }
  setAttribute(name: string, value: string) {
    this.attributesMap.set(name, value);
  }
  removeAttribute(name: string) {
    this.attributesMap.delete(name);
  }
  append(child: ArtworkElement) {
    this.children.push(child);
  }
  querySelectorAll(): ArtworkElement[] {
    return this.children.flatMap((child) => [child, ...child.querySelectorAll()]);
  }
  getBoundingClientRect() {
    return { left: 42, top: 80, width: 400, height: 300 };
  }
  cloneNode(): ArtworkElement {
    const copy = new ArtworkElement(Object.fromEntries(this.attributesMap));
    copy.children = this.children.map((child) => child.cloneNode());
    return copy;
  }
}
function fixture() {
  const source = new ArtworkElement();
  const outline = new ArtworkElement({ id: 'pocket' });
  const front = new ArtworkElement({
    'clip-path': 'url(#pocket)',
    autofocus: '',
    'aria-controls': 'document',
  });
  front.computed = { 'clip-path': 'url("#pocket")', '--folder-pocket-open': '0.7' };
  source.children = [outline, front];
  const body = new ArtworkElement();
  vi.stubGlobal('document', { body, createElement: () => new ArtworkElement() });
  vi.stubGlobal('getComputedStyle', (element: ArtworkElement) =>
    Object.assign(Object.keys(element.computed), {
      getPropertyValue: (property: string) => element.computed[property],
      perspective: '1400px',
      perspectiveOrigin: '200px 150px',
    }),
  );
  return { source, outline, front, body };
}
afterEach(() => vi.unstubAllGlobals());

describe('frozen folder layers', () => {
  it('copies inherited material and pocket state, remaps every SVG reference, and leaves the source untouched', () => {
    const { source, outline, front, body } = fixture();
    const layer = createFolderFlight(source as unknown as HTMLElement) as unknown as ArtworkElement;
    const clone = layer.children[0];
    expect(clone.style.cssText).toContain('--category-accent:#bad689');
    expect(clone.children[1].style.cssText).toContain('--folder-pocket-open:0.7');
    const clonedId = clone.children[0].id;
    expect(clonedId).not.toBe('pocket');
    expect(clone.children[1].attributesMap.get('clip-path')).toBe(`url(#${clonedId})`);
    expect(clone.children[1].style.cssText).toContain(`#${clonedId}`);
    expect(clone.children[1].attributesMap.has('autofocus')).toBe(false);
    expect(clone.children[1].attributesMap.has('aria-controls')).toBe(false);
    expect(clone.children[1].style.animation).toBe('none');
    expect(outline.id).toBe('pocket');
    expect(front.attributesMap.get('clip-path')).toBe('url(#pocket)');
    expect(layer.inert).toBe(true);
    expect(layer.attributesMap.get('aria-hidden')).toBe('true');
    expect(layer.style.pointerEvents).toBe('none');
    expect(layer.style.zIndex).toBe('9');
    expect(body.children).toEqual([layer]);
  });
  it('preserves the carousel perspective host and native slot transform', () => {
    const { source } = fixture();
    const stage = new ArtworkElement();
    const layer = createFolderFlight(
      source as unknown as HTMLElement,
      stage as unknown as HTMLElement,
    ) as unknown as ArtworkElement;
    expect(layer.style.perspective).toBe('1400px');
    expect(layer.style.left).toBe('42px');
    expect(layer.children[0].style.cssText).toContain('transform:matrix(1,0,0,1,0,0)');
    expect(layer.children[0].style.transform).toBeUndefined();
  });
  it('assigns independent SVG IDs to simultaneous copies', () => {
    const { source } = fixture();
    const first = createFolderFlight(source as unknown as HTMLElement) as unknown as ArtworkElement;
    const second = createFolderFlight(
      source as unknown as HTMLElement,
    ) as unknown as ArtworkElement;
    expect(first.children[0].children[0].id).not.toBe(second.children[0].children[0].id);
  });
});
