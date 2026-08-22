import { useRef, useEffect, useCallback, useState } from 'react';
import { MOTEvaluator, TrackingMetrics, GroundTruthTrack, PredictedTrack } from '../lib/metrics';

export function useTrackingMetrics() {
  const evaluatorRef = useRef<MOTEvaluator | null>(null);
  const [metrics, setMetrics] = useState<TrackingMetrics | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    evaluatorRef.current = new MOTEvaluator();
    return () => {
      evaluatorRef.current?.reset();
    };
  }, []);

  const addGroundTruth = useCallback((frameId: number, tracks: GroundTruthTrack[]) => {
    evaluatorRef.current?.addGroundTruth(frameId, tracks);
  }, []);

  const addPredictions = useCallback((frameId: number, tracks: PredictedTrack[]) => {
    evaluatorRef.current?.addPredictions(frameId, tracks);
  }, []);

  const compute = useCallback(() => {
    const m = evaluatorRef.current?.computeMetrics();
    if (m) setMetrics(m);
    return m;
  }, []);

  const reset = useCallback(() => {
    evaluatorRef.current?.reset();
    setMetrics(null);
  }, []);

  const toggle = useCallback((on: boolean) => {
    setEnabled(on);
    if (!on) reset();
  }, [reset]);

  return {
    metrics,
    enabled,
    addGroundTruth,
    addPredictions,
    compute,
    reset,
    toggle
  };
}