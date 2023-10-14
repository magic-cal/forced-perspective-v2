import { Bounds, Coord2D, Coord3D, WORLD_BOUNDS } from "../types/world";

export class PositionGenerator {
  private numberOfObjects: number;
  private physicalSize: Coord3D;

  constructor(numberOfObjects: number, physicalSize: Coord3D) {
    this.physicalSize = physicalSize;
    this.numberOfObjects = numberOfObjects;
  }

  public setNumberOfObjects(numberOfObjects: number): void {
    this.numberOfObjects = numberOfObjects;
  }

  public generateRandomPositions(bounds: Bounds = WORLD_BOUNDS): Coord3D[] {
    const positions: Coord3D[] = [];
    for (let i = 0; i < this.numberOfObjects; i++) {
      let newPosition = this.generateRandomPosition(bounds);

      positions.push(this.generateRandomPosition(bounds));
      for (let j = 0; j < i; j++) {
        while (this.isOverlapping(newPosition, positions[j])) {
          newPosition = this.generateRandomPosition(bounds);
        }
      }
    }
    return positions;
  }

  private generateRandomPosition(bounds: Bounds): Coord3D {
    const x = Math.random() * (bounds.max[0] - bounds.min[0]) + bounds.min[0];
    const y = Math.random() * (bounds.max[1] - bounds.min[1]) + bounds.min[1];
    const z = Math.random() * (bounds.max[2] - bounds.min[2]) + bounds.min[2];
    return [x, y, z];
  }

  private isOverlapping(
    a: Coord3D,
    b: Coord3D,
    tolerance: number = 2
  ): boolean {
    const x = Math.abs(a[0] - b[0]) < this.physicalSize[0] * tolerance;
    const y = Math.abs(a[1] - b[1]) < this.physicalSize[1] * tolerance;
    const z = Math.abs(a[2] - b[2]) < this.physicalSize[2] * tolerance;
    return x && y && z;
  }

  public generateStackedPositions(stackBaseCenterPosition: Coord3D): Coord3D[] {
    const x = stackBaseCenterPosition[0];
    const y = stackBaseCenterPosition[1];

    const positions: Coord3D[] = [];
    for (let i = 0; i < this.numberOfObjects; i++) {
      const z = this.physicalSize[2] * i;
      positions.push([x, y, z]);
    }
    return positions;
  }

  /**
   * @param gridBasePosition center of the grid
   */
  public generateGridPositions2d(
    gridBasePosition: Coord3D,
    columns: number,
    rows: number,
    padding: Coord2D = [0, 0]
  ): Coord3D[] {
    const bottomOffset =
      ((this.physicalSize[0] + padding[0]) * (columns - 1)) / 2;
    const leftOffset = ((this.physicalSize[1] + padding[1]) * (rows - 1)) / 2;

    const x = gridBasePosition[0] - bottomOffset;
    const y = gridBasePosition[1] - leftOffset;
    const z = gridBasePosition[2];

    const positions: Coord3D[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < columns; i++) {
        positions.push([
          x + (this.physicalSize[0] + padding[0]) * i,
          y + (this.physicalSize[1] + padding[1]) * j,
          z + this.physicalSize[2] * i,
        ]);
      }
    }

    return positions;
  }

  public generateHelixPositions(
    centerPoint: Coord3D,
    radius: number = 10,
    height: number = 10
  ): Coord3D[] {
    const positions: Coord3D[] = [];

    for (let i = 0; i < this.numberOfObjects; i++) {
      const angle = (i * Math.PI * 2) / this.numberOfObjects;
      const x = centerPoint[0] + radius * Math.sin(angle);
      const y = centerPoint[1] + (height / this.numberOfObjects) * i;
      const z = centerPoint[2] + radius * Math.cos(angle);
      positions.push([x, y, z]);
    }

    return positions;
  }

  /**
   *
   * 3d sphere packing algorithm
   * https://stackoverflow.com/questions/9600801/evenly-distributing-n-points-on-a-sphere
   *
   * @param centerPoint
   * @param radius
   */
  public generateSpherePositions(
    centerPoint: Coord3D,
    radius: number = 10
  ): Coord3D[] {
    const positions: Coord3D[] = [];

    const n = this.numberOfObjects;
    const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle in radians

    for (let i = 0; i < n; i++) {
      const theta = phi * i; // golden angle increment
      const y = 1 - (i / (n - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y) * radius;

      const x = Math.cos(theta) * radiusAtY + centerPoint[0];
      const z = Math.sin(theta) * radiusAtY + centerPoint[2];

      positions.push([x, y * radius + centerPoint[1], z]);
    }
    return positions;
  }
}
