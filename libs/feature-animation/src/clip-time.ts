import { LoopPingPong, type AnimationAction } from 'three';

export const isReturnLeg = (action: AnimationAction) => {
  const { _loopCount } = action as AnimationAction & { _loopCount: number };
  return action.loop === LoopPingPong && _loopCount > 0 && _loopCount % 2 === 1;
};

export const clipTime = (action: AnimationAction, time = action.time) =>
  isReturnLeg(action) ? action.getClip().duration - time : time;
