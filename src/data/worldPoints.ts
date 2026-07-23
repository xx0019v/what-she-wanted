import type { StoryPoint } from '../three/world';
import { sceneById } from './scenes';

const P = (n: number) => `${import.meta.env.BASE_URL}pages/${n}.webp`;

// Story points arranged around the ring. Looking toward each reveals a
// fragment of the tale — the same beats as the printed pages, now spatial.
export const WORLD_POINTS: StoryPoint[] = [
  { id: 11, yaw: 0, texture: P(11), label: { en: sceneById(11).en, jp: sceneById(11).jp } }, // the violet moon (front)
  { id: 14, yaw: Math.PI * 0.4, texture: P(14), label: { en: sceneById(14).en, jp: sceneById(14).jp } }, // the witch — overcome
  { id: 12, yaw: Math.PI * 0.8, texture: P(12), label: { en: sceneById(12).en, jp: sceneById(12).jp } }, // memories
  { id: 16, yaw: Math.PI * 1.25, texture: P(16), label: { en: sceneById(16).en, jp: sceneById(16).jp } }, // the path — her own dream
  { id: 17, yaw: Math.PI * 1.62, texture: P(17), label: { en: sceneById(17).en, jp: sceneById(17).jp } }, // the cycle — distant girl
];
