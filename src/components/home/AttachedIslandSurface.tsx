import { useLayoutEffect, useRef } from 'react';

interface SurfaceDimensions {
  width: number;
  height: number;
  shoulderRadius: number;
  cornerRadius: number;
}

function createSurfaceOutline({ width, height, shoulderRadius, cornerRadius }: SurfaceDimensions) {
  const left = shoulderRadius;
  const right = left + width;
  const fullWidth = right + shoulderRadius;
  const curveControl = shoulderRadius * 0.55228475;

  // Extend the shared top edge above the clip boundary so antialiasing cannot expose a hairline.

  return `M0 -1H${fullWidth}V0
    C${fullWidth - curveControl} 0 ${right} ${shoulderRadius - curveControl} ${right} ${shoulderRadius}
    V${height - cornerRadius}Q${right} ${height} ${right - cornerRadius} ${height}
    H${left + cornerRadius}Q${left} ${height} ${left} ${height - cornerRadius}
    V${shoulderRadius}C${left} ${shoulderRadius - curveControl} ${curveControl} 0 0 0Z`;
}

const initialDimensions: SurfaceDimensions = {
  width: 300,
  height: 44,
  shoulderRadius: 14,
  cornerRadius: 18,
};

export function AttachedIslandSurface() {
  const shapeRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const shape = shapeRef.current!;
    const island = shape.closest<HTMLElement>('.ai-activity-island')!;
    function updateOutline() {
      const styles = getComputedStyle(island);
      const width = island.getBoundingClientRect().width;
      const height = island.offsetHeight;
      const shoulderRadius =
        Number.parseFloat(styles.getPropertyValue('--island-shoulder-radius')) || 14;
      const cornerRadius = Number.parseFloat(styles.borderBottomLeftRadius) || 18;
      shape.setAttribute('viewBox', `0 0 ${width + shoulderRadius * 2} ${height}`);
      shape
        .querySelector('path')!
        .setAttribute('d', createSurfaceOutline({ width, height, shoulderRadius, cornerRadius }));
    }

    // Observe the actual animated width without retargeting the width tween from its own resize events.

    updateOutline();
    const observer = new ResizeObserver(updateOutline);
    observer.observe(island);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="island-surface" aria-hidden="true">
      <svg ref={shapeRef} className="island-surface-shape" viewBox="0 0 328 44">
        <path d={createSurfaceOutline(initialDimensions)} fill="currentColor" />
      </svg>
    </div>
  );
}
