import React, { useEffect, useRef } from 'react';
import { animate } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  formatter: (v: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, formatter, className }: AnimatedNumberProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (prevValue.current === value) {
      node.textContent = formatter(value);
      return;
    }

    const controls = animate(prevValue.current, value, {
      duration: 0.5,
      ease: "easeOut",
      onUpdate: (v) => {
        if (node) node.textContent = formatter(v);
      }
    });

    prevValue.current = value;

    return () => controls.stop();
  }, [value, formatter]);

  return <span className={className} ref={nodeRef}>{formatter(value)}</span>;
}
