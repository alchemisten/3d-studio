import { AnimationClip, AnimationMixer, LoopPingPong, NumberKeyframeTrack, Object3D } from 'three';
import { expect, it } from 'vitest';
import { clipTime } from './clip-time';

it('tracks the evaluated pose and seeks to the requested pose on the return leg', () => {
  const object = new Object3D();
  const mixer = new AnimationMixer(object);
  const action = mixer.clipAction(new AnimationClip('move', 1, [new NumberKeyframeTrack('.position[x]', [0, 1], [0, 1])]));
  action.setLoop(LoopPingPong, Infinity).play();
  for (let frame = 0; frame < 95; frame++) {
    mixer.update(1 / 60);
    expect(clipTime(action)).toBeCloseTo(object.position.x);
  }
  action.time = clipTime(action, 0.2);
  mixer.update(0);
  expect(object.position.x).toBeCloseTo(0.2);
});
