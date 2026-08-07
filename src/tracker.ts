export type TrackableClass = 'person' | 'car';

export type LineOrientation = 'horizontal' | 'vertical';

export type CrossingLine = {
  orientation: LineOrientation;
  position: number;
};

export type Detection = {
  id?: string;
  className: TrackableClass;
  bbox: [number, number, number, number];
};

export type Counts = Record<TrackableClass, number>;

type Track = {
  id: string;
  className: TrackableClass;
  centerX: number;
  centerY: number;
  lastSide: number;
  missedFrames: number;
};

type TrackerOptions = {
  line: CrossingLine;
  matchDistance?: number;
  maxMissedFrames?: number;
};

const initialCounts = (): Counts => ({ person: 0, car: 0 });

export class CrossingTracker {
  private counts = initialCounts();
  private line: CrossingLine;
  private readonly matchDistance: number;
  private readonly maxMissedFrames: number;
  private nextTrackId = 1;
  private tracks = new Map<string, Track>();

  constructor(options: TrackerOptions) {
    this.line = options.line;
    this.matchDistance = options.matchDistance ?? 80;
    this.maxMissedFrames = options.maxMissedFrames ?? 8;
  }

  getCounts(): Counts {
    return { ...this.counts };
  }

  reset(): Counts {
    this.counts = initialCounts();
    this.tracks.clear();
    return this.getCounts();
  }

  updateLine(line: CrossingLine): void {
    this.line = line;
    this.tracks.clear();
  }

  update(detections: Detection[]): Counts {
    const candidates = detections
      .filter((detection) => detection.className === 'person' || detection.className === 'car')
      .map((detection) => ({
        ...detection,
        centerX: detection.bbox[0] + detection.bbox[2] / 2,
        centerY: detection.bbox[1] + detection.bbox[3] / 2,
      }));

    const matchedTrackIds = new Set<string>();

    for (const candidate of candidates) {
      const track = this.findTrack(candidate.className, candidate.centerX, candidate.centerY, matchedTrackIds);
      const side = this.getSide(candidate.centerX, candidate.centerY);

      if (track) {
        if (track.lastSide !== 0 && side !== 0 && track.lastSide !== side) {
          this.counts[candidate.className] += 1;
        }

        track.centerX = candidate.centerX;
        track.centerY = candidate.centerY;
        track.lastSide = side || track.lastSide;
        track.missedFrames = 0;
        matchedTrackIds.add(track.id);
      } else {
        const id = candidate.id ?? `track-${this.nextTrackId++}`;
        this.tracks.set(id, {
          id,
          className: candidate.className,
          centerX: candidate.centerX,
          centerY: candidate.centerY,
          lastSide: side,
          missedFrames: 0,
        });
        matchedTrackIds.add(id);
      }
    }

    for (const [id, track] of this.tracks) {
      if (!matchedTrackIds.has(id)) {
        track.missedFrames += 1;
      }

      if (track.missedFrames > this.maxMissedFrames) {
        this.tracks.delete(id);
      }
    }

    return this.getCounts();
  }

  private findTrack(
    className: TrackableClass,
    centerX: number,
    centerY: number,
    matchedTrackIds: Set<string>,
  ): Track | undefined {
    let closest: Track | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const track of this.tracks.values()) {
      if (track.className !== className || matchedTrackIds.has(track.id)) {
        continue;
      }

      const distance = Math.hypot(track.centerX - centerX, track.centerY - centerY);

      if (distance < closestDistance && distance <= this.matchDistance) {
        closest = track;
        closestDistance = distance;
      }
    }

    return closest;
  }

  private getSide(centerX: number, centerY: number): number {
    const value = this.line.orientation === 'horizontal'
      ? centerY - this.line.position
      : centerX - this.line.position;

    if (Math.abs(value) < 1) {
      return 0;
    }

    return value > 0 ? 1 : -1;
  }
}
