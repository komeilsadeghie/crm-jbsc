// This file extends global React namespace for type definitions
// Import React types directly from react package
import type { 
  MouseEvent as ReactMouseEvent,
  FormEvent as ReactFormEvent,
  ChangeEvent as ReactChangeEvent,
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  SyntheticEvent as ReactSyntheticEvent,
  CSSProperties as ReactCSSProperties,
  ReactNode as ReactReactNode,
  FC as ReactFC
} from 'react';
import type { Key as ReactKey } from 'react';

declare global {
  namespace React {
    type MouseEvent<T = Element> = ReactMouseEvent<T>;
    type FormEvent<T = Element> = ReactFormEvent<T>;
    type ChangeEvent<T = Element> = ReactChangeEvent<T>;
    type DragEvent<T = Element> = ReactDragEvent<T>;
    type KeyboardEvent<T = Element> = ReactKeyboardEvent<T>;
    type SyntheticEvent<T = Element, E = Event> = ReactSyntheticEvent<T, E>;
    type CSSProperties = ReactCSSProperties;
    type ReactNode = ReactReactNode;
    type FC<P = {}> = ReactFC<P>;
    type Key = ReactKey;
  }
}

