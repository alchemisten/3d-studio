import {
  Color,
  ColorRepresentation,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Object3D,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { ILogger } from '@schablone/logging';
import {
  HighlightAnimation,
  HighlightMount,
  HighlightSetupModel,
  HighlightSpeed,
  HighlightTextureMap,
  HighlightVisibility,
} from './types';

export default class Highlight {
  public clickzone: Mesh;
  public id: string;
  public glow!: Sprite;
  public speed: HighlightSpeed;
  public visibility!: HighlightVisibility;
  private animation!: HighlightAnimation;
  private cameraTarget: Vector3;
  private color: ColorRepresentation;
  private content: string;
  private fov: number;
  private hover: boolean;
  private headline: string;
  private isTrigger: boolean;
  private logger: ILogger;
  private mount: HighlightMount;
  private nodes: Mesh[];
  private parent: Object3D;
  private position: Vector3;
  private scale: number;
  private target: Vector3;
  private textures: HighlightTextureMap;

  public constructor(highData: HighlightSetupModel, logger: ILogger, group: Object3D, textures: HighlightTextureMap) {
    this.headline = highData.headline;
    this.content = highData.content;
    this.position = new Vector3(highData.pos.x, highData.pos.y, highData.pos.z);
    this.cameraTarget = new Vector3(highData.cam.x, highData.cam.y, highData.cam.z);
    this.target = new Vector3(highData.target.x, highData.target.y, highData.target.z);
    this.fov = highData.fov;
    this.textures = textures;
    this.logger = logger;
    this.parent = group;
    this.id = highData.id;
    this.scale = highData.scale;
    this.color = new Color(parseInt(highData.color.replace('#', '0x'), 16));
    this.speed = highData.speed;
    this.mount = {
      name: highData.mount,
      element: null,
    };
    this.clickzone = this.initClickzone();
    this.glow = this.initGlow();
    this.nodes = [];
    this.glow.scale.x = this.scale;
    this.glow.scale.y = this.scale;
    this.glow.scale.z = this.scale;
    this.clickzone.scale.x = this.scale;
    this.clickzone.scale.y = this.scale;
    this.clickzone.scale.z = this.scale;
    this.isTrigger = highData.isTrigger;
    this.hover = false;

    group.traverse((node) => {
      const nodeName = node.name.trim();
      if (nodeName.length > 0) {
        if (node instanceof Mesh && highData.nodes.indexOf(node.name) > -1) {
          this.nodes.push(node);
        }

        if (!this.mount.element && this.mount.name && nodeName === this.mount.name) {
          this.mount.element = node;

          // initial position
          const wp = this.getWorldPosition(node);
          this.mount.relativeTransform = this.getWorldPosition(this.clickzone).sub(wp);
          this.logger.debug('Setting initial position of highlight mount', {
            objects: [
              'Relative Transform',
              this.mount.relativeTransform,
              'position of object',
              wp,
              'hl pos',
              this.position,
              this.getWorldPosition(this.clickzone),
            ],
          });
        }
      }
    });

    // hl animations
    if (highData.animation) {
      this.animation = highData.animation;
    }

    if (highData.visibility) {
      this.visibility = highData.visibility;
    }

    this.clickzone.add(this.glow);
    this.parent.add(this.clickzone);
  }

  private getWorldPosition(node: Object3D): Vector3 {
    node.updateMatrix();
    const wp = new Vector3();
    wp.setFromMatrixPosition(node.matrix);

    return wp;
  }

  public updateMountedPosition(): void {
    this.logger.debug('Before highlight mount position update', { objects: this.clickzone.position.clone() });
    if (!this.mount.element) {
      return;
    }
    const node = this.mount.element;
    node.updateMatrix();

    if (this.mount.relativeTransform) {
      const wp = new Vector3();
      wp.setFromMatrixPosition(node.matrix);
      this.logger.debug('', { objects: wp.add(this.mount.relativeTransform) });
      // this.clickzone.position.copy(wp.add(this.mount.relativeTransform));
    }
  }

  public getCameraTarget(): Vector3 {
    return this.cameraTarget;
  }

  public getPosition(): Vector3 {
    return this.position;
  }

  public getViewTarget(): Vector3 {
    return new Vector3(this.target.x, this.target.y, this.target.z);
  }

  public getFov(): number {
    return this.fov;
  }

  private initClickzone() {
    const wFrame = new MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0,
      visible: false,
    });

    const sp1g = new SphereGeometry(0.15, 20, 20);
    const sphere = new Mesh(sp1g, wFrame);
    sphere.position.copy(this.position);
    sphere.scale.set(this.scale, this.scale, this.scale);

    //Add rotation targets to sphere
    sphere.userData['camX'] = this.cameraTarget.x;
    sphere.userData['camY'] = this.cameraTarget.y;
    sphere.userData['camZ'] = this.cameraTarget.z;

    return sphere;
  }

  private initGlow(): Sprite {
    return new Sprite(
      new SpriteMaterial({
        map: this.isTrigger ? this.textures.actionTransTex : this.textures.simpleTransTex,
        color: this.color,
        transparent: true,
        blending: NormalBlending,
      })
    );
  }

  public remove(): void {
    this.clickzone.remove(this.glow);
    this.parent.remove(this.clickzone);
  }

  public setCameraTarget(position: Vector3): void {
    this.cameraTarget = position;
  }

  public setColor(color: string): void {
    this.glow.material.color.setHex(parseInt(color.replace('#', '0x'), 16));
    this.glow.material.needsUpdate = true;
  }

  public setFov(nf: number): void {
    this.fov = nf;
  }

  public setHover(state: boolean) {
    if (this.hover !== state) {
      this.hover = state;

      if (this.hover) {
        this.glow.material.map = this.isTrigger ? this.textures.actionTransHoverTex : this.textures.simpleTransHoverTex;
      } else {
        this.glow.material.map = this.isTrigger ? this.textures.actionTransTex : this.textures.simpleTransTex;
      }
    }
  }

  public setPosition(position: Vector3): void {
    this.position = position;
    this.clickzone.position.copy(position);
  }

  public setProperty(property: string, value: never): void {
    switch (property) {
      case 'camx':
        this.cameraTarget.x = value;
        break;
      case 'camy':
        this.cameraTarget.y = value;
        break;
      case 'camz':
        this.cameraTarget.z = value;
        break;
      case 'color':
        this.setColor(value);
        break;
      case 'content':
        this.content = value;
        break;
      case 'headline':
        this.headline = value;
        break;
      case 'posx':
        this.position.x = value;
        this.clickzone.position.setX(this.position.x);
        break;
      case 'posy':
        this.position.y = value;
        this.clickzone.position.setY(this.position.y);
        break;
      case 'posz':
        this.position.z = value;
        this.clickzone.position.setZ(this.position.z);
        break;
      case 'scale':
        this.scale = value;
        this.clickzone.scale.set(this.scale, this.scale, this.scale);
        break;
      case 'isTrigger':
        this.isTrigger = value;
        break;
      default:
        break;
    }
  }

  public setViewTarget(nt: Vector3): void {
    this.target = new Vector3(nt.x, nt.y, nt.z);
  }

  public updateID(newID: string): void {
    this.id = newID;
  }
}
