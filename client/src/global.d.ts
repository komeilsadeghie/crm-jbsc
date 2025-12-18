// This file extends global React namespace for type definitions
// Import React types directly from react package
import type { 
  MouseEvent as ReactMouseEvent,
  FormEvent as ReactFormEvent,
  ChangeEvent as ReactChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  SyntheticEvent as ReactSyntheticEvent,
  CSSProperties as ReactCSSProperties,
  ReactNode as ReactReactNode
} from 'react';

declare global {
  namespace React {
    type MouseEvent<T = Element> = ReactMouseEvent<T>;
    type FormEvent<T = Element> = ReactFormEvent<T>;
    type ChangeEvent<T = Element> = ReactChangeEvent<T>;
    type KeyboardEvent<T = Element> = ReactKeyboardEvent<T>;
    type SyntheticEvent<T = Element, E = Event> = ReactSyntheticEvent<T, E>;
    type CSSProperties = ReactCSSProperties;
    type ReactNode = ReactReactNode;
  }
}

