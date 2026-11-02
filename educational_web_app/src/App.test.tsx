// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('learning journey smoke', () => {
  it('shows a safe fallback rather than clamping an invalid generated rate', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /08.*GenAI/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Explore/ }));
    fireEvent.click(screen.getByRole('button', { name: /Run sanitize_llm_draft/ }));
    expect(screen.getByText(/Rejected.*stub_fallback/)).toBeTruthy();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.03' } });
    fireEvent.click(screen.getByRole('button', { name: /Run sanitize_llm_draft/ }));
    expect(screen.getByText(/Accepted.*0.030/)).toBeTruthy();
  });

  it('navigates lesson tabs by keyboard and opens progress details', () => {
    render(<App />);
    const learn = screen.getByRole('tab', { name: /Learn & predict/ });
    fireEvent.keyDown(learn, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Explore/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: /Check/ }));
    expect(screen.getByRole('heading', { name: /Module check/ })).toBeTruthy();

    const progressBtns = screen.getAllByRole('button', { name: /Open learning progress/ });
    fireEvent.click(progressBtns[0]);
    expect(screen.getByRole('dialog', { name: 'Learning progress' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Learning progress' })).toBeNull();
  });

  it('opens and closes glossary with keyboard Escape', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Glossary/ }));
    expect(screen.getByRole('dialog', { name: 'Glossary' })).toBeTruthy();
    expect(screen.getByText('CATWOE')).toBeTruthy();
    expect(screen.getByText('POPIT')).toBeTruthy();
    expect(screen.getByText('RASCI')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Glossary' })).toBeNull();
  });

  it('renders CATWOE, POPIT, and RASCI stakeholder sub-tabs in Explore mode', () => {
    render(<App />);
    const exploreTab = screen.getByRole('tab', { name: /Explore/ });
    fireEvent.click(exploreTab);

    // Verify Personas default view
    expect(screen.getByText('Stakeholder map')).toBeTruthy();

    // Switch to CATWOE
    const catwoeBtn = screen.getByRole('tab', { name: /CATWOE Analysis/ });
    fireEvent.click(catwoeBtn);
    expect(screen.getByText(/CATWOE Framework/)).toBeTruthy();
    expect(screen.getByText('Peter Checkland SSM')).toBeTruthy();

    // Switch to POPIT
    const popitBtn = screen.getByRole('tab', { name: /POPIT Dimensions/ });
    fireEvent.click(popitBtn);
    expect(screen.getByText(/POPIT Business Change Model/)).toBeTruthy();
    expect(screen.getByText('BCS Holistic Change')).toBeTruthy();

    // Switch to RASCI
    const rasciBtn = screen.getByRole('tab', { name: /RASCI Matrix/ });
    fireEvent.click(rasciBtn);
    expect(screen.getByText(/RASCI Responsibility Assignment Matrix/)).toBeTruthy();
    expect(screen.getByText('Single Accountability (A)')).toBeTruthy();
  });

  it('renders DataModule sub-tabs across timeline, controls, simulators, and schema', () => {
    render(<App />);
    // Navigate to 04 Data module
    const dataNav = screen.getByRole('button', { name: /04 Data/ });
    fireEvent.click(dataNav);

    // Switch to Explore view
    const exploreTab = screen.getByRole('tab', { name: /Explore/ });
    fireEvent.click(exploreTab);

    // Timeline view (default)
    expect(screen.getByText(/Observation Window \(≤ t\) vs Prediction Window \(t\+1\)/)).toBeTruthy();
    expect(screen.getByText(/ADR 004 Edge Case Check/)).toBeTruthy();

    // Switch to 5 Leakage Controls Matrix
    const controlsTab = screen.getByRole('tab', { name: /5 Leakage Controls Matrix/ });
    fireEvent.click(controlsTab);
    expect(screen.getByText(/Defensive Engineering Pillars/)).toBeTruthy();
    expect(screen.getAllByText(/Temporal Target Leakage/).length).toBeGreaterThan(0);

    // Switch to Interactive Simulators
    const simulatorsTab = screen.getByRole('tab', { name: /Interactive Simulators/ });
    fireEvent.click(simulatorsTab);
    expect(screen.getByText('Temporal Leakage Simulator')).toBeTruthy();
    expect(screen.getByText('Notebook Hidden-State Lab')).toBeTruthy();

    // Switch to Data Sources & Schema
    const schemaTab = screen.getByRole('tab', { name: /Data Sources & Schema/ });
    fireEvent.click(schemaTab);
    expect(screen.getByText('accounts.csv')).toBeTruthy();
    expect(screen.getByText('Serving Feature Contract (49 Features)')).toBeTruthy();
  });

  it('renders MlModule sub-tabs across threshold, model, shap, and governance', () => {
    render(<App />);
    // Navigate to 05 Model module
    const mlNav = screen.getByRole('button', { name: /05 Model/ });
    fireEvent.click(mlNav);

    // Switch to Explore view
    const exploreTab = screen.getByRole('tab', { name: /Explore/ });
    fireEvent.click(exploreTab);

    // Threshold view (default)
    expect(screen.getByText(/The 3-Way Threshold Decision Matrix/)).toBeTruthy();
    expect(screen.getByText(/Option 3: Shipped Capacity Cut/)).toBeTruthy();

    // Switch to Model Architecture & Benchmarking
    const modelTab = screen.getByRole('tab', { name: /Model Architecture & Benchmarking/ });
    fireEvent.click(modelTab);
    expect(screen.getByText(/Why XGBoost over Deep Learning \/ TabFM\?/)).toBeTruthy();
    expect(screen.getByText(/Benchmark vs Baseline Heuristic/)).toBeTruthy();

    // Switch to SHAP Drivers & Explainability
    const shapTab = screen.getByRole('tab', { name: /SHAP Drivers & Explainability/ });
    fireEvent.click(shapTab);
    expect(screen.getByText(/Global SHAP: Feature Importance Ranking/)).toBeTruthy();
    expect(screen.getAllByText(/Running_Balance_Rounded/).length).toBeGreaterThan(0);

    // Switch to Governance & Serving
    const govTab = screen.getByRole('tab', { name: /Governance & Serving/ });
    fireEvent.click(govTab);
    expect(screen.getByText(/ADR 014: Continuous Probabilities vs Ops Cut/)).toBeTruthy();
    expect(screen.getByText(/Fairness & Equalized Odds Audit/)).toBeTruthy();
  });

  it('runs the Causal Lab: threshold dial, boosting, test-set sandbox, calibration and dual track', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /05 Model/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Explore/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Causal Lab & Decision Simulator/ }));

    // Section tabs follow the ARIA tab keyboard pattern, including focus movement.
    const thresholdTab = screen.getByRole('tab', { name: /Threshold & capacity dial/ });
    thresholdTab.focus();
    fireEvent.keyDown(thresholdTab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Boosting & learning rate/ }).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Boosting & learning rate/ }));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    expect(thresholdTab.getAttribute('aria-selected')).toBe('true');

    // The dial opens on the shipped cut, which is a measured point.
    const dial = screen.getByLabelText(/Decision threshold t/) as HTMLInputElement;
    expect(screen.getByText('Measured on test')).toBeTruthy();
    expect(screen.getByText(/Model Quality . Decision Threshold/)).toBeTruthy();

    // Moving off a measured anchor must label the readout as interpolated,
    // and the locked panel must keep reporting the same AUCs.
    fireEvent.change(dial, { target: { value: '0.6' } });
    expect(screen.getByText('Estimated (interpolated)')).toBeTruthy();
    expect(screen.getAllByText('0.723').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0.219').length).toBeGreaterThan(0);
    fireEvent.change(dial, { target: { value: '0.8' } });
    expect(screen.getByText('Estimated (extrapolated)')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Boosting & learning rate/ }));
    expect(screen.getByLabelText(/Learning rate/)).toBeTruthy();
    expect(screen.getByText(/The maths, in four steps/)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /One decision-making exposure/ }));
    expect(screen.getByText(/Holdout still independent/)).toBeTruthy();
    const safeTab = screen.getByRole('tab', { name: /Safe workflow/ });
    safeTab.focus();
    fireEvent.keyDown(safeTab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Feedback-leakage trap/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' });
    expect(safeTab.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByText(/Test evaluations so far:/).textContent).toContain('1');
    fireEvent.click(screen.getByRole('tab', { name: /Feedback-leakage trap/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByText(/Holdout contaminated/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByText(/Holdout contaminated/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByText(/ROC-AUC stays at 0.82/)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Score vs probability/ }));
    expect(screen.getByText(/The naive reading/)).toBeTruthy();
    expect(screen.getAllByText(/churn_probability/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: /ML vs AI Engineering/ }));
    expect(screen.getByText(/A model score is evidence, not permission to act/)).toBeTruthy();
  });

  it('expands a memory chain and shows its links', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /05 Model/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Explore/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Causal Lab & Decision Simulator/ }));

    const chain = screen.getByRole('button', { name: /PR-AUC chain/ });
    expect(chain.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(chain);
    expect(chain.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/BUT ranking . operational policy/)).toBeTruthy();
  });

});
