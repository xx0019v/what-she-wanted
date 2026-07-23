declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import type { Group, Scene, PerspectiveCamera, WebGLRenderer } from 'three';

  export interface MindARAnchor {
    group: Group;
    onTargetFound?: () => void;
    onTargetLost?: () => void;
  }

  export interface MindARThreeOptions {
    container: HTMLElement;
    imageTargetSrc: string;
    uiScanning?: boolean | string;
    uiLoading?: boolean | string;
    uiError?: boolean | string;
    maxTrack?: number;
    filterMinCF?: number;
    filterBeta?: number;
    warmupTolerance?: number;
    missTolerance?: number;
  }

  export class MindARThree {
    constructor(options: MindARThreeOptions);
    renderer: WebGLRenderer;
    scene: Scene;
    camera: PerspectiveCamera;
    video: HTMLVideoElement;
    addAnchor(targetIndex: number): MindARAnchor;
    start(): Promise<void>;
    stop(): void;
  }
}
