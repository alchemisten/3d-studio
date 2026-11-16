import { useEffect, useMemo, useRef, useState } from 'react';
import { PivotControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { type Group, Matrix4, type Object3D, PerspectiveCamera, Vector3 } from 'three';
import { useFeature, useModelPick, useViewer, useViewerState } from '@schablone/3d-studio-core';
import { editorCameraOf, useCameraBridge, type Vec3 } from '../camera-bridge';
import { useEditor } from '../editor-context';
import { EDITOR_HELPER, PartOutline } from '../part-outline';
import { useHelperColor } from '../use-helper-color';
import { raycastModel } from '../viewport';
import { hotspotPoint, partOf, pointerLengthOf, surfacePoint } from './highlight-draft';
import { type HighlightEditorConfig, namedNodeOf } from './highlight-editor-state';
import { ShotRenderer } from './shot-renderer';
import { useHighlightEditor } from './use-highlight-editor';

const GIZMO_SIZE_PX = 110;
const FRUSTUM_DEPTH = 0.2;
const NEAR_SHOT = 1.5;

interface ShotFrustumProps {
  position: Vec3;
  target: Vec3;
  fov: number;
  aspect: number;
  /** How far the frustum is drawn from the camera; the rest of the way to the target is a faint line. */
  depth: number;
  color: string;
}

const toArray = (points: readonly Vector3[]): Float32Array =>
  new Float32Array(points.flatMap((point) => point.toArray()));

const frustumPoints = ({ position, target, fov, aspect, depth }: Omit<ShotFrustumProps, 'color'>) => {
  const apex = new Vector3(...position);
  const centre = new Vector3(...target);
  const forward = centre.clone().sub(apex);
  const distance = forward.length() || 1;
  forward.normalize();
  const right = forward.clone().cross(new Vector3(0, 1, 0));
  if (right.lengthSq() === 0) right.set(1, 0, 0);
  right.normalize();
  const up = right.clone().cross(forward);
  const reach = Math.min(distance, depth);
  const base = apex.clone().addScaledVector(forward, reach);
  const halfHeight = reach * Math.tan((fov * Math.PI) / 360);
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, y]) =>
    base
      .clone()
      .addScaledVector(right, x * halfHeight * aspect)
      .addScaledVector(up, y * halfHeight),
  );
  return {
    body: toArray(corners.flatMap((corner, index) => [apex, corner, corner, corners[(index + 1) % corners.length]])),
    sight: toArray([base, centre]),
  };
};

/**
 * The saved camera of a highlight: a small frustum at the camera, so it never fills the view, and a faint
 * line of sight to the target. It hides while the working camera sits at the shot itself.
 */
const ShotFrustum = ({ position: [px, py, pz], target: [tx, ty, tz], fov, aspect, depth, color }: ShotFrustumProps) => {
  const apex = useMemo(() => new Vector3(px, py, pz), [px, py, pz]);
  const { body, sight } = useMemo(
    () => frustumPoints({ position: [px, py, pz], target: [tx, ty, tz], fov, aspect, depth }),
    [px, py, pz, tx, ty, tz, fov, aspect, depth],
  );
  const group = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (group.current) group.current.visible = camera.position.distanceTo(apex) > depth * NEAR_SHOT;
  });
  return (
    <group ref={group} userData={EDITOR_HELPER} renderOrder={5}>
      <lineSegments key={body.join()}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[body, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={color} depthTest={false} transparent opacity={0.8} toneMapped={false} />
      </lineSegments>
      <lineSegments key={sight.join()}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sight, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={color} depthTest={false} transparent opacity={0.3} toneMapped={false} />
      </lineSegments>
    </group>
  );
};

/** The canvas side of the highlight editor: placing by click, the part outline, the gizmo and the shots. */
export const HighlightEditorScene = () => {
  const { config } = useFeature<HighlightEditorConfig>();
  const viewer = useViewer();
  const editor = useHighlightEditor(config);
  const { flush } = useEditor();
  const gltf = useViewerState((state) => state.gltf);
  const canvas = useThree((state) => state.gl.domElement);
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / Math.max(1, state.size.height));
  const get = useThree((state) => state.get);
  const [hovered, setHovered] = useState<Object3D>();
  const helperColor = useHelperColor();
  const { selected, mode, active, resolve } = editor;
  const picking = active && (mode === 'add' || ((mode === 'move-anchor' || mode === 'pick-part') && selected));
  useCameraBridge();

  useModelPick(
    picking
      ? ({ point, normal, object }) => {
          if (mode === 'add') {
            editor.addAt(point, normal);
          } else if (selected && mode === 'move-anchor') {
            editor.place(selected.id, point, normal);
            editor.setMode(undefined);
          } else if (selected) {
            editor.attachPart(selected.id, namedNodeOf(object));
            editor.setMode(undefined);
          }
        }
      : undefined,
  );

  const model = gltf?.scene;
  const hovering = active && mode === 'pick-part' && Boolean(selected);
  useEffect(() => {
    if (!hovering || !model) return undefined;
    const onMove = (event: PointerEvent) =>
      setHovered(raycastModel(get(), model, event.clientX, event.clientY)?.object);
    const onLeave = () => setHovered(undefined);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      setHovered(undefined);
    };
  }, [hovering, model, canvas, get]);

  const outlined = useMemo(() => (hovered ? [hovered] : []), [hovered]);
  const partName = active && selected ? partOf(selected) : undefined;
  const linked = useMemo(() => {
    const part = partName ? model?.getObjectByName(partName) : undefined;
    return part ? [part] : [];
  }, [partName, model]);
  const [endX, endY, endZ] = selected ? hotspotPoint(selected, resolve) : [0, 0, 0];
  const gizmoMatrix = useMemo(() => new Matrix4().setPosition(endX, endY, endZ), [endX, endY, endZ]);
  const shot = selected?.camera;
  const showsGizmo = active && mode === 'pointer' && selected && pointerLengthOf(selected, resolve) > 0;

  return (
    <>
      <ShotRenderer highlights={editor.items} resolve={resolve} />
      {outlined.length > 0 && <PartOutline objects={outlined} color={helperColor} fill />}
      {outlined.length === 0 && linked.length > 0 && <PartOutline objects={linked} color={helperColor} />}
      {active && selected && shot && mode !== 'shot' && (
        <ShotFrustum
          position={shot.position}
          target={shot.target ?? surfacePoint(selected, resolve)}
          fov={shot.fov ?? (camera instanceof PerspectiveCamera ? camera.fov : 50)}
          aspect={aspect}
          depth={editor.modelSize * FRUSTUM_DEPTH}
          color={helperColor}
        />
      )}
      {showsGizmo && (
        <PivotControls
          matrix={gizmoMatrix}
          autoTransform={false}
          fixed
          scale={GIZMO_SIZE_PX}
          lineWidth={3}
          depthTest={false}
          disableRotations
          disableScaling
          annotations={false}
          hoveredColor={helperColor}
          userData={EDITOR_HELPER}
          onDragStart={() => editorCameraOf(viewer)?.setOrbitEnabled(false)}
          onDrag={(_local, _deltaLocal, world) =>
            editor.setPointerEnd(selected.id, new Vector3().setFromMatrixPosition(world).toArray(), { transient: true })
          }
          onDragEnd={() => {
            editorCameraOf(viewer)?.setOrbitEnabled(true);
            flush();
          }}
        />
      )}
    </>
  );
};
