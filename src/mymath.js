// Copyright (c) 2021 ST John

import * as m from "ml-matrix";
import { randomNormal, randomLcg } from "d3-random";

export function linspace(start, stop, num) {
  // endpoint=True behaviour from np.linspace
  const step = (stop - start) / (num - 1);
  return Array.from({ length: num }, (_, i) => start + step * i);
}

export function gaussian(mean, variance) {
  return (y) =>
    Math.exp(-Math.pow(y - mean, 2) / (2 * variance)) /
    Math.sqrt(2 * Math.PI * variance);
}

export function cholesky(A) {
  const chol = new m.CholeskyDecomposition(A);
  return chol.lowerTriangularMatrix; // L such that LL^T = A
}

export function covEllipse(covMat) {
  // https://www.visiondummy.com/2014/04/draw-error-ellipse-representing-covariance-matrix/
  // http://cs229.stanford.edu/section/gaussians.pdf
  const e = new m.EigenvalueDecomposition(covMat);
  const eigvals = e.realEigenvalues;
  const largestEigvec = e.eigenvectorMatrix.getColumn(0);
  const alpha = Math.atan2(largestEigvec[1], -largestEigvec[0]);
  return {
    width: Math.sqrt(eigvals[0]),
    length: Math.sqrt(eigvals[1]),
    angle: (alpha * 180) / Math.PI,
  };
}

export function svdSqrt(A) {
  const e = new m.EigenvalueDecomposition(A);
  const r = e.eigenvectorMatrix;
  const d = m.Matrix.zeros(r.rows, r.columns);
  for (let i = 0; i < d.rows; ++i) {
    d.set(i, i, Math.sqrt(e.realEigenvalues[i]));
  }
  return r.mmul(d);
}

export function matrixSqrt(A) {
  return svdSqrt(A);
}

export function randn(rows, cols, seed) {
  const randn1 = randomNormal.source(randomLcg(seed))();
  const v = m.Matrix.zeros(rows, cols);
  for (let j = 0; j < cols; ++j) {
    for (let i = 0; i < rows; ++i) {
      v.set(i, j, randn1());
    }
  }
  return v;
}

// export function sampleMvn(meanVec, covChol, numSamples=1) {
// 	const v = randn(meanVec.length, numSamples)
// 	const meanMat = m.Matrix.columnVector(meanVec);  // TODO fix for numSamples>1
// 	const samples = m.Matrix.add(meanMat, covChol.mmul(v));
// 	return samples;
// }

export function sampleMvn(meanVec, covSqrt, v) {
  //export function sampleMvn(meanVec, covSqrt, numSamples=1) {
  //const v = randn(meanVec.length, numSamples);
  if (v === undefined) {
    return m.Matrix.zeros(meanVec.length, 1);
  }
  const Lv = covSqrt.mmul(v);
  return Lv.addColumnVector(meanVec);
}
