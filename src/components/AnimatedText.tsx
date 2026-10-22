import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export function AnimatedText({
  text,
  children,
  className = '',
}: {
  text: string;
  children?: ReactNode;
  className?: string;
}) {
  const previous = useRef({ text, content: children ?? text });
  const [outgoing, setOutgoing] = useState<{ content: ReactNode } | null>(null);
  useLayoutEffect(() => {
    if (previous.current.text === text) {
      previous.current.content = children ?? text;
      return;
    }
    setOutgoing({ content: previous.current.content });
    previous.current = { text, content: children ?? text };
    const timer = window.setTimeout(() => setOutgoing(null), 200);
    return () => window.clearTimeout(timer);
  }, [text]);
  return (
    <span className={`animated-text ${className}`}>
      {outgoing && (
        <span className="animated-text-outgoing" aria-hidden="true">
          {outgoing.content}
        </span>
      )}
      <span key={text} className="animated-text-current">
        {children ?? text}
      </span>
    </span>
  );
}

export function AnimatedHeading({ text }: { text: string }) {
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span key={text} className="motion-heading" aria-hidden="true">
        {text.split(/(\s+)/).map((word, index) =>
          /\s/.test(word) ? (
            word
          ) : (
            <span
              key={index}
              style={{ '--word-delay': `${Math.min(index * 18, 100)}ms` } as CSSProperties}
            >
              {word}
            </span>
          ),
        )}
      </span>
    </>
  );
}
