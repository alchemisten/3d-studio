# 3D Studio Viewer UI

This package contains a UI for the 3D Studio Viewer Core. It is implemented as a
React component library and can be used in any React application. The UI provides
interface elements for the viewer and the core features.

## Usage

```jsx
import { useEffect, useRef, useState } from 'react';
import { IViewer, ViewerLauncher } from '@alchemisten/3d-studio-viewer-core';
import { ViewerUI } from '@alchemisten/3d-studio-viewer-ui';

const App = () => {
  const viewerCanvas = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<IViewer>();
  const [launcher] = useState(new ViewerLauncher());

  useEffect(() => {
    if (!viewerCanvas.current) {
      return;
    }
    
    const config = {
      objects: [
        {
          path: 'path/to/object.gtlf'
        }
      ]
    };

    setViewer(launcher.createCanvasViewer(config, viewerCanvas.current));
  }, [launcher]);

  return (
    <div>
      <div ref={viewerCanvas} />
      <ViewerUI viewer={viewer} />
    </div>
  );
};
```
