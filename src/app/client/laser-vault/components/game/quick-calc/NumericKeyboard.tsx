import React, { memo, useCallback } from 'react';

interface NumericKeyboardProps {
  onInput: (value: string) => void;
}

function NumericKeyboardComponent({ onInput }: NumericKeyboardProps) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫', '↵'];
  const handleClick = useCallback((key: string) => {
    onInput(key);
  }, [onInput]);

  return (
    <div className="grid grid-cols-3 gap-1 lg:gap-2 w-full">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => handleClick(key)}
          className="h-10 lg:h-14 rounded-lg lg:rounded-2xl border border-cyan-400/20 bg-white/5 text-sm lg:text-xl font-black text-white shadow-[0_0_12px_rgba(34,211,238,0.1)] transition-all hover:border-cyan-400/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] active:scale-95"
        >
          {key}
        </button>
      ))}
    </div>
  );
}

export const NumericKeyboard = memo(NumericKeyboardComponent);
