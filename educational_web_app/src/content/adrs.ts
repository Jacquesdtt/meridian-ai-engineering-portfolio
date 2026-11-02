/**
 * Bundled ADR markdown for module 02 (Repo & ADR Spine).
 *
 * Source of truth: `Docs/Architecture/ADRs/` in the main Meridian repo.
 * Vite `?raw` imports snapshot the files at build time for offline teaching.
 */

import adr001 from '@meridian-adrs/001-global-python-applocker-mitigation.md?raw';
import adr002 from '@meridian-adrs/002-pydantic-strict-io.md?raw';
import adr003 from '@meridian-adrs/003-friction-as-a-feature-genai-gating.md?raw';
import adr004 from '@meridian-adrs/004-churn-target-and-predictive-window.md?raw';
import adr005 from '@meridian-adrs/005-portable-model-export-for-serving.md?raw';
import adr006 from '@meridian-adrs/006-sqlite-and-in-process-ui-for-friction-gate.md?raw';
import adr007 from '@meridian-adrs/007-demo-glass-box-rbac.md?raw';
import adr008 from '@meridian-adrs/008-split-brain-state.md?raw';
import adr009 from '@meridian-adrs/009-sqlite-mlflow-tracking-backend.md?raw';
import adr010 from '@meridian-adrs/010-applocker-safe-in-memory-rag.md?raw';
import adr011 from '@meridian-adrs/011-single-file-streamlit-routing.md?raw';
import adr012 from '@meridian-adrs/012-fairness-and-compliance-guardrails.md?raw';
import adr013 from '@meridian-adrs/013-azure-openai-resilience-tenacity-telemetry.md?raw';
import adr014 from '@meridian-adrs/014-portable-submission-inference.md?raw';

/** ADR id → full markdown body (includes title line). */
export const ADR_BODIES: Record<string, string> = {
  '001': adr001,
  '002': adr002,
  '003': adr003,
  '004': adr004,
  '005': adr005,
  '006': adr006,
  '007': adr007,
  '008': adr008,
  '009': adr009,
  '010': adr010,
  '011': adr011,
  '012': adr012,
  '013': adr013,
  '014': adr014,
};

export function getAdrBody(id: string): string | undefined {
  return ADR_BODIES[id];
}
