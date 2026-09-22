import { describe, expect, it } from 'vitest';
import { languageKey, readLanguage, saveLanguage, translateText } from './i18n';

describe('interface language', () => {
  it('uses a saved preference before browser language', () => {
    expect(readLanguage({ getItem: () => 'en' }, 'zh-CN')).toBe('en');
    expect(readLanguage({ getItem: () => 'zh' }, 'en-CA')).toBe('zh');
  });
  it('falls back to Chinese browser locales and otherwise English', () => {
    expect(readLanguage({ getItem: () => null }, 'zh-Hans-CN')).toBe('zh');
    expect(readLanguage({ getItem: () => null }, 'en-CA')).toBe('en');
    expect(readLanguage({ getItem: () => { throw new Error('blocked'); } }, 'zh-TW')).toBe('zh');
  });
  it('persists independently and tolerates unavailable storage', () => {
    let saved = '';
    saveLanguage({ setItem: (key, value) => { saved = `${key}:${value}`; } }, 'zh');
    expect(saved).toBe(`${languageKey}:zh`);
    expect(() => saveLanguage({ setItem: () => { throw new Error('blocked'); } }, 'en')).not.toThrow();
  });
  it('translates static, dynamic and accessible copy without changing English', () => {
    expect(translateText('zh', 'Add city')).toBe('添加城市');
    expect(translateText('zh', '3 of 5 cities within hours')).toBe('5 个城市中有 3 个处于可用时间');
    expect(translateText('zh', 'Use Tokyo as base city')).toBe('将 Tokyo 设为参考城市');
    expect(translateText('zh', 'Toronto window 2 start')).toBe('Toronto 时段 2 开始');
    expect(translateText('zh', 'Tokyo: 30 min outside hours')).toBe('Tokyo：超出可用时间 30 分钟');
    expect(translateText('zh', '2026年3月8日周日 · 03:00 UTC-4. The original time does not exist on this date; moved to the next available time.')).toContain('已移到下一个可用时间');
    expect(translateText('en', 'Add city')).toBe('Add city');
    expect(translateText('zh', 'Asia/Tokyo')).toBe('Asia/Tokyo');
  });
});
