/** Shares the established island text transition across operations; depends on React lifecycle cleanup and island text CSS. */
import { useLayoutEffect, useRef, useState } from 'react';

export function IslandActivityText({ text }: { text: string }) {
  const previousText = useRef(text);
  const [outgoingText, setOutgoingText] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (previousText.current === text) return;
    setOutgoingText(previousText.current);
    previousText.current = text;
    const timer = window.setTimeout(() => setOutgoingText(null), 340);
    return () => window.clearTimeout(timer);
  }, [text]);
  return (
    <span className="island-text-transition">
      {outgoingText && (
        <span className="island-text-outgoing" aria-hidden="true">
          {outgoingText}
        </span>
      )}
      <span key={text} className="island-text-incoming">
        {text}
      </span>
    </span>
  );
}
