/* A browser-only simulation of Meridian's review flow. Fixed demo scores are
   descriptive examples, never model inference. State lasts for this tab only. */
(() => {
  'use strict';
  const CUT = 0.70055;
  const cases = [
    { id: 'demo-01', label: 'Case 01', title: 'Activity has stopped', score: 0.751, balance: '$0', inactive: 6, transactions: 0,
      summary: 'A quiet account with a recent balance drop.',
      signals: 'This sample has six months without active transactions and a $10,000 balance drop. It uses account values and an approximate score from the flagged project fixture.' },
    { id: 'demo-02', label: 'Case 02', title: 'Below the queue cut', score: 0.207, balance: '$50', inactive: 2, transactions: 1,
      summary: 'A lower-ranked case stays outside the contact queue.',
      signals: 'This sample has a $50 balance, one transaction in the month, and two inactive months. It uses account values and an approximate score from the below-threshold project fixture. A low score does not mean zero risk.' },
    { id: 'demo-03', label: 'Case 03', title: 'Another case to weigh', score: 0.824, balance: '$120', inactive: 4, transactions: 0,
      summary: 'A second eligible case, ready for your judgement.',
      signals: 'This invented example has a $120 balance and four inactive months. Its score is made up to let you try a separate review decision. It is not an output from the Meridian model.' },
  ];
  const $ = id => document.getElementById(id);
  // Only constant markup and escaped sample values enter rendered HTML. User
  // edits are assigned through control.value so they always remain plain text.
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const state = { selected: cases[0].id, reviewId: null, view: 'customers', role: 'agent', tips: true, drafts: {}, events: [] };
  const selectedCase = () => cases.find(item => item.id === state.selected);
  const currentDraft = () => state.drafts[state.reviewId];
  const isAgent = () => state.role === 'agent';

  function announce(text) { $('announcement').textContent = text; }

  function addEvent(type, item, detail) {
    state.events.push({ type, label: item.label, detail, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
  }

  function updateChrome() {
    const drafts = Object.values(state.drafts);
    $('queue-count').textContent = drafts.filter(draft => draft.status === 'pending').length;
    $('audit-count').textContent = state.events.length;
    $('role-description').textContent = isAgent() ? 'Explore cases, edit drafts, and record decisions.' : 'Read drafts and audit events. Decisions stay with the agent.';
    $('guide').hidden = !state.tips;
    $('guide-toggle').textContent = state.tips ? 'Hide tips' : 'Show tips';
    $('guide-toggle').setAttribute('aria-expanded', String(state.tips));
    const activeDraft = state.view === 'customers' ? state.drafts[state.selected] : currentDraft();
    const stage = activeDraft ? (activeDraft.status === 'pending' ? 1 : 3) : 0;
    ['explore', 'review', 'record'].forEach((name, index) => {
      const step = $(`step-${name}`);
      const done = index < stage;
      step.classList.toggle('done', done);
      step.firstElementChild.textContent = done ? '✓' : index + 1;
      if (index === stage) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    $('session-status').textContent = drafts.some(draft => draft.status !== 'pending') ? 'A human decision, recorded' : drafts.length ? 'Your draft is ready for review' : 'A fresh space to explore';
    let tip;
    if (!isAgent()) tip = 'Inspect a draft or the audit trail. This view makes decisions visible while keeping decision rights with the agent.';
    else if (state.view === 'audit') tip = 'Follow the trail from draft to decision. A record of each step helps a reviewer understand what happened.';
    else if (activeDraft && activeDraft.status !== 'pending') tip = 'Your decision is recorded. See the trail, or compare the lower-ranked case to explore why it stays outside the queue.';
    else if (state.view === 'review' && activeDraft) tip = 'Make the draft your own if you wish. Check the text and rate, then approve or reject. This is where your judgement takes over.';
    else if (selectedCase().score < CUT) tip = 'No draft is created here: limited review time goes to higher-ranked cases. Compare Case 01 to try the other path.';
    else tip = 'Start with this case, or compare another. A high score invites a review; it does not make the decision.';
    $('guide-text').textContent = tip;
  }

  function showView(view, focus = true) {
    state.view = view;
    for (const name of ['customers', 'review', 'audit']) {
      $(`${name}-panel`).hidden = name !== view;
      if (name === view) $(`view-${name}`).setAttribute('aria-current', 'page');
      else $(`view-${name}`).removeAttribute('aria-current');
    }
    if (view === 'customers') renderCases();
    if (view === 'review') renderReview();
    if (view === 'audit') renderAudit();
    updateChrome();
    if (focus) {
      $(view === 'customers' ? 'customers-heading' : `${view}-heading`).focus({ preventScroll: true });
      $('workspace').scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }

  function renderCases() {
    $('case-list').innerHTML = cases.map(item => `<button type="button" class="case-choice" id="case-${item.id}" aria-pressed="${item.id === state.selected}"><span class="case-id">${item.label.toUpperCase()}</span><strong>${item.title}</strong><span class="small muted">${item.score.toFixed(3)} · ${item.score >= CUT ? 'In the review range' : 'Outside the queue'}</span></button>`).join('');
    cases.forEach(item => $(`case-${item.id}`).addEventListener('click', () => {
      state.selected = item.id;
      renderCases();
      updateChrome();
      $(`case-${item.id}`).focus({ preventScroll: true });
      announce(`${item.label} selected. Score ${item.score.toFixed(3)}. ${item.score >= CUT ? 'Eligible for a draft.' : 'Below the queue cut. No draft can be created.'}`);
    }));
    const item = selectedCase();
    const eligible = item.score >= CUT;
    const draft = state.drafts[item.id];
    $('case-detail').innerHTML = `
      <div class="case-title-row"><h3>${item.label} / Monthly account snapshot</h3><span class="status-tag ${eligible ? '' : 'neutral'}">${eligible ? 'Eligible for review' : 'No draft needed'}</span></div>
      <p class="case-summary">${item.summary}</p>
      <div class="score-block"><div class="score-labels"><span>Sample ranking score <strong>${item.score.toFixed(3)}</strong></span><span class="muted">Cut: 0.70055</span></div>
        <div class="score-track" aria-hidden="true"><div class="score-fill" style="width:${item.score * 100}%"></div><span class="score-cut"></span></div>
        <div class="score-axis" aria-hidden="true"><span>0 / LOWER RANK</span><span>QUEUE CUT ↑</span><span>1 / HIGHER RANK</span></div>
      </div>
      <dl class="case-signals"><div><dt>Current balance</dt><dd>${item.balance}</dd></div><div><dt>Inactive months</dt><dd>${item.inactive} months</dd></div><div><dt>Transactions / month</dt><dd>${item.transactions}</dd></div></dl>
      <details class="signal-details"><summary>What is behind this sample?</summary><p>${item.signals}</p><p>These are account signals, not live model explanations. The score is a ranking value, not a percentage chance of leaving.</p></details>
      <div class="case-action"><button class="primary-button" id="create-draft" type="button" ${!isAgent() || !eligible ? 'disabled' : ''}>${draft ? 'Open the draft' : 'Prepare a sample draft'} <span aria-hidden="true">→</span></button><span class="small muted">${!isAgent() ? 'Only the Retention agent can create drafts.' : !eligible ? 'Below the cut. Review time stays with higher-ranked cases.' : draft ? 'Your existing draft is kept for this session.' : 'A starting point for a person to review.'}</span></div>`;
    $('create-draft').addEventListener('click', () => {
      if (!isAgent() || !eligible) return;
      if (!state.drafts[item.id]) {
        state.drafts[item.id] = {
          id: item.id, label: item.label, status: 'pending', subject: 'A little more from your Meridian savings',
          body: 'Hello,\n\nWe noticed your savings account has been quiet recently. To help you get more from your savings, we would like to offer you the annual rate shown below.\n\nIf your needs have changed, reply to this email and we will be happy to talk through your options. There is no obligation to make a change.\n\nKind regards,\nThe Meridian savings team',
          rate: '3.25', ack: false, edited: false,
        };
        addEvent('created', item, 'Sample template created. Status: pending review.');
      }
      state.reviewId = item.id;
      showView('review');
      announce('Sample draft prepared. Review the text and proposed rate before deciding.');
    });
  }

  function emptyPanel(id, title, text) {
    const actionId = `${id}-explore`;
    $(id).innerHTML = `<div class="panel-heading"><div><p class="eyebrow">${id === 'review-panel' ? '02 / ADD YOUR JUDGEMENT' : '03 / KEEP THE RECORD'}</p><h2 id="${id === 'review-panel' ? 'review' : 'audit'}-heading" tabindex="-1">${title}</h2></div></div><div class="empty-state"><h3>${id === 'review-panel' ? 'No drafts yet' : 'Your trail starts with a draft'}</h3><p>${text}</p><button type="button" class="primary-button" id="${actionId}">Explore the sample cases <span aria-hidden="true">→</span></button></div>`;
    $(actionId).addEventListener('click', () => showView('customers'));
  }

  function renderReview() {
    const drafts = Object.values(state.drafts);
    if (!drafts.length) {
      emptyPanel('review-panel', 'A draft is just the beginning.', 'Choose a case and prepare a sample draft. Then make it your own.');
      return;
    }
    if (!currentDraft()) state.reviewId = drafts[0].id;
    const draft = currentDraft();
    const editable = isAgent() && draft.status === 'pending';
    const final = draft.status !== 'pending';
    $('review-panel').innerHTML = `<div class="panel-heading"><div><p class="eyebrow">02 / ADD YOUR JUDGEMENT</p><h2 id="review-heading" tabindex="-1">A draft. Your decision.</h2></div><span class="small muted">Source: local demo template</span></div>
      ${final ? `<div id="completion" class="completion"><div class="completion-top"><span class="completion-mark" aria-hidden="true">✓</span><div><h3>Review complete.</h3><p>You ${draft.status} ${draft.label.toLowerCase()}'s draft. The decision is recorded and the draft is now locked. No email was sent.</p></div></div><div class="completion-actions"><button class="quiet-button" type="button" id="see-record">See your decision trail →</button><button class="quiet-button" type="button" id="compare-case">Try the lower-ranked case ↗</button></div></div>` : ''}
      <div class="draft-topline"><label for="draft-picker">Your drafts</label><select id="draft-picker">${drafts.map(d => `<option value="${d.id}" ${d.id === draft.id ? 'selected' : ''}>${d.label} · ${d.status === 'pending' ? 'Pending review' : d.status}</option>`).join('')}</select></div>
      <div class="draft-box"><div class="case-title-row"><h3 id="review-case">${draft.label} / Retention draft</h3><span class="status-tag ${draft.status === 'rejected' ? 'rejected' : ''}">${draft.status === 'pending' ? 'Pending review' : draft.status === 'approved' ? 'Approved · locked' : 'Rejected · locked'}</span></div>
      <label for="draft-subject">Subject</label><input id="draft-subject" maxlength="200" ${editable ? '' : 'readonly'}>
      <label for="draft-body">Message${editable ? ' · feel free to edit' : ' · read-only'}</label><textarea id="draft-body" rows="7" maxlength="5000" ${editable ? '' : 'readonly'}></textarea>
      <label for="draft-rate">Proposed annual interest rate (%)</label><div class="rate-line"><input id="draft-rate" type="number" min="0" max="3.5" step="0.05" aria-describedby="rate-help draft-validation" ${editable ? '' : 'readonly'}><span id="rate-help" class="small muted">Up to 3.5% · an offer limit, not a model prediction</span></div>
      <p id="draft-validation" class="validation-note" role="status"></p>
      <label class="ack-label" for="review-ack"><input type="checkbox" id="review-ack" ${editable ? '' : 'disabled'}><span>I have reviewed the message, rate, and sample case. I am ready to approve this draft.</span></label>
      <div class="review-actions"><button type="button" class="primary-button" id="approve">Approve draft <span aria-hidden="true">✓</span></button><button type="button" class="secondary-button" id="reject">Reject draft</button></div>
      <p class="review-footnote" id="decision-help">${final ? 'This decision is final for this demo. Try another case, or start fresh.' : !isAgent() ? 'Read-only view. Switch to Retention agent to edit or decide.' : 'Approval needs your review acknowledgement. Rejection does not. Neither sends an email.'}</p></div>`;
    $('draft-subject').value = draft.subject;
    $('draft-body').value = draft.body;
    $('draft-rate').value = draft.rate;
    $('review-ack').checked = draft.ack;
    for (const [id, field] of [['draft-subject', 'subject'], ['draft-body', 'body'], ['draft-rate', 'rate']]) {
      $(id).addEventListener('input', () => {
        if (!isAgent() || draft.status !== 'pending') return;
        draft[field] = $(id).value;
        draft.edited = true;
        draft.ack = false;
        $('review-ack').checked = false;
        updateDecisionControls();
      });
    }
    $('review-ack').addEventListener('change', () => {
      if (!isAgent() || draft.status !== 'pending') return;
      draft.ack = $('review-ack').checked;
      updateDecisionControls();
    });
    $('draft-picker').addEventListener('change', () => {
      state.reviewId = $('draft-picker').value;
      state.selected = state.reviewId;
      renderReview();
      updateChrome();
      $('draft-picker').focus({ preventScroll: true });
    });
    $('approve').addEventListener('click', () => decide('approved'));
    $('reject').addEventListener('click', () => decide('rejected'));
    if (final) {
      $('see-record').addEventListener('click', () => showView('audit'));
      $('compare-case').addEventListener('click', () => {
        state.selected = 'demo-02';
        showView('customers');
      });
    }
    updateDecisionControls();
  }

  function draftValid(draft) {
    return draft.subject.trim().length > 0 && draft.body.trim().length > 0 && draft.rate.trim() !== '' && Number.isFinite(Number(draft.rate)) && Number(draft.rate) >= 0 && Number(draft.rate) <= 3.5;
  }

  function updateDecisionControls() {
    const draft = currentDraft();
    const valid = draftValid(draft);
    const canDecide = isAgent() && draft.status === 'pending' && valid;
    $('approve').disabled = !canDecide || !draft.ack;
    $('reject').disabled = !canDecide;
    $('draft-validation').textContent = valid ? '' : 'Use a subject, a message, and a rate from 0% to 3.5% before recording a decision.';
    for (const id of ['approve', 'reject']) $(id).setAttribute('aria-describedby', 'draft-validation decision-help');
  }

  function decide(status) {
    const draft = currentDraft();
    // Recheck the rules at the action, as well as disabling unavailable buttons.
    if (!isAgent() || !draft || draft.status !== 'pending' || !draftValid(draft) || (status === 'approved' && !draft.ack)) return;
    const item = cases.find(item => item.id === draft.id);
    if (draft.edited) addEvent('edited', item, `Reviewed edits recorded with the decision. Proposed rate: ${Number(draft.rate).toFixed(2)}%.`);
    draft.status = status;
    addEvent(status, item, `${status === 'approved' ? 'Review acknowledged. ' : ''}Draft locked. No email was sent.`);
    renderReview();
    updateChrome();
    $('review-heading').focus({ preventScroll: true });
    $('workspace').scrollIntoView({ block: 'start', behavior: 'instant' });
    announce(`Review complete. ${draft.label} ${status}. Your decision was recorded. No email was sent.`);
  }

  function renderAudit() {
    if (!state.events.length) {
      emptyPanel('audit-panel', 'Every decision leaves a trail.', 'Prepare a draft and make a decision to see the record take shape.');
      return;
    }
    const labels = { created: 'Draft prepared', edited: 'Draft edits recorded', approved: 'Draft approved', rejected: 'Draft rejected' };
    $('audit-panel').innerHTML = `<div class="panel-heading"><div><p class="eyebrow">03 / KEEP THE RECORD</p><h2 id="audit-heading" tabindex="-1">The thinking leaves a trace.</h2></div><span class="small muted">This demo session</span></div><p class="audit-intro">From the first draft to your final decision. In the full application, audit events are stored by the service. This sample trail lasts only for this tab.</p><ol class="audit-list">${state.events.map(event => `<li data-event="${event.type}"><span class="event-symbol" aria-hidden="true">${event.type === 'created' ? '+' : event.type === 'edited' ? '↗' : '✓'}</span><div class="event-body"><strong>${event.label} · ${labels[event.type]}</strong><p>${escape(event.detail)}</p><p>Retention agent · demo role</p></div><time>${event.time}</time></li>`).join('')}</ol><div class="case-action"><button type="button" class="secondary-button" id="audit-back">Explore another case <span aria-hidden="true">→</span></button></div>`;
    $('audit-back').addEventListener('click', () => showView('customers'));
  }

  for (const view of ['customers', 'review', 'audit']) $(`view-${view}`).addEventListener('click', () => showView(view));
  $('role').addEventListener('change', () => {
    state.role = $('role').value;
    Object.values(state.drafts).filter(draft => draft.status === 'pending').forEach(draft => { draft.ack = false; });
    showView(state.view, false);
    announce(isAgent() ? 'Retention agent view. You can edit and decide pending drafts.' : 'Compliance viewer. Drafts and decisions are read-only.');
  });
  $('guide-toggle').addEventListener('click', () => { state.tips = !state.tips; updateChrome(); });
  $('reset-demo').addEventListener('click', () => {
    state.selected = cases[0].id;
    state.reviewId = null;
    state.drafts = {};
    state.events = [];
    state.role = 'agent';
    $('role').value = 'agent';
    showView('customers');
    announce('Fresh demo started. All session drafts and events cleared.');
  });
  showView('customers', false);
})();
