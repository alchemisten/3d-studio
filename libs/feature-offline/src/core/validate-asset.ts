import { AssetIntegrityError } from './errors';

const GLB_MAGIC = 0x46546c67;
const GLB_HEADER_BYTES = 12;
const GLB_VERSION = 2;

/** ETag, else Last-Modified: what a later request compares against to detect a changed asset. */
export const responseValidator = (headers: Headers): string | null =>
  headers.get('etag') ?? headers.get('last-modified');

const isGlb = (url: string, headers: Headers): boolean =>
  new URL(url).pathname.toLowerCase().endsWith('.glb') || headers.get('content-type') === 'model/gltf-binary';

const assertGlb = (url: string, bytes: ArrayBuffer): void => {
  if (bytes.byteLength < GLB_HEADER_BYTES) throw new AssetIntegrityError(url, 'the GLB header is incomplete');
  const header = new DataView(bytes, 0, GLB_HEADER_BYTES);
  if (header.getUint32(0, true) !== GLB_MAGIC) {
    throw new AssetIntegrityError(url, 'it does not start with the glTF magic');
  }
  if (header.getUint32(4, true) !== GLB_VERSION) {
    throw new AssetIntegrityError(url, `GLB version ${header.getUint32(4, true)} is not supported`);
  }
  const declared = header.getUint32(8, true);
  if (declared !== bytes.byteLength) {
    throw new AssetIntegrityError(url, `the GLB declares ${declared} bytes but ${bytes.byteLength} arrived`);
  }
};

/**
 * Rejects downloads that would break the viewer offline: empty or truncated bodies and damaged GLB containers.
 * `Content-Length` counts encoded bytes, so it is only compared for unencoded responses.
 */
export const assertAssetIntegrity = (url: string, headers: Headers, bytes: ArrayBuffer): void => {
  if (bytes.byteLength === 0) throw new AssetIntegrityError(url, 'the response is empty');
  const declared = headers.get('content-length');
  if (declared !== null && !headers.has('content-encoding') && Number(declared) !== bytes.byteLength) {
    throw new AssetIntegrityError(url, `${declared} bytes were announced but ${bytes.byteLength} arrived`);
  }
  if (isGlb(url, headers)) assertGlb(url, bytes);
};
