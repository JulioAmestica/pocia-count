import { describe, expect, it } from 'vitest';
import { CrossingTracker } from './tracker';

describe('CrossingTracker', () => {
  it('counts a person crossing a horizontal line', () => {
    const tracker = new CrossingTracker({ line: { orientation: 'horizontal', position: 100 }, matchDistance: 200 });

    tracker.update([{ className: 'person', bbox: [20, 20, 40, 40] }]);
    const counts = tracker.update([{ className: 'person', bbox: [20, 130, 40, 40] }]);

    expect(counts.person).toBe(1);
    expect(counts.car).toBe(0);
  });

  it('counts a car crossing a vertical line', () => {
    const tracker = new CrossingTracker({ line: { orientation: 'vertical', position: 100 }, matchDistance: 200 });

    tracker.update([{ className: 'car', bbox: [20, 40, 40, 40] }]);
    const counts = tracker.update([{ className: 'car', bbox: [130, 40, 40, 40] }]);

    expect(counts.car).toBe(1);
    expect(counts.person).toBe(0);
  });

  it('does not double count while staying on the same side', () => {
    const tracker = new CrossingTracker({ line: { orientation: 'horizontal', position: 100 }, matchDistance: 200 });

    tracker.update([{ className: 'person', bbox: [20, 20, 40, 40] }]);
    tracker.update([{ className: 'person', bbox: [22, 30, 40, 40] }]);
    const counts = tracker.update([{ className: 'person', bbox: [24, 35, 40, 40] }]);

    expect(counts.person).toBe(0);
  });

  it('resets counters', () => {
    const tracker = new CrossingTracker({ line: { orientation: 'horizontal', position: 100 }, matchDistance: 200 });

    tracker.update([{ className: 'person', bbox: [20, 20, 40, 40] }]);
    tracker.update([{ className: 'person', bbox: [20, 130, 40, 40] }]);

    expect(tracker.reset()).toEqual({ person: 0, car: 0 });
  });

  it('preserves counters and clears tracks when the line orientation changes', () => {
    const tracker = new CrossingTracker({ line: { orientation: 'horizontal', position: 100 }, matchDistance: 200 });

    tracker.update([{ className: 'person', bbox: [20, 20, 40, 40] }]);
    tracker.update([{ className: 'person', bbox: [20, 130, 40, 40] }]);
    tracker.updateLine({ orientation: 'vertical', position: 100 });
    const counts = tracker.update([{ className: 'person', bbox: [130, 130, 40, 40] }]);

    expect(counts).toEqual({ person: 1, car: 0 });
  });
});
