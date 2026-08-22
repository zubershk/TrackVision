export type BBox = [number, number, number, number];

export interface KalmanState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
}

export class KalmanFilter {
  private state: KalmanState;
  private covariance: number[][];
  private readonly dt: number;
  private readonly processNoise: number;
  private readonly measurementNoise: number;
  private readonly maxVelocity: number = 1000;

  constructor(
    initialBBox: BBox, 
    dt: number = 1/30, 
    processNoise: number = 0.1, 
    measurementNoise: number = 1.0
  ) {
    const [x, y, w, h] = initialBBox;
    this.state = { x: x + w/2, y: y + h/2, vx: 0, vy: 0, w, h };
    this.covariance = this.identity(6);
    this.dt = dt;
    this.processNoise = processNoise;
    this.measurementNoise = measurementNoise;
    
    // Initialize covariance with reasonable uncertainties
    this.covariance[0][0] = 100; // x position
    this.covariance[1][1] = 100; // y position
    this.covariance[2][2] = 10000; // vx velocity
    this.covariance[3][3] = 10000; // vy velocity
    this.covariance[4][4] = 100; // width
    this.covariance[5][5] = 100; // height
  }

  private identity(n: number): number[][] {
    return Array.from({ length: n }, (_, i) => 
      Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
    );
  }

  private matrixMultiply(A: number[][], B: number[][]): number[][] {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;
    const result = Array.from({ length: rowsA }, () => Array(colsB).fill(0));
    
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  private matrixAdd(A: number[][], B: number[][]): number[][] {
    return A.map((row, i) => row.map((val, j) => val + B[i][j]));
  }

  private matrixTranspose(A: number[][]): number[][] {
    return A[0].map((_, i) => A.map(row => row[i]));
  }

  predict(): BBox {
    // State transition matrix F
    const F = [
      [1, 0, this.dt, 0, 0, 0],
      [0, 1, 0, this.dt, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1]
    ];
    
    // Process noise matrix Q
    const q = this.processNoise;
    const dt = this.dt;
    const Q = [
      [q * dt**4 / 4, 0, q * dt**3 / 2, 0, 0, 0],
      [0, q * dt**4 / 4, 0, q * dt**3 / 2, 0, 0],
      [q * dt**3 / 2, 0, q * dt**2, 0, 0, 0],
      [0, q * dt**3 / 2, 0, q * dt**2, 0, 0],
      [0, 0, 0, 0, q * 0.01, 0],
      [0, 0, 0, 0, 0, q * 0.01]
    ];
    
    // x = F * x
    const newState = F.map(row => 
      row.reduce((sum, val, i) => sum + val * Object.values(this.state)[i], 0)
    );
    
    this.state = {
      x: newState[0],
      y: newState[1],
      vx: Math.max(-this.maxVelocity, Math.min(this.maxVelocity, newState[2])),
      vy: Math.max(-this.maxVelocity, Math.min(this.maxVelocity, newState[3])),
      w: Math.max(1, newState[4]),
      h: Math.max(1, newState[5])
    };
    
    // P = F * P * F^T + Q
    const FP = this.matrixMultiply(F, this.covariance);
    const FTP = this.matrixTranspose(F);
    const FPFT = this.matrixMultiply(FP, FTP);
    this.covariance = this.matrixAdd(FPFT, Q);
    
    return this.stateToBBox();
  }

  update(measurement: BBox): BBox {
    const [x, y, w, h] = measurement;
    const mx = x + w/2;
    const my = y + h/2;
    const mw = w;
    const mh = h;
    
    // Measurement matrix H (maps state to measurement)
    const H = [
      [1, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1]
    ];
    
    // Measurement noise R
    const R = [
      [this.measurementNoise, 0, 0, 0, 0, 0],
      [0, this.measurementNoise, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, this.measurementNoise, 0],
      [0, 0, 0, 0, 0, this.measurementNoise]
    ];
    
    // Innovation innovation = z - H*x
    const z = [mx, my, 0, 0, mw, mh];
    const Hx = H.map(row => row.reduce((sum, val, i) => sum + val * Object.values(this.state)[i], 0));
    const innovation = z.map((val, i) => val - Hx[i]);
    
    // Innovation covariance S = H * P * H^T + R
    const HP = this.matrixMultiply(H, this.covariance);
    const HT = this.matrixTranspose(H);
    const HPHT = this.matrixMultiply(HP, HT);
    const S = this.matrixAdd(HPHT, R);
    
    // Kalman gain K = P * H^T * S^-1
    const PHT = this.matrixMultiply(this.covariance, HT);
    const Sinv = this.matrixInverse(S) || this.identity(6);
    const K = this.matrixMultiply(PHT, Sinv);
    
    // Update state x = x + K * innovation
    const Ky = K.map(row => row.reduce((sum, val, i) => sum + val * innovation[i], 0));
    const stateValues = Object.values(this.state);
    const newStateValues = stateValues.map((val, i) => val + Ky[i]);
    
    this.state = {
      x: newStateValues[0],
      y: newStateValues[1],
      vx: Math.max(-this.maxVelocity, Math.min(this.maxVelocity, newStateValues[2])),
      vy: Math.max(-this.maxVelocity, Math.min(this.maxVelocity, newStateValues[3])),
      w: Math.max(1, newStateValues[4]),
      h: Math.max(1, newStateValues[5])
    };
    
    // Update covariance P = (I - K * H) * P
    const KH = this.matrixMultiply(K, H);
    const I = this.identity(6);
    const IminusKH = I.map((row, i) => row.map((val, j) => val - KH[i][j]));
    this.covariance = this.matrixMultiply(IminusKH, this.covariance);
    
    return this.stateToBBox();
  }

  public stateToBBox(): BBox {
    return [
      this.state.x - this.state.w/2,
      this.state.y - this.state.h/2,
      this.state.w,
      this.state.h
    ];
  }

  getPredictedBBox(): BBox {
    const predicted = { ...this.state };
    predicted.x += predicted.vx * this.dt;
    predicted.y += predicted.vy * this.dt;
    return [
      predicted.x - predicted.w/2,
      predicted.y - predicted.h/2,
      predicted.w,
      predicted.h
    ];
  }

  getState(): Readonly<KalmanState> {
    return { ...this.state };
  }

  getCenter(): [number, number] {
    return [this.state.x, this.state.y];
  }

  getVelocity(): [number, number] {
    return [this.state.vx, this.state.vy];
  }

  getCovariance(): number[][] {
    return this.covariance.map(row => [...row]);
  }

  reset(initialBBox: BBox): void {
    const [x, y, w, h] = initialBBox;
    this.state = { x: x + w/2, y: y + h/2, vx: 0, vy: 0, w, h };
    this.covariance = this.identity(6);
    this.covariance[0][0] = 100;
    this.covariance[1][1] = 100;
    this.covariance[2][2] = 10000;
    this.covariance[3][3] = 10000;
    this.covariance[4][4] = 100;
    this.covariance[5][5] = 100;
  }

  // Matrix inverse using Gaussian elimination (for 6x6 matrices)
  private matrixInverse(A: number[][]): number[][] | undefined {
    const n = A.length;
    const aug = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]);
    
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(aug[j][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = j;
        }
      }
      
      if (Math.abs(aug[maxRow][i]) < 1e-10) {
        // Singular matrix, return identity
        return this.identity(n);
      }
      
      if (maxRow !== i) {
        [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
      }
      
      // Normalize pivot row
      const pivot = aug[i][i];
      for (let j = 0; j < 2 * n; j++) {
        aug[i][j] /= pivot;
      }
      
      // Eliminate other rows
      for (let j = 0; j < n; j++) {
        if (j !== i) {
          const factor = aug[j][i];
          for (let k = 0; k < 2 * n; k++) {
            aug[j][k] -= factor * aug[i][k];
          }
        }
      }
      
      return aug.map(row => row.slice(n));
  }
}
}