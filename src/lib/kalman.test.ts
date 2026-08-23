import { describe, it, expect } from 'vitest';
import { KalmanFilter } from './kalman';

describe('KalmanFilter', () => {
  it('initializes state at the center of the initial bbox', () => {
    const kf = new KalmanFilter([10, 20, 100, 50]);
    const state = kf.getState();
    expect(state.x).toBe(60);
    expect(state.y).toBe(45);
    expect(state.w).toBe(100);
    expect(state.h).toBe(50);
    expect(state.vx).toBe(0);
    expect(state.vy).toBe(0);
  });

  it('predict() with zero velocity keeps a stationary object in place', () => {
    const kf = new KalmanFilter([0, 0, 50, 50]);
    const predicted = kf.predict();
    expect(predicted[0]).toBeCloseTo(25 - 25, 5);
    expect(predicted[1]).toBeCloseTo(25 - 25, 5);
    expect(predicted[2]).toBeCloseTo(50, 5);
    expect(predicted[3]).toBeCloseTo(50, 5);
  });

  it('learns constant velocity and extrapolates position', () => {
    const kf = new KalmanFilter([0, 0, 40, 40]);

    // Feed measurements moving +10px/frame in x.
    // Velocity is stored in px/second: +10px/frame at dt=1/30 => ~300 px/s
    let bbox: [number, number, number, number] = [0, 0, 40, 40];
    for (let i = 1; i <= 30; i++) {
      kf.predict();
      bbox = [i * 10, 0, 40, 40];
      kf.update(bbox);
    }

    const vx = kf.getVelocity()[0];
    expect(vx).toBeGreaterThan(250);
    expect(vx).toBeLessThan(350);

    // One predict() advances x by vx*dt ≈ 10px
    const p1 = kf.predict();
    expect(p1[0]).toBeCloseTo(bbox[0] + 10, 1);
  });

  it('update() pulls the estimate toward the measurement', () => {
    const kf = new KalmanFilter([0, 0, 40, 40]);
    kf.predict();

    const measured: [number, number, number, number] = [200, 200, 60, 60];
    const corrected = kf.update(measured);

    // Corrected center should land strictly between prior (20,20) and measurement (230,230)
    const cx = corrected[0] + corrected[2] / 2;
    const cy = corrected[1] + corrected[3] / 2;
    expect(cx).toBeGreaterThan(20);
    expect(cx).toBeLessThan(230);
    expect(cy).toBeGreaterThan(20);
    expect(cy).toBeLessThan(230);

    const state = kf.getState();
    expect(state.w).toBeGreaterThan(40);
    expect(state.w).toBeLessThan(60);
  });

  it('converges to a stationary measurement after repeated updates', () => {
    const kf = new KalmanFilter([0, 0, 40, 40]);
    const target: [number, number, number, number] = [80, 120, 40, 40];

    for (let i = 0; i < 50; i++) {
      kf.predict();
      kf.update(target);
    }

    const state = kf.getState();
    expect(state.x).toBeCloseTo(100, 0);
    expect(state.y).toBeCloseTo(140, 0);
  });

  it('clamps extreme velocity jumps to maxVelocity', () => {
    const kf = new KalmanFilter([0, 0, 40, 40], 1 / 30);
    for (let i = 0; i < 5; i++) {
      kf.predict();
      // Teleport 50000px per frame — far beyond any physical motion
      kf.update([i * 50000, 0, 40, 40]);
    }
    const [vx] = kf.getVelocity();
    expect(Math.abs(vx)).toBeLessThanOrEqual(1000);
  });

  it('reset() reinitializes to the new bbox', () => {
    const kf = new KalmanFilter([0, 0, 40, 40]);
    for (let i = 0; i < 10; i++) {
      kf.predict();
      kf.update([i * 100, 0, 40, 40]);
    }

    kf.reset([500, 300, 80, 60]);
    const state = kf.getState();
    expect(state.x).toBe(540);
    expect(state.y).toBe(330);
    expect(state.vx).toBe(0);
    expect(state.vy).toBe(0);
    expect(state.w).toBe(80);
    expect(state.h).toBe(60);
  });
});
