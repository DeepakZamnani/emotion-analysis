
/**
 * Simple autocorrelation-based pitch detection (Fundamental Frequency)
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): number {
  let sum = 0;
  let count = 0;
  
  // Calculate RMS for a simple voice activity check
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sum / buffer.length);
  if (rms < 0.01) return 0; // Too quiet

  // Autocorrelation
  const n = buffer.length;
  const correlations = new Float32Array(n);
  for (let lag = 0; lag < n; lag++) {
    let corr = 0;
    for (let i = 0; i < n - lag; i++) {
      corr += buffer[i] * buffer[i + lag];
    }
    correlations[lag] = corr;
  }

  // Find the first peak after the initial dip
  let d = 0;
  while (correlations[d] > correlations[d + 1]) d++;
  
  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < n; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i];
      maxPos = i;
    }
  }

  if (maxPos !== -1) {
    const fundamentalFreq = sampleRate / maxPos;
    // Human voice range is typically 50Hz - 500Hz
    if (fundamentalFreq > 50 && fundamentalFreq < 500) {
      return Math.round(fundamentalFreq);
    }
  }

  return 0;
}

/**
 * Calculates RMS energy (loudness)
 */
export function calculateEnergy(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Calculates Spectral Centroid (Rough "brightness" of sound)
 */
export function calculateSpectralCentroid(freqData: Uint8Array, sampleRate: number): number {
  let numerator = 0;
  let denominator = 0;
  const binSize = sampleRate / (freqData.length * 2);

  for (let i = 0; i < freqData.length; i++) {
    const frequency = i * binSize;
    numerator += frequency * freqData[i];
    denominator += freqData[i];
  }

  return denominator === 0 ? 0 : Math.round(numerator / denominator);
}
