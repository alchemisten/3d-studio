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
import '@schablone/3d-studio-react-website/style.css';

const App = () => {
  return (
    <Studio baseURL="https://my.project.com" />
  );
};
```

### Router configuration

By default, the studio uses a browser router, which derives the current route
from the document url and optionally respects the `basename` config option. In
environments where the url can't be controlled, for example when the app is
loaded from a `file://` url or a custom protocol inside a native shell, a
memory router can be used instead:

```jsx
<Studio
  config={{
    baseUrl: 'https://my.project.com',
    router: {
      initialEntry: '/view/my-project-id',
      mode: 'memory',
    },
  }}
/>
```

| Option                 | Type                    | Default    | Description                                                    |
| ---------------------- | ----------------------- | ---------- | -------------------------------------------------------------- |
| `router.mode`          | `'browser' \| 'memory'` | `'browser'`| Router implementation to use.                                    |
| `router.initialEntry`  | `string`                | `'/'`      | Initial route for the memory router, e.g. `/view/my-project-id`. |

When the `router` option is omitted, the behaviour is unchanged.
