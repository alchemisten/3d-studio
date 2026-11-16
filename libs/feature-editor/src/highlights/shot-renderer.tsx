import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector4 } from 'three';
import { useViewer } from '@schablone/3d-studio-core';
import type { Highlight } from '@schablone/3d-studio-feature-highlights';
import { type ResolveAnchor, surfacePoint } from './highlight-draft';
import { highlightEditorStateOf, patchHighlightEditorState } from './highlight-editor-state';

const WIDTH = 320;

const toDataUrl = (pixels: Uint8Array, width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A 2D canvas context is required to render shot previews.');
  const image = context.createImageData(width, height);
  const row = width * 4;
  for (let y = 0; y < height; y += 1) {
    image.data.set(pixels.subarray((height - 1 - y) * row, (height - y) * row), y * row);
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
};

export interface ShotRendererProps {
  highlights: readonly Highlight[];
  resolve: ResolveAnchor;
}

/**
 * Renders the shot of each highlight into an image, once per change of the shot or the model's materials,
 * one shot per frame and without the editor's helpers. It draws into a corner of the canvas before the
 * frame itself is drawn over it, so the image has the viewer's tone mapping. The shot is taken with a copy
 * of the viewer's camera at the stage's aspect, so it frames exactly what looking through shows. The images
 * feed the list and the preview.
 */
export const ShotRenderer = ({ highlights, resolve }: ShotRendererProps) => {
  const viewer = useViewer();
  const size = useThree((state) => state.size);
  const [revision, setRevision] = useState(0);
  const rendered = useRef(new Map<string, string>());
  const height = Math.max(1, Math.round((WIDTH * size.height) / Math.max(1, size.width)));

  useEffect(() => {
    const changes = viewer.on$('model:materials-changed').subscribe(() => setRevision((current) => current + 1));
    return () => changes.unsubscribe();
  }, [viewer]);

  useFrame(({ gl, scene, camera }) => {
    if (viewer.getState().status !== 'ready' || !(camera instanceof PerspectiveCamera)) return;
    const signatureOf = (highlight: Highlight) => JSON.stringify([highlight.camera, revision, height]);
    const due = highlights.find(
      (highlight) => highlight.camera && rendered.current.get(highlight.id) !== signatureOf(highlight),
    );
    const { shots } = highlightEditorStateOf(viewer.getState());
    const stale = Object.keys(shots).filter(
      (id) => !highlights.some((highlight) => highlight.id === id && highlight.camera),
    );
    if (!due?.camera) {
      if (stale.length) {
        stale.forEach((id) => rendered.current.delete(id));
        patchHighlightEditorState(viewer, {
          shots: Object.fromEntries(Object.entries(shots).filter(([id]) => !stale.includes(id))),
        });
      }
      return;
    }
    const context = gl.getContext();
    if (context.drawingBufferWidth < WIDTH || context.drawingBufferHeight < height) return;
    const shot = camera.clone();
    shot.fov = due.camera.fov ?? camera.fov;
    shot.aspect = WIDTH / height;
    shot.position.fromArray(due.camera.position);
    shot.lookAt(...(due.camera.target ?? surfacePoint(due, resolve)));
    shot.updateProjectionMatrix();
    shot.updateMatrixWorld(true);
    const helpers = scene.children.filter((child) => child.userData.dsEditorHelper && child.visible);
    const pixels = new Uint8Array(WIDTH * height * 4);
    const viewport = gl.getViewport(new Vector4());
    const ratio = gl.getPixelRatio();
    helpers.forEach((helper) => {
      helper.visible = false;
    });
    gl.setViewport(0, 0, WIDTH / ratio, height / ratio);
    gl.render(scene, shot);
    context.readPixels(0, 0, WIDTH, height, context.RGBA, context.UNSIGNED_BYTE, pixels);
    gl.setViewport(viewport);
    helpers.forEach((helper) => {
      helper.visible = true;
    });
    rendered.current.set(due.id, signatureOf(due));
    patchHighlightEditorState(viewer, { shots: { ...shots, [due.id]: toDataUrl(pixels, WIDTH, height) } });
  });

  return null;
};
