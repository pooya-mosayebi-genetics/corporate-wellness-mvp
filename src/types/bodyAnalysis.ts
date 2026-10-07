/**
 * ─────────────────────────────────────────────────────────────
 *  ژرفا · Body Analysis Types (Unified Source of Truth)
 *  ⚠️ DEPRECATED: This file now re-exports from data layer.
 *  Please update imports to use '@/data/bodyAnalysisTypes' directly.
 * ─────────────────────────────────────────────────────────────
 */

// 🆕 L-10 Consolidation: Single source of truth is in data layer
export type {
  MetricStatus,
  SymmetryStatus,
  MetricRange,
  MetricResult,
  SegmentalValues,
  SegmentalAnalysis,
  WeightRecommendation,
  BodyAnalysisDerived,
} from '../data/bodyAnalysisTypes';

// 🔄 Backward compatibility alias for old code expecting these names
export type BodyAnalysisRecordLegacy = import('../data/bodyAnalysisTypes').BodyAnalysisRecord;

// 📝 Note: The actual BodyAnalysisRecord interface lives in ../data/bodyAnalysisTypes.ts
// It includes finalized/amendments fields required by Break-glass & Finalize workflows.