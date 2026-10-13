import { describe, it, expect } from 'vitest';
import { sanitizeHtml, escapeHtml, sanitizeFileName } from '@/lib/sanitize';

describe('Sanitize & Security Defense Utilities', () => {
  it('should strip script tags and inline events from malicious html', () => {
    const malicious = '<p>Normal text</p><script>alert("XSS")</script><img src="x" onerror="stealCookies()">';
    const cleaned = sanitizeHtml(malicious);

    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('alert');
    expect(cleaned).not.toContain('onerror');
    expect(cleaned).toContain('<p>Normal text</p>');
    expect(cleaned).toContain('<img src="x">');
  });

  it('should strip javascript: pseudo protocol in links', () => {
    const maliciousLink = '<a href="javascript:alert(1)">Click me</a>';
    const cleaned = sanitizeHtml(maliciousLink);

    expect(cleaned).not.toContain('javascript:');
    expect(cleaned).toContain('Click me');
  });

  it('should escape dangerous characters to HTML entities', () => {
    const raw = '<div class="test">& \' "</div>';
    const escaped = escapeHtml(raw);

    expect(escaped).toBe('&lt;div class=&quot;test&quot;&gt;&amp; &#39; &quot;&lt;/div&gt;');
  });

  it('should sanitize filename to prevent path traversal', () => {
    const dirty = '../../etc/passwd';
    const safe = sanitizeFileName(dirty);

    expect(safe).not.toContain('/');
    expect(safe).not.toContain('\\');
    expect(safe).toBe('.._.._etc_passwd');
  });
});
