import { GLTFLoader } from './GLTFLoader.js';
import { DRACOLoader } from './DRACOLoader.js';

let _sharedDraco = null;

export function createGLTFLoader() {
  if (!_sharedDraco) {
    _sharedDraco = new DRACOLoader();
    _sharedDraco.setDecoderPath('/assets/js/vendor/draco/');
  }
  const loader = new GLTFLoader();
  loader.setDRACOLoader(_sharedDraco);
  return loader;
}
