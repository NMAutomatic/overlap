import { describe, expect, it } from 'vitest';
import { searchZones } from './city-search';

describe('city search', () => {
  it('finds modern names on browsers exposing older IANA spellings and vice versa', () => {
    expect(searchZones(['Asia/Calcutta'], 'Kolkata')).toEqual(['Asia/Calcutta']);
    expect(searchZones(['Asia/Kolkata'], 'Calcutta')).toEqual(['Asia/Kolkata']);
    expect(searchZones(['Asia/Katmandu'], 'Kathmandu')).toEqual(['Asia/Katmandu']);
    expect(searchZones(['Europe/Kiev'], 'Kyiv')).toEqual(['Europe/Kiev']);
  });
  it('accepts accents, punctuation, whitespace and full IANA paths', () => {
    expect(searchZones(['America/Sao_Paulo'], '  São Paulo ')).toEqual(['America/Sao_Paulo']);
    expect(searchZones(['America/New_York'], 'New-York')).toEqual(['America/New_York']);
    expect(searchZones(['America/New_York'], 'america/new_york')).toEqual(['America/New_York']);
  });
  it('ranks exact abbreviations before other partial matches', () => {
    expect(searchZones(['Africa/Casablanca', 'America/Los_Angeles'], 'LA')[0]).toBe('America/Los_Angeles');
    expect(searchZones(['America/New_York'], 'n.y.c.')).toEqual(['America/New_York']);
  });
  it('supports selected simplified and traditional Chinese city names', () => {
    expect(searchZones(['Asia/Tokyo', 'America/Toronto'], '多倫多')).toEqual(['America/Toronto']);
    expect(searchZones(['Asia/Tokyo', 'America/Toronto'], '东京')).toEqual(['Asia/Tokyo']);
  });
  it('excludes selected zones and their equivalent spellings', () => {
    expect(searchZones(['Asia/Calcutta', 'Asia/Kolkata'], 'Kolkata', ['Asia/Kolkata'])).toEqual([]);
    expect(searchZones(['America/Toronto'], '多伦多', ['America/Toronto'])).toEqual([]);
  });
  it('keeps browsing bounded and does not invent unsupported zones', () => {
    const zones = Array.from({ length: 50 }, (_, i) => `Test/City_${i}`);
    expect(searchZones(zones, ' ')).toEqual(zones.slice(0, 40));
    expect(searchZones(['Europe/London'], 'NYC')).toEqual([]);
    expect(searchZones(zones, '!!!')).toEqual([]);
  });
});
