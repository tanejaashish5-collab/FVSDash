import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { BlogPost } from './types';
import { formatNumber, getDueDateInfo, getPriorityStyle, getStatusStyle, generatePerformanceData, mapRecordToBlogPost } from './utils';

describe('Utility Functions', () => {
  describe('formatNumber', () => {
    it('should format numbers less than 1000 without suffix', () => {
      expect(formatNumber(123)).toBe('123');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format thousands with a "K" suffix', () => {
      expect(formatNumber(1000)).toBe('1K');
      expect(formatNumber(1234)).toBe('1.2K');
      expect(formatNumber(99999)).toBe('100K');
    });

    it('should format millions with an "M" suffix', () => {
      expect(formatNumber(1000000)).toBe('1M');
      expect(formatNumber(1234567)).toBe('1.2M');
    });

    it('should handle zero correctly', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1.2K');
    });
  });

  describe('getDueDateInfo', () => {
    const today = new Date('2024-08-28T12:00:00.000Z');
    
    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(today);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should return past status for dates in the past', () => {
      const result = getDueDateInfo('2024-08-26');
      expect(result.status).toBe('past');
      expect(result.relativeTime).toBe('2 days overdue');
    });
    
    it('should return approaching for today', () => {
      const result = getDueDateInfo('2024-08-28');
      expect(result.status).toBe('approaching');
      expect(result.relativeTime).toBe('Due today');
    });

    it('should return approaching for tomorrow', () => {
      const result = getDueDateInfo('2024-08-29');
      expect(result.status).toBe('approaching');
      expect(result.relativeTime).toBe('Due tomorrow');
    });
    
     it('should return approaching for 2 days from now', () => {
      const result = getDueDateInfo('2024-08-30');
      expect(result.status).toBe('approaching');
      expect(result.relativeTime).toBe('Due in 2 days');
    });

    it('should return safe for dates more than 2 days in the future', () => {
      const result = getDueDateInfo('2024-09-05');
      expect(result.status).toBe('safe');
      expect(result.relativeTime).toMatch(/Due on/);
    });
    
    it('should handle invalid date strings gracefully', () => {
       const result = getDueDateInfo('invalid-date');
       expect(result.status).toBe('safe');
       expect(result.relativeTime).toBe('Due invalid-date');
    });
  });

  describe('Styling Functions', () => {
    it('getStatusStyle returns correct classes', () => {
        expect(getStatusStyle('In Production')).toContain('yellow');
        expect(getStatusStyle('Podcast')).toContain('purple');
        expect(getStatusStyle('New')).toContain('gray');
    });
    it('getPriorityStyle returns correct classes', () => {
        expect(getPriorityStyle('High')).toContain('red');
        expect(getPriorityStyle('Medium')).toContain('yellow');
        expect(getPriorityStyle('Low')).toContain('green');
        expect(getPriorityStyle(undefined)).toContain('gray');
    });
  });

  describe('generatePerformanceData', () => {
    const mockEpisodes = [
        { id: "1", title: "Recent", status: "Published", dueDate: "2024-08-28", type: 'Podcast' },
        { id: "2", title: "Old", status: "Published", dueDate: "2024-01-01", type: 'Podcast' },
        { id: "3", title: "Draft", status: "In Production", dueDate: "2024-08-28", type: 'Podcast' },
    ];
    it('filters out non-published episodes', () => {
        const result = generatePerformanceData(mockEpisodes as any, 90);
        expect(result.length).toBe(2);
        expect(result.some(e => e.title === 'Draft')).toBe(false);
    });
  });

  describe('mapRecordToBlogPost', () => {
    it('correctly maps a valid Airtable record', () => {
        const record = {
            id: 'rec123',
            fields: {
                'Title': 'My Post',
                'Content': 'Hello world',
                'Status': 'Published',
                'Generated At': '2024-01-01T00:00:00.000Z',
                'Tags': 'tech, code'
            }
        };
        const result = mapRecordToBlogPost(record);
        expect(result).toEqual({
            id: 'rec123',
            title: 'My Post',
            content: 'Hello world',
            status: 'Published',
            generatedAt: '2024-01-01T00:00:00.000Z',
            publishedAt: undefined,
            seoTitle: undefined,
            seoDescription: undefined,
            tags: ['tech', 'code']
        });
    });
    it('returns null for a malformed record (e.g., missing Title)', () => {
        const record = { id: 'rec123', fields: { 'Content': 'No title here' }};
        expect(mapRecordToBlogPost(record)).toBeNull();
    });
    it('returns null for a null or undefined record', () => {
        expect(mapRecordToBlogPost(null)).toBeNull();
        expect(mapRecordToBlogPost(undefined)).toBeNull();
    });
    it('handles missing optional fields gracefully', () => {
        const record = { id: 'rec123', fields: { 'Title': 'Minimal Post', 'Status': 'Needs Review' }};
        const result = mapRecordToBlogPost(record);
        expect(result?.content).toBe('');
        expect(result?.tags).toEqual([]);
    });
  });
});