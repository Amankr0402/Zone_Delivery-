/**
 * utils/clustering.ts
 * Weighted k-means clustering on pincode lat/lng, weighted by order count.
 */

import type { Zone, PincodeRecord } from '../types';

// ─── Palette ──────────────────────────────────────────────────────────────────
const ZONE_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6',
  '#a855f7', '#14b8a6', '#ef4444', '#84cc16', '#f97316',
  '#06b6d4', '#ec4899', '#8b5cf6', '#22c55e', '#eab308',
  '#0ea5e9', '#d946ef', '#fb923c', '#4ade80', '#facc15',
];

export function getZoneColor(index: number): string {
  return ZONE_COLORS[index % ZONE_COLORS.length];
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ClusterInput {
  pincode: string;
  area_name: string;
  lat: number;
  lng: number;
  order_count: number;
}

interface Centroid {
  lat: number;
  lng: number;
}

// ─── Euclidean distance (degrees — fine for city-scale clustering) ─────────────
function dist(a: Centroid, b: Centroid): number {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
}

// ─── K-Means ─────────────────────────────────────────────────────────────────
export function kMeansCluster(
  points: ClusterInput[],
  k: number,
  maxIter = 100
): { point: ClusterInput; cluster: number }[] {
  if (points.length === 0) return [];
  const clampedK = Math.min(k, points.length);

  // Init centroids using k-means++ style (spread out)
  const centroids: Centroid[] = initCentroids(points, clampedK);
  let assignments = new Array<number>(points.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assignment step
    const newAssignments = points.map((p) => {
      let minDist = Infinity;
      let minIdx = 0;
      centroids.forEach((c, ci) => {
        const d = dist(p, c);
        if (d < minDist) { minDist = d; minIdx = ci; }
      });
      return minIdx;
    });

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed) break;

    // Update centroids — weighted by order_count
    for (let ci = 0; ci < clampedK; ci++) {
      const members = points.filter((_, i) => assignments[i] === ci);
      if (members.length === 0) continue;
      const totalWeight = members.reduce((s, p) => s + Math.max(p.order_count, 1), 0);
      centroids[ci] = {
        lat: members.reduce((s, p) => s + p.lat * Math.max(p.order_count, 1), 0) / totalWeight,
        lng: members.reduce((s, p) => s + p.lng * Math.max(p.order_count, 1), 0) / totalWeight,
      };
    }
  }

  return points.map((p, i) => ({ point: p, cluster: assignments[i] }));
}

function initCentroids(points: ClusterInput[], k: number): Centroid[] {
  const centroids: Centroid[] = [];
  // Pick first centroid at random
  centroids.push({ lat: points[0].lat, lng: points[0].lng });
  for (let i = 1; i < k; i++) {
    // Pick next centroid: furthest from existing centroids
    let maxDist = -Infinity;
    let best = points[0];
    for (const p of points) {
      const minD = Math.min(...centroids.map((c) => dist(p, c)));
      if (minD > maxDist) { maxDist = minD; best = p; }
    }
    centroids.push({ lat: best.lat, lng: best.lng });
  }
  return centroids;
}

// ─── Build Zone objects from clustering result ────────────────────────────────
export function buildZones(
  result: { point: ClusterInput; cluster: number }[],
  pincodeMap: Map<string, PincodeRecord>
): Zone[] {
  const clusterCount = Math.max(...result.map((r) => r.cluster)) + 1;
  return Array.from({ length: clusterCount }, (_, ci) => {
    const members = result.filter((r) => r.cluster === ci);
    const totalWeight = members.reduce((s, m) => s + Math.max(m.point.order_count, 1), 0);
    const centroid_lat = members.reduce((s, m) => s + m.point.lat * Math.max(m.point.order_count, 1), 0) / totalWeight;
    const centroid_lng = members.reduce((s, m) => s + m.point.lng * Math.max(m.point.order_count, 1), 0) / totalWeight;

    // Zone name: based on approximate area
    const zoneLetter = String.fromCharCode(65 + ci); // A, B, C...
    return {
      zone_id: `zone-${ci + 1}`,
      zone_name: `Zone ${zoneLetter}`,
      pincodes: members.map((m) => m.point.pincode),
      centroid_lat,
      centroid_lng,
      color: getZoneColor(ci),
      order_count: members.reduce((s, m) => s + m.point.order_count, 0),
    } as Zone;
  });
}

// ─── Helper: build ClusterInput from orders + pincode map ─────────────────────
export function buildClusterInputs(
  orders: import('../types').Order[],
  pincodeMap: Map<string, PincodeRecord>
): ClusterInput[] {
  // Count orders per pincode
  const orderCount = new Map<string, number>();
  for (const o of orders) {
    orderCount.set(o.pincode, (orderCount.get(o.pincode) ?? 0) + 1);
  }

  // Collect unique pincodes that have lat/lng
  const seen = new Set<string>();
  const inputs: ClusterInput[] = [];
  for (const o of orders) {
    if (seen.has(o.pincode)) continue;
    seen.add(o.pincode);

    const record = pincodeMap.get(o.pincode);
    const lat = o.lat ?? record?.lat;
    const lng = o.lng ?? record?.lng;
    if (lat == null || lng == null) continue;

    inputs.push({
      pincode: o.pincode,
      area_name: o.area_name || record?.area_name || o.pincode,
      lat,
      lng,
      order_count: orderCount.get(o.pincode) ?? 1,
    });
  }
  return inputs;
}
