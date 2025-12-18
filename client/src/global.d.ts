/// <reference types="react" />

import * as ReactTypes from 'react';

declare global {
  namespace React {
    type MouseEvent<T = Element> = ReactTypes.MouseEvent<T>;
    type FormEvent<T = Element> = ReactTypes.FormEvent<T>;
    type ChangeEvent<T = Element> = ReactTypes.ChangeEvent<T>;
    type KeyboardEvent<T = Element> = ReactTypes.KeyboardEvent<T>;
    type SyntheticEvent<T = Element, E = Event> = ReactTypes.SyntheticEvent<T, E>;
    type CSSProperties = ReactTypes.CSSProperties;
    type ReactNode = ReactTypes.ReactNode;
  }
}

