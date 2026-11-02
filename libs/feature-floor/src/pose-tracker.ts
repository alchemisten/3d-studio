import {
  Matrix4,
  Mesh,
  type Object3D,
  type BufferGeometry,
  type BufferAttribute,
  type InterleavedBufferAttribute,
} from 'three';

const version = (attribute?: BufferAttribute | InterleavedBufferAttribute) =>
  attribute && ('data' in attribute ? attribute.data.version : attribute.version);

interface Sample {
  matrix: Matrix4;
  visible: boolean;
  geometry?: BufferGeometry;
  visit: number;
  positionAttribute?: BufferAttribute | InterleavedBufferAttribute;
  indexAttribute?: BufferAttribute | null;
  positions?: number;
  indices?: number;
  materialVisible?: boolean;
}

export const createPoseTracker = () => {
  const snapshots = new WeakMap<Object3D, Sample>();
  let count = 0;
  let visit = 0;
  return (model: Object3D) => {
    visit++;
    let seen = 0;
    let changed = false;
    model.updateWorldMatrix(true, true);
    model.traverse((node) => {
      seen++;
      const mesh = node as Mesh;
      const geometry = mesh.geometry;
      if (
        'isSkinnedMesh' in node ||
        'isInstancedMesh' in node ||
        mesh.morphTargetInfluences?.length ||
        Array.isArray(mesh.material) ||
        (geometry && !(mesh instanceof Mesh))
      )
        changed = true;
      const positions = version(geometry?.attributes.position);
      const indices = geometry?.index?.version;
      const materialVisible = !Array.isArray(mesh.material) && mesh.material?.visible;
      const old = snapshots.get(node);
      if (
        old &&
        old.visit === visit - 1 &&
        old.positionAttribute === geometry?.attributes.position &&
        old.indexAttribute === geometry?.index &&
        old.matrix.equals(node.matrixWorld) &&
        old.visible === node.visible &&
        old.geometry === geometry &&
        old.positions === positions &&
        old.indices === indices &&
        old.materialVisible === materialVisible
      ) {
        old.visit = visit;
        return;
      }
      changed = true;
      const matrix = old?.matrix ?? new Matrix4();
      snapshots.set(node, {
        visit,
        positionAttribute: geometry?.attributes.position,
        indexAttribute: geometry?.index,
        matrix: matrix.copy(node.matrixWorld),
        visible: node.visible,
        geometry,
        positions,
        indices,
        materialVisible,
      });
    });
    changed ||= count !== seen;
    count = seen;
    return changed;
  };
};
