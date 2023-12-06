import { FC, useEffect, useState } from 'react';
import type { AnimationAction, AnimationClip } from 'three';
import { timer } from 'rxjs';
import { debounce } from 'rxjs/operators';
import { getTrackBackground, Range } from 'react-range';
import { useLogger } from '@schablone/logging-react';

import { Button } from '../button/button';
import { useViewerContext } from '../../provider';
import styles from './animation-bar.module.scss';

interface AnimationData {
  action?: AnimationAction;
  duration: number;
  isRunning: boolean;
  time: number;
}

export const AnimationBar: FC = () => {
  const { logger } = useLogger();
  const viewer = useViewerContext();
  const [animation, setAnimation] = useState<AnimationClip | null>(null);
  const [animationData, setAnimationData] = useState<AnimationData | null>(null);
  const [animations, setAnimations] = useState<AnimationClip[]>([]);

  useEffect(() => {
    if (!viewer) {
      return;
    }
    const subscription = viewer.sceneService.objectAddedToScene$.subscribe((object) => {
      if (object && object.animations.length > 0) {
        try {
          viewer.animationService.getMixerForObject(object.name);
          setAnimations(object.animations);
          setAnimation(object.animations[0]);

          const action = viewer?.animationService.playObjectAnimation({
            animationName: object.animations[0].name,
            objectName: object.name,
          });
          viewer?.animationService.setAnimationEnabled(false);
          if (action) {
            setAnimationData({
              action,
              duration: object.animations[0].duration,
              isRunning: false,
              time: action.time,
            });
          }
        } catch (error) {
          logger.warn('Could not initialize animation bar\n', { error });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [logger, viewer]);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    const subscription = viewer.animationService
      .getActiveAnimationTime()
      .pipe(debounce(() => timer(10)))
      .subscribe((animationMap) => {
        if (animation && animationMap[animation.name] && animationData) {
          setAnimationData({
            ...animationData,
            time: animationMap[animation.name].time,
          });
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [viewer, animation, animationData]);

  const setAnimationTime = (time: number) => {
    viewer?.animationService.setAnimationTime(time);
  };

  const toggleAnimation = () => {
    if (animationData?.action) {
      const isRunning = animationData.action.isRunning();
      viewer?.animationService.setAnimationEnabled(!isRunning);
      setAnimationData({
        ...animationData,
        isRunning: !isRunning,
      });
    }
  };

  if (animations.length === 0) {
    return null;
  }

  const max = animation?.duration || 1;

  return (
    <div className={styles.animationBar}>
      <div className={styles.rangeSlider}>
        <Range
          max={animation?.duration || 1}
          onChange={(values) => setAnimationTime(values[0])}
          step={0.001}
          values={[animationData?.time || 0]}
          renderTrack={({ props, children }) => (
            <div className={styles.barWrapper} {...props} style={props.style}>
              <div
                className={styles.bar}
                style={{
                  background: getTrackBackground({
                    values: [animationData?.time || 0],
                    colors: ['var(--ui-color-interaction)', 'var(--ui-color-bar)'],
                    min: 0,
                    max: animation?.duration || 1,
                  }),
                }}
              >
                {children}
              </div>
            </div>
          )}
          renderThumb={({ props, value }) => (
            <div
              {...props}
              className={styles.handle}
              style={{
                ...props.style,
                left: `${(value / max) * 100}%`,
              }}
            />
          )}
        />
      </div>

      <div className={styles.controls}>
        <Button onClick={toggleAnimation}>
          {animationData?.action && animationData.isRunning ? (
            <svg fill="#ffffff" height="24" width="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <rect y="5" x="6" width="4" height="14"></rect>
              <rect y="5" x="14" width="4" height="14"></rect>
            </svg>
          ) : (
            <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5v14l11-7z"></path>
              <path d="M0 0h24v24H0z" fill="none"></path>
            </svg>
          )}
        </Button>

        {animationData && (
          <div className={styles.time}>
            <span className={styles.currentTime}>{(Math.floor(animationData.time * 100) / 100).toFixed(2)}</span> /{' '}
            <span className={styles.totalTime}>{(Math.floor(animationData.duration * 100) / 100).toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
