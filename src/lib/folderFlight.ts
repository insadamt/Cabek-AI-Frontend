/**
 * Freezes a folder's rendered appearance in a viewport layer without duplicating interactive content or SVG IDs.
 * Depends on computed browser styles; perspective preserves carousel poses and a stationary island aperture masks both flight directions.
 */
let nextFlightId = 0;

export function createFolderFlight(source: HTMLElement, host: HTMLElement = source) {
  const bounds = host.getBoundingClientRect();
  const layer = document.createElement('div');
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = [source, ...source.querySelectorAll<HTMLElement>('*')];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>('*')];
  const idPrefix = `folder-flight-${++nextFlightId}-`;
  const ids = new Map<string, string>();
  originals.forEach((element) => {
    if (element.id) ids.set(element.id, idPrefix + element.id);
  });
  originals.forEach((element, index) => {
    const copy = copies[index];
    const styles = getComputedStyle(element);
    // Freeze inherited tokens and the pocket's current shape before pointer leave can change the source.
    copy.style.cssText = Array.from(styles)
      .map((property) => `${property}:${styles.getPropertyValue(property)};`)
      .join('');
    copy.style.animation = 'none';
    copy.style.transition = 'none';
    copy.removeAttribute('autofocus');
    copy.removeAttribute('aria-controls');
    if (copy.id) copy.id = ids.get(copy.id)!;
    for (const attribute of Array.from(copy.attributes)) {
      let value = attribute.value;
      ids.forEach((replacement, original) => {
        value = value.replaceAll(`#${original}`, `#${replacement}`);
      });
      if (value !== attribute.value) copy.setAttribute(attribute.name, value);
    }
  });
  Object.assign(layer.style, {
    position: 'fixed',
    left: `${bounds.left}px`,
    top: `${bounds.top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    zIndex: '9',
    pointerEvents: 'none',
    perspective: getComputedStyle(host).perspective,
    perspectiveOrigin: getComputedStyle(host).perspectiveOrigin,
  });
  if (host === source) {
    Object.assign(clone.style, {
      position: 'absolute',
      left: '0px',
      top: '0px',
      margin: '0px',
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      transform: 'none',
    });
  }
  layer.className = 'folder-flight-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  layer.append(clone);
  document.body.append(layer);
  return layer;
}

export function createIslandFolderFlight(
  source: HTMLElement,
  host: HTMLElement,
  islandBottom: number,
) {
  const flight = createFolderFlight(source, host);
  const aperture = document.createElement('div');

  // Prepare the moving compositor layer before its first visible frame.

  flight.style.willChange = 'transform';

  // Clip in viewport space so moving artwork cannot cross the island's face or escape above the frame.

  Object.assign(aperture.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '9',
    pointerEvents: 'none',
    clipPath: `inset(${Math.max(0, islandBottom)}px 0 0 0)`,
  });
  aperture.setAttribute('aria-hidden', 'true');
  aperture.inert = true;
  aperture.append(flight);
  document.body.append(aperture);
  let removed = false;
  return {
    flight,
    remove: () => {
      if (removed) return;
      removed = true;
      flight.remove();
      aperture.remove();
    },
  };
}
