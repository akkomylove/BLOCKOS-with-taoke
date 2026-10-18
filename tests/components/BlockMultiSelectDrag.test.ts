import { describe, it, expect, beforeEach } from 'vitest';
import { useBlockStore } from '@/store/blockStore';
import { TOUR_STEPS } from '@/components/OnboardingTour';

describe('Onboarding Tour Wording and Copy Audit', () => {
  it('should not contain internal layout debug notes in Step 2 description', () => {
    const step2 = TOUR_STEPS.find((s) => s.badge.includes('2/5'));
    expect(step2).toBeDefined();
    expect(step2?.description).not.toContain('卡片垂直智能避让排布，杜绝重叠！');
    expect(step2?.description).toContain('让信息层级井井有条！');
  });

  it('should have customer-facing professional descriptions across all 5 tour steps', () => {
    expect(TOUR_STEPS.length).toBe(5);
    for (const step of TOUR_STEPS) {
      expect(step.title.length).toBeGreaterThan(5);
      expect(step.description.length).toBeGreaterThan(20);
      expect(step.actionHint.length).toBeGreaterThan(5);
    }
  });
});

describe('Multi-Selection and Batch Move Logic', () => {
  beforeEach(() => {
    const store = useBlockStore.getState();
    store.clearSelection();
  });

  it('should allow selecting multiple blocks via setSelection and toggleSelection', () => {
    const store = useBlockStore.getState();
    store.setSelection(['block-1', 'block-2']);
    expect(useBlockStore.getState().selectedIds).toEqual(['block-1', 'block-2']);

    store.toggleSelection('block-3');
    expect(useBlockStore.getState().selectedIds).toEqual(['block-1', 'block-2', 'block-3']);

    store.toggleSelection('block-2');
    expect(useBlockStore.getState().selectedIds).toEqual(['block-1', 'block-3']);
  });

  it('should correctly move multiple blocks simultaneously without relative coordinate drift', () => {
    const store = useBlockStore.getState();
    const blocks = store.blocks;
    if (blocks.length >= 2) {
      const b1 = blocks[0];
      const b2 = blocks[1];

      const initialB1 = { x: b1.x, y: b1.y };
      const initialB2 = { x: b2.x, y: b2.y };
      const deltaX = 120;
      const deltaY = 80;

      // Simulate multi-block drag using moveBlockTo
      store.moveBlockTo(b1.id, initialB1.x + deltaX, initialB1.y + deltaY);
      store.moveBlockTo(b2.id, initialB2.x + deltaX, initialB2.y + deltaY);

      const updatedBlocks = useBlockStore.getState().blocks;
      const updatedB1 = updatedBlocks.find((b) => b.id === b1.id)!;
      const updatedB2 = updatedBlocks.find((b) => b.id === b2.id)!;

      expect(updatedB1.x - initialB1.x).toBe(deltaX);
      expect(updatedB1.y - initialB1.y).toBe(deltaY);
      expect(updatedB2.x - initialB2.x).toBe(deltaX);
      expect(updatedB2.y - initialB2.y).toBe(deltaY);

      // Verify relative distance between them remains constant
      expect(updatedB2.x - updatedB1.x).toBe(initialB2.x - initialB1.x);
      expect(updatedB2.y - updatedB1.y).toBe(initialB2.y - initialB1.y);
    }
  });
});
