import { describe, expect, it } from 'vitest';
import { explicitTextCardCreation, requestsCanvasChange } from '@/lib/assistant-intent';

describe('explicit mixed canvas instructions', () => {
  it('extracts a named card from a mixed read and write request', () => {
    const command = '当前画布上一共有几个卡片？请逐个列出它们的标题，另外新建一个正文卡片，标题写 REG3-AGENT块';
    expect(explicitTextCardCreation(command)).toMatchObject({ action: 'createBlock', type: 'text', title: 'REG3-AGENT块' });
    expect(requestsCanvasChange(command)).toBe(true);
  });
  it.each(['不要新建一个正文卡片，标题写 测试', '能不能新建一个正文卡片，标题为 测试', '如何创建一个正文卡片，标题为 测试', '当前画布有几个卡片？'])('does not fabricate writes for read-only or negated requests: %s', command => {
    expect(explicitTextCardCreation(command)).toBeNull();
    expect(requestsCanvasChange(command)).toBe(false);
  });
});
