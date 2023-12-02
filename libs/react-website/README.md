# 3D Studio React Website

This package contains the React website for 3D Studio. It is implemented as a
React application to be used with minimal configuration.

## Usage

Make sure to include the polyfills in your application exactly once as
demonstrated in the example below:

```jsx
// Polyfills
import 'core-js/stable';
import 'reflect-metadata';
import 'regenerator-runtime/runtime';

import { Studio } from '@schablone/3d-studio-react-website';

const App = () => {
  return (
    <Studio baseURL="https://my.project.com" />
  );
};
```
