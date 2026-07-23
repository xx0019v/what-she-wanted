import { describe, it, expect } from 'vitest';
import { SCENES, sceneById, PRIORITY_SCENES } from '../src/data/scenes';
import { WORLD_POINTS } from '../src/data/worldPoints';

describe('story data integrity', () => {
  it('has all 17 pages in order', () => {
    expect(SCENES).toHaveLength(17);
    SCENES.forEach((s, i) => expect(s.id).toBe(i + 1));
  });

  it('every scene has EN and JP subtitles and a matching image path', () => {
    for (const s of SCENES) {
      expect(s.en.length).toBeGreaterThan(0);
      expect(s.jp.length).toBeGreaterThan(0);
      expect(s.image).toMatch(new RegExp(`pages/${s.id}\\.(webp|jpg)$`));
    }
  });

  it('EN and JP have the same number of lines per scene', () => {
    for (const s of SCENES) expect(s.en.length).toBe(s.jp.length);
  });

  it('priority scenes and world points reference real scenes', () => {
    for (const id of PRIORITY_SCENES) expect(sceneById(id).id).toBe(id);
    for (const p of WORLD_POINTS) expect(sceneById(p.id).id).toBe(p.id);
  });

  it('sceneById falls back to the cover for unknown ids', () => {
    expect(sceneById(999).id).toBe(1);
  });
});
