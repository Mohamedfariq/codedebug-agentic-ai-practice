/**
 * CodeMentor AI - Frontend Application Logic
 * Supports Option 1 (Problem Link - LeetCode, etc.) and Option 2 (Manual Pasting)
 */

// Configuration & State
const state = {
  apiUrl: localStorage.getItem('codementor_api_url') || 'http://127.0.0.1:8000/analyze',
  extractUrl: localStorage.getItem('codementor_extract_url') || 'http://127.0.0.1:8000/extract-problem',
  healthUrl: localStorage.getItem('codementor_health_url') || 'http://127.0.0.1:8000/health',
  inputMode: 'link', // 'link' | 'manual'
  extractedData: null,
  isLoading: false,
  currentAbortController: null,
  timerInterval: null,
  stepInterval: null,
  startTime: null,
  lastResult: null,
};

// Preset Sample Problems (LeetCode & Competitive Programming)
const SAMPLE_PROBLEMS = {
  climbing_stairs_lc: {
    mode: 'link',
    url: 'https://leetcode.com/problems/climbing-stairs-ii/',
    problem: "You are climbing a staircase with n + 1 steps, numbered from 0 to n. You start from step 0 with cost = 0. Return the minimum total cost to reach step n.",
    sample_input: "n = 4, costs = [1,2,3,4]",
    sample_output: "13",
    code: `class Solution:
    def climbStairs(self, n: int, costs: List[int]) -> int:
        dp = [float('inf')] * (n + 1)
        dp[0] = 0
        for i in range(1, n + 1):
            for j in range(i - 1, max(-1, i - 4), -1):
                dp[i] = min(dp[i], dp[j] + costs[i - 1] + (i - j)**2)
        ans = dp[n]
        return ans`
  },
  two_sum_lc: {
    mode: 'link',
    url: 'https://leetcode.com/problems/two-sum/',
    problem: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    sample_input: "nums = [2,7,11,15], target = 9",
    sample_output: "[0,1]",
    code: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Contains a bug: outer loop starts at index 1 instead of 0
        for i in range(1, len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j]
        return []`
  },
  find_max_bug: {
    mode: 'manual',
    problem: "Find the maximum element in an array of integers.",
    sample_input: "5\n1 5 3 2 4\n",
    sample_output: "5",
    code: `# This code contains a logical bug (uses min instead of max)\nn = int(input())\na = list(map(int, input().split()))\nprint(min(a))`
  },
  palindrome_bug: {
    mode: 'manual',
    problem: "Check whether a given string is a palindrome. Output 'True' if it is a palindrome, else 'False'.",
    sample_input: "Racecar",
    sample_output: "True",
    code: `# Case sensitivity bug: does not lowercase string\ns = input().strip()\nprint(s == s[::-1])`
  }
};

// DOM Elements
const elements = {
  form: document.getElementById('codeForm'),
  submitBtn: document.getElementById('submitBtn'),
  clearBtn: document.getElementById('clearBtn'),
  exampleSelector: document.getElementById('exampleSelector'),

  // Mode Switcher Elements
  modeLinkBtn: document.getElementById('modeLinkBtn'),
  modeManualBtn: document.getElementById('modeManualBtn'),
  linkModeContainer: document.getElementById('linkModeContainer'),
  manualModeContainer: document.getElementById('manualModeContainer'),
  inputSectionTitle: document.getElementById('inputSectionTitle'),

  // Option 1 Link Elements
  problemUrlInput: document.getElementById('problemUrlInput'),
  clearUrlBtn: document.getElementById('clearUrlBtn'),
  fetchProblemBtn: document.getElementById('fetchProblemBtn'),
  extractLoading: document.getElementById('extractLoading'),
  extractedSummary: document.getElementById('extractedSummary'),
  extractedTitleText: document.getElementById('extractedTitleText'),
  toggleExtractedDetailsBtn: document.getElementById('toggleExtractedDetailsBtn'),
  toggleDetailsLabel: document.getElementById('toggleDetailsLabel'),
  toggleDetailsIcon: document.getElementById('toggleDetailsIcon'),
  extractedDetailsPanel: document.getElementById('extractedDetailsPanel'),
  extractedProblemPreview: document.getElementById('extractedProblemPreview'),
  extractedSampleInputPreview: document.getElementById('extractedSampleInputPreview'),
  extractedSampleOutputPreview: document.getElementById('extractedSampleOutputPreview'),
  quickPills: document.querySelectorAll('.quick-link-pill'),

  // Option 2 Manual Inputs
  problemInput: document.getElementById('problemInput'),
  sampleInput: document.getElementById('sampleInput'),
  sampleOutput: document.getElementById('sampleOutput'),

  // Shared Code Input
  codeInput: document.getElementById('codeInput'),
  codeEditorHint: document.getElementById('codeEditorHint'),

  // Backend status
  backendStatusPill: document.getElementById('backendStatusPill'),
  backendStatusDot: document.getElementById('backendStatusDot'),
  backendStatusText: document.getElementById('backendStatusText'),

  // Settings modal
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsModal: document.getElementById('closeSettingsModal'),
  apiUrlInput: document.getElementById('apiUrlInput'),
  extractUrlInput: document.getElementById('extractUrlInput'),
  healthUrlInput: document.getElementById('healthUrlInput'),
  testConnectionBtn: document.getElementById('testConnectionBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  openSettingsFromErr: document.getElementById('openSettingsFromErr'),

  // Output cards / states
  outputCard: document.getElementById('outputCard'),
  idleState: document.getElementById('idleState'),
  loadingState: document.getElementById('loadingState'),
  loadingTimer: document.getElementById('loadingTimer'),
  cancelAnalysisBtn: document.getElementById('cancelAnalysisBtn'),
  errorState: document.getElementById('errorState'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),
  resultsState: document.getElementById('resultsState'),

  // Results Top Bar
  badgeExecution: document.getElementById('badgeExecution'),
  badgeSample: document.getElementById('badgeSample'),
  badgeFailedCount: document.getElementById('badgeFailedCount'),
  resultTime: document.getElementById('resultTime'),

  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  tabFailedBadge: document.getElementById('tabFailedBadge'),
  viewFullAnalysisBtn: document.getElementById('viewFullAnalysisBtn'),

  // Tab Contents
  overviewStatus: document.getElementById('overviewStatus'),
  overviewErrorType: document.getElementById('overviewErrorType'),
  overviewOutput: document.getElementById('overviewOutput'),
  overviewErrorDescContainer: document.getElementById('overviewErrorDescContainer'),
  overviewErrorDesc: document.getElementById('overviewErrorDesc'),
  overviewDiagnosisSnippet: document.getElementById('overviewDiagnosisSnippet'),

  analysisMarkdown: document.getElementById('analysisMarkdown'),
  failedTestsContainer: document.getElementById('failedTestsContainer'),
  solutionsMarkdown: document.getElementById('solutionsMarkdown'),
  rawJsonResponse: document.getElementById('rawJsonResponse'),

  // Copy buttons
  copyAnalysisBtn: document.getElementById('copyAnalysisBtn'),
  copySolutionsBtn: document.getElementById('copySolutionsBtn'),
  copyRawBtn: document.getElementById('copyRawBtn')
};

// Initialize marked.js options
if (window.marked) {
  marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function(code, lang) {
      if (window.hljs) {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      }
      return code;
    }
  });
}

// ---------------------------------------------------------------------------
// 1. Initial Setup & Event Listeners
// ---------------------------------------------------------------------------
function init() {
  // If hosted on same FastAPI origin, adjust endpoints
  if (window.location.origin && window.location.origin.startsWith('http')) {
    if (!localStorage.getItem('codementor_api_url')) {
      state.apiUrl = `${window.location.origin}/analyze`;
      state.extractUrl = `${window.location.origin}/extract-problem`;
      state.healthUrl = `${window.location.origin}/health`;
    }
  }

  elements.apiUrlInput.value = state.apiUrl;
  elements.extractUrlInput.value = state.extractUrl;
  elements.healthUrlInput.value = state.healthUrl;

  // Check backend health
  checkBackendHealth();

  // Mode Switchers
  elements.modeLinkBtn.addEventListener('click', () => setInputMode('link'));
  elements.modeManualBtn.addEventListener('click', () => setInputMode('manual'));

  // Link Extraction
  elements.fetchProblemBtn.addEventListener('click', handleExtractProblem);
  elements.problemUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExtractProblem();
    }
  });
  elements.problemUrlInput.addEventListener('input', () => {
    elements.clearUrlBtn.classList.toggle('hidden', !elements.problemUrlInput.value);
  });
  elements.clearUrlBtn.addEventListener('click', () => {
    elements.problemUrlInput.value = '';
    elements.clearUrlBtn.classList.add('hidden');
    elements.extractedSummary.classList.add('hidden');
    state.extractedData = null;
  });

  // Quick link pills
  elements.quickPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const slug = pill.dataset.slug;
      elements.problemUrlInput.value = `https://leetcode.com/problems/${slug}/`;
      elements.clearUrlBtn.classList.remove('hidden');
      handleExtractProblem();
    });
  });

  // Toggle extracted details
  elements.toggleExtractedDetailsBtn.addEventListener('click', toggleExtractedDetails);

  // Form Submission & Clear
  elements.form.addEventListener('submit', handleSubmit);
  elements.clearBtn.addEventListener('click', handleClear);
  elements.exampleSelector.addEventListener('change', (e) => loadExample(e.target.value));
  elements.retryBtn.addEventListener('click', handleSubmit);
  if (elements.cancelAnalysisBtn) {
    elements.cancelAnalysisBtn.addEventListener('click', handleCancelAnalysis);
  }

  // Tab navigation
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  if (elements.viewFullAnalysisBtn) {
    elements.viewFullAnalysisBtn.addEventListener('click', () => switchTab('tab-analysis'));
  }

  // Code editor keyboard shortcuts
  setupCodeEditorShortcuts();

  // Settings modal
  elements.settingsBtn.addEventListener('click', () => openModal(true));
  elements.closeSettingsModal.addEventListener('click', () => openModal(false));
  elements.openSettingsFromErr.addEventListener('click', () => openModal(true));
  elements.testConnectionBtn.addEventListener('click', testBackendConnection);
  elements.saveSettingsBtn.addEventListener('click', saveSettings);

  // Copy buttons
  elements.copyAnalysisBtn.addEventListener('click', () => copyToClipboard(state.lastResult?.logical_analysis, elements.copyAnalysisBtn));
  elements.copySolutionsBtn.addEventListener('click', () => copyToClipboard(state.lastResult?.solutions, elements.copySolutionsBtn));
  elements.copyRawBtn.addEventListener('click', () => copyToClipboard(JSON.stringify(state.lastResult, null, 2), elements.copyRawBtn));

  // Default start: Option 1 (Problem Link) with LeetCode Climbing Stairs II pre-loaded!
  setInputMode('link');
  loadExample('climbing_stairs_lc');
}

// ---------------------------------------------------------------------------
// 2. Mode Switcher (Option 1: Link vs Option 2: Manual)
// ---------------------------------------------------------------------------
function setInputMode(mode) {
  state.inputMode = mode;
  const isLink = mode === 'link';

  elements.modeLinkBtn.classList.toggle('bg-indigo-600', isLink);
  elements.modeLinkBtn.classList.toggle('text-white', isLink);
  elements.modeLinkBtn.classList.toggle('text-slate-400', !isLink);

  elements.modeManualBtn.classList.toggle('bg-indigo-600', !isLink);
  elements.modeManualBtn.classList.toggle('text-white', !isLink);
  elements.modeManualBtn.classList.toggle('text-slate-400', isLink);

  elements.linkModeContainer.classList.toggle('hidden', !isLink);
  elements.manualModeContainer.classList.toggle('hidden', isLink);

  elements.inputSectionTitle.textContent = isLink
    ? 'Option 1: Paste Problem Link'
    : 'Option 2: Manual Problem Input';

  elements.codeEditorHint.textContent = isLink
    ? 'Paste your LeetCode Solution class'
    : 'LeetCode class or CP stdin format';
}

// ---------------------------------------------------------------------------
// 3. Problem Link Extraction (Option 1)
// ---------------------------------------------------------------------------
async function handleExtractProblem() {
  const url = elements.problemUrlInput.value.trim();
  if (!url) {
    alert('Please paste a LeetCode problem link or title slug.');
    return;
  }

  elements.extractLoading.classList.remove('hidden');
  elements.extractedSummary.classList.add('hidden');
  elements.fetchProblemBtn.disabled = true;
  elements.fetchProblemBtn.classList.add('opacity-70');

  try {
    const res = await fetch(state.extractUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await res.json();

    if (!res.ok || data.status === 'ERROR') {
      throw new Error(data.message || `Failed to extract problem details (Status ${res.status})`);
    }

    state.extractedData = data;

    // Populate hidden/manual fields so unified analyze endpoint has all data
    elements.problemInput.value = data.problem || '';
    elements.sampleInput.value = data.sample_input || '';
    elements.sampleOutput.value = data.sample_output || '';

    // Update Extracted UI
    elements.extractedTitleText.textContent = `Extracted: ${data.title || 'Problem Details'}`;
    elements.extractedProblemPreview.textContent = data.problem || '';
    elements.extractedSampleInputPreview.textContent = data.sample_input || '(No sample input)';
    elements.extractedSampleOutputPreview.textContent = data.sample_output || '(No sample output)';

    // Pre-populate starter code if code editor is currently empty
    if (data.starter_code && (!elements.codeInput.value.trim() || elements.codeInput.value.includes('class Solution:'))) {
      elements.codeInput.value = data.starter_code;
    }

    elements.extractedSummary.classList.remove('hidden');
    elements.codeInput.focus();

  } catch (err) {
    alert(`Extraction Error: ${err.message}`);
  } finally {
    elements.extractLoading.classList.add('hidden');
    elements.fetchProblemBtn.disabled = false;
    elements.fetchProblemBtn.classList.remove('opacity-70');
  }
}

function toggleExtractedDetails() {
  const isHidden = elements.extractedDetailsPanel.classList.toggle('hidden');
  elements.toggleDetailsLabel.textContent = isHidden ? 'View Details' : 'Hide Details';
  elements.toggleDetailsIcon.className = isHidden
    ? 'fa-solid fa-chevron-down text-[10px]'
    : 'fa-solid fa-chevron-up text-[10px]';
}

// ---------------------------------------------------------------------------
// 4. Editor Shortcuts & Helpers
// ---------------------------------------------------------------------------
function setupCodeEditorShortcuts() {
  // Tab key indents 4 spaces inside code textarea
  elements.codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = elements.codeInput.selectionStart;
      const end = elements.codeInput.selectionEnd;
      elements.codeInput.value = elements.codeInput.value.substring(0, start) + '    ' + elements.codeInput.value.substring(end);
      elements.codeInput.selectionStart = elements.codeInput.selectionEnd = start + 4;
    }
    // Ctrl+Enter or Cmd+Enter submits
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      elements.form.requestSubmit();
    }
  });

  // Global Ctrl+Enter shortcut
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (!state.isLoading) {
        elements.form.requestSubmit();
      }
    }
  });
}

function loadExample(key) {
  const example = SAMPLE_PROBLEMS[key];
  if (!example) return;

  if (example.mode === 'link') {
    setInputMode('link');
    elements.problemUrlInput.value = example.url;
    elements.clearUrlBtn.classList.remove('hidden');
    elements.problemInput.value = example.problem;
    elements.sampleInput.value = example.sample_input;
    elements.sampleOutput.value = example.sample_output;
    elements.codeInput.value = example.code;

    // Populate extracted preview
    state.extractedData = {
      title: key.replace(/_/g, ' ').toUpperCase(),
      problem: example.problem,
      sample_input: example.sample_input,
      sample_output: example.sample_output
    };
    elements.extractedTitleText.textContent = `Extracted: ${key === 'climbing_stairs_lc' ? 'Climbing Stairs II (LeetCode)' : 'Two Sum (LeetCode)'}`;
    elements.extractedProblemPreview.textContent = example.problem;
    elements.extractedSampleInputPreview.textContent = example.sample_input;
    elements.extractedSampleOutputPreview.textContent = example.sample_output;
    elements.extractedSummary.classList.remove('hidden');
  } else {
    setInputMode('manual');
    elements.problemInput.value = example.problem;
    elements.sampleInput.value = example.sample_input;
    elements.sampleOutput.value = example.sample_output;
    elements.codeInput.value = example.code;
  }

  elements.exampleSelector.value = key;
}

function handleClear() {
  elements.problemUrlInput.value = '';
  elements.clearUrlBtn.classList.add('hidden');
  elements.extractedSummary.classList.add('hidden');
  state.extractedData = null;

  elements.problemInput.value = '';
  elements.sampleInput.value = '';
  elements.sampleOutput.value = '';
  elements.codeInput.value = '';
  elements.exampleSelector.value = '';
  showState('idle');
}

// ---------------------------------------------------------------------------
// 5. Tab Switching
// ---------------------------------------------------------------------------
function switchTab(targetTabId) {
  elements.tabBtns.forEach(btn => {
    const isTarget = btn.dataset.tab === targetTabId;
    btn.classList.toggle('border-indigo-500', isTarget);
    btn.classList.toggle('text-indigo-400', isTarget);
    btn.classList.toggle('border-transparent', !isTarget);
    btn.classList.toggle('text-slate-400', !isTarget);
  });

  elements.tabPanels.forEach(panel => {
    panel.classList.toggle('hidden', panel.id !== targetTabId);
  });
}

// ---------------------------------------------------------------------------
// 6. API Submission & Workflow Management
// ---------------------------------------------------------------------------
async function handleSubmit(e) {
  if (e) e.preventDefault();
  if (state.isLoading) return;

  // In link mode, if user hasn't extracted yet, do extraction automatically first!
  if (state.inputMode === 'link' && !elements.problemInput.value.trim() && elements.problemUrlInput.value.trim()) {
    await handleExtractProblem();
  }

  const problem = elements.problemInput.value.trim();
  const sample_input = elements.sampleInput.value.trim();
  const sample_output = elements.sampleOutput.value.trim();
  const code = elements.codeInput.value.trim();

  if (!problem) {
    alert(state.inputMode === 'link'
      ? 'Please paste a problem link and click Extract first.'
      : 'Please enter the problem statement.');
    return;
  }

  if (!code) {
    alert('Please enter or paste your submitted Python code.');
    return;
  }

  // Switch to loading state
  showState('loading');
  startLoadingProgress();

  const payload = {
    problem,
    sample_input,
    sample_output,
    code
  };

  try {
    state.currentAbortController = new AbortController();
    // 5-minute timeout (300,000ms) for complex multi-agent analysis
    const timeoutId = setTimeout(() => {
      if (state.currentAbortController) {
        state.currentAbortController.abort('TIMEOUT');
      }
    }, 300000);

    const response = await fetch(state.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: state.currentAbortController.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = `Server error (HTTP ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.detail) {
          errorMsg = errJson.detail;
        }
      } catch (err) {
        // use default error message
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    stopLoadingProgress();
    renderResults(data);

  } catch (error) {
    stopLoadingProgress();
    if (state.currentAbortController?.signal?.reason === 'USER_CANCEL') {
      showState('idle');
      return;
    }
    const isTimeout = error.name === 'AbortError' || state.currentAbortController?.signal?.reason === 'TIMEOUT';
    showError(isTimeout
      ? 'Request timed out after 5 minutes. The problem is exceptionally complex or the LLM server took too long.'
      : error.message);
  } finally {
    state.currentAbortController = null;
  }
}

function handleCancelAnalysis() {
  if (state.currentAbortController) {
    state.currentAbortController.abort('USER_CANCEL');
  }
  stopLoadingProgress();
  showState('idle');
}

// ---------------------------------------------------------------------------
// 7. Loading State & Agent Step Simulator
// ---------------------------------------------------------------------------
function startLoadingProgress() {
  state.isLoading = true;
  state.startTime = Date.now();
  elements.submitBtn.disabled = true;
  elements.submitBtn.classList.add('opacity-70', 'cursor-not-allowed');

  // Live timer & stage hint updater
  elements.loadingTimer.textContent = 'Elapsed: 0.0s • Initializing multi-agent pipeline...';
  state.timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - state.startTime) / 1000).toFixed(1);
    const sec = parseFloat(elapsed);
    let stageHint = '• Simulating execution...';
    if (sec > 28) stageHint = '• Formulating 3 optimal solution approaches...';
    else if (sec > 18) stageHint = '• Running differential testing on edge cases...';
    else if (sec > 8) stageHint = '• Synthesizing reference solution...';

    elements.loadingTimer.textContent = `Elapsed: ${elapsed}s ${stageHint}`;
  }, 100);

  // Agent Step simulator (visual feedback while LangGraph runs)
  let currentStep = 1;
  const stepElements = [
    document.getElementById('step-1'),
    document.getElementById('step-2'),
    document.getElementById('step-3'),
    document.getElementById('step-4'),
    document.getElementById('step-5')
  ];

  // Reset steps
  stepElements.forEach((el, idx) => {
    el.classList.toggle('opacity-60', idx !== 0);
    const icon = el.querySelector('.step-icon');
    if (idx === 0) {
      icon.className = 'fa-solid fa-circle-notch fa-spin text-indigo-400 step-icon';
    } else {
      icon.className = 'fa-regular fa-circle step-icon';
    }
  });

  state.stepInterval = setInterval(() => {
    if (currentStep < 5) {
      // Mark previous step as finished
      const prevEl = stepElements[currentStep - 1];
      const prevIcon = prevEl.querySelector('.step-icon');
      prevIcon.className = 'fa-solid fa-circle-check text-emerald-400 step-icon';
      prevEl.classList.remove('opacity-60');

      // Advance to next step
      currentStep++;
      const nextEl = stepElements[currentStep - 1];
      const nextIcon = nextEl.querySelector('.step-icon');
      nextIcon.className = 'fa-solid fa-circle-notch fa-spin text-indigo-400 step-icon';
      nextEl.classList.remove('opacity-60');
    }
  }, 2800);
}

function stopLoadingProgress() {
  state.isLoading = false;
  clearInterval(state.timerInterval);
  clearInterval(state.stepInterval);
  elements.submitBtn.disabled = false;
  elements.submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
}

// ---------------------------------------------------------------------------
// 8. Result Rendering
// ---------------------------------------------------------------------------
function renderResults(data) {
  state.lastResult = data;
  showState('results');

  const duration = ((Date.now() - state.startTime) / 1000).toFixed(1);
  elements.resultTime.textContent = `Completed in ${duration}s`;

  const execution = data.execution || {};
  const isExecSuccess = execution.status === 'SUCCESS';
  const samplePassed = Boolean(data.sample_passed);
  const failedTests = data.failed_testcases || [];

  // 1. Top Badges
  // Execution Badge
  if (isExecSuccess) {
    elements.badgeExecution.className = 'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    elements.badgeExecution.innerHTML = '<i class="fa-solid fa-circle-check mr-1.5 text-[11px]"></i> Execution: SUCCESS';
  } else {
    elements.badgeExecution.className = 'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20';
    elements.badgeExecution.innerHTML = '<i class="fa-solid fa-circle-xmark mr-1.5 text-[11px]"></i> Execution: ERROR';
  }

  // Sample Passed Badge
  if (samplePassed) {
    elements.badgeSample.className = 'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    elements.badgeSample.innerHTML = '<i class="fa-solid fa-vial-circle-check mr-1.5 text-[11px]"></i> Sample: PASSED';
  } else {
    elements.badgeSample.className = 'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20';
    elements.badgeSample.innerHTML = '<i class="fa-solid fa-triangle-exclamation mr-1.5 text-[11px]"></i> Sample: MISMATCH';
  }

  // Failed Tests Badge
  if (failedTests.length > 0) {
    elements.badgeFailedCount.className = 'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20';
    elements.badgeFailedCount.innerHTML = `<i class="fa-solid fa-flask-vial mr-1.5"></i> ${failedTests.length} Failed Tests`;
    elements.tabFailedBadge.textContent = failedTests.length;
    elements.tabFailedBadge.classList.remove('hidden');
  } else {
    elements.badgeFailedCount.className = 'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700';
    elements.badgeFailedCount.innerHTML = '<i class="fa-solid fa-check-double mr-1.5 text-emerald-400"></i> All Tests Passed';
    elements.tabFailedBadge.classList.add('hidden');
  }

  // 2. Overview Tab
  elements.overviewStatus.textContent = execution.status || 'UNKNOWN';
  elements.overviewStatus.className = `font-mono font-semibold ${isExecSuccess ? 'text-emerald-400' : 'text-rose-400'}`;
  elements.overviewErrorType.textContent = execution.error_type || 'no errors';
  elements.overviewOutput.textContent = execution.output || '(No stdout produced)';

  if (execution.error_description) {
    elements.overviewErrorDesc.textContent = execution.error_description;
    elements.overviewErrorDescContainer.classList.remove('hidden');
  } else {
    elements.overviewErrorDescContainer.classList.add('hidden');
  }

  // Quick summary snippet
  const snippet = data.logical_analysis
    ? data.logical_analysis.split('\n').filter(l => l.trim()).slice(0, 3).join(' ')
    : (isExecSuccess ? 'Execution succeeded without errors.' : 'Execution failed with an error.');
  elements.overviewDiagnosisSnippet.textContent = snippet;

  // 3. Logical Analysis Tab (Rendered Markdown)
  if (data.logical_analysis) {
    elements.analysisMarkdown.innerHTML = renderMarkdown(data.logical_analysis);
  } else {
    elements.analysisMarkdown.innerHTML = '<p class="text-slate-400 italic">No logical analysis generated.</p>';
  }

  // 4. Failed Test Cases Tab
  renderFailedTests(failedTests);

  // 5. Solutions Tab (Rendered Markdown)
  if (data.solutions) {
    elements.solutionsMarkdown.innerHTML = renderMarkdown(data.solutions);
    attachCodeCopyButtons(elements.solutionsMarkdown);
  } else {
    elements.solutionsMarkdown.innerHTML = '<p class="text-slate-400 italic">No alternative solutions generated for this run.</p>';
  }

  // 6. Raw JSON Tab
  elements.rawJsonResponse.textContent = JSON.stringify(data, null, 2);

  // Default active tab
  if (!isExecSuccess) {
    switchTab('tab-overview');
  } else if (!samplePassed || failedTests.length > 0) {
    switchTab('tab-analysis');
  } else {
    switchTab('tab-overview');
  }
}

// ---------------------------------------------------------------------------
// 9. Render Failed Test Cards
// ---------------------------------------------------------------------------
function renderFailedTests(tests) {
  elements.failedTestsContainer.innerHTML = '';

  if (!tests || tests.length === 0) {
    elements.failedTestsContainer.innerHTML = `
      <div class="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center">
        <div class="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-lg mb-2">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h4 class="text-sm font-semibold text-white mb-1">No Failed Test Cases!</h4>
        <p class="text-xs text-slate-400">All edge cases, boundary conditions, and generated tests matched the reference solution.</p>
      </div>
    `;
    return;
  }

  tests.forEach((test, index) => {
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl bg-slate-950 border border-rose-500/20 hover:border-rose-500/40 transition space-y-3';

    card.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div class="flex items-center space-x-2">
          <span class="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] font-bold">
            ${index + 1}
          </span>
          <span class="text-xs font-semibold text-rose-300">${escapeHtml(test.error_type || 'Failed Case')}</span>
        </div>
        <span class="text-[10px] text-slate-500 font-mono">Test Case #${index + 1}</span>
      </div>

      <div>
        <span class="text-[11px] text-slate-400 block mb-1">Input:</span>
        <pre class="bg-slate-900 border border-slate-800/90 rounded-lg p-2.5 text-xs font-mono text-slate-200 overflow-x-auto">${escapeHtml(test.input || '')}</pre>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span class="text-[11px] text-emerald-400 block mb-1 font-medium">Expected Output (Reference):</span>
          <pre class="bg-slate-900 border border-emerald-500/20 rounded-lg p-2.5 text-xs font-mono text-emerald-300 overflow-x-auto">${escapeHtml(test.expected || '')}</pre>
        </div>
        <div>
          <span class="text-[11px] text-rose-400 block mb-1 font-medium">Actual Output (Submitted):</span>
          <pre class="bg-slate-900 border border-rose-500/20 rounded-lg p-2.5 text-xs font-mono text-rose-300 overflow-x-auto">${escapeHtml(test.actual || '')}</pre>
        </div>
      </div>

      ${test.explanation ? `
        <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed">
          <span class="text-amber-400 font-medium mr-1"><i class="fa-solid fa-lightbulb text-[10px]"></i> Explanation:</span>
          ${escapeHtml(test.explanation)}
        </div>
      ` : ''}
    `;

    elements.failedTestsContainer.appendChild(card);
  });
}

// ---------------------------------------------------------------------------
// 10. Markdown & Code Copy Helpers
// ---------------------------------------------------------------------------
function renderMarkdown(content) {
  if (!content) return '';
  if (window.marked) {
    return marked.parse(content);
  }
  return `<pre class="whitespace-pre-wrap">${escapeHtml(content)}</pre>`;
}

function attachCodeCopyButtons(container) {
  const codeBlocks = container.querySelectorAll('pre');
  codeBlocks.forEach(pre => {
    if (pre.querySelector('.copy-code-btn')) return;

    pre.style.position = 'relative';
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.innerHTML = '<i class="fa-regular fa-copy mr-1"></i>Copy';
    btn.addEventListener('click', () => {
      const codeText = pre.querySelector('code')?.innerText || pre.innerText;
      copyToClipboard(codeText, btn);
    });
    pre.appendChild(btn);
  });
}

function copyToClipboard(text, buttonElement) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const originalHtml = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fa-solid fa-check text-emerald-400 mr-1"></i>Copied!';
    setTimeout(() => {
      buttonElement.innerHTML = originalHtml;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy to clipboard', err);
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// 11. State Manager (idle | loading | error | results)
// ---------------------------------------------------------------------------
function showState(stateName) {
  elements.idleState.classList.toggle('hidden', stateName !== 'idle');
  elements.loadingState.classList.toggle('hidden', stateName !== 'loading');
  elements.errorState.classList.toggle('hidden', stateName !== 'error');
  elements.resultsState.classList.toggle('hidden', stateName !== 'results');
}

function showError(msg) {
  showState('error');
  elements.errorMessage.textContent = msg;
}

// ---------------------------------------------------------------------------
// 12. Backend Health & Settings Modal
// ---------------------------------------------------------------------------
async function checkBackendHealth() {
  try {
    const res = await fetch(state.healthUrl, { method: 'GET', cache: 'no-cache' });
    if (res.ok) {
      elements.backendStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
      elements.backendStatusText.textContent = 'Backend Online';
      elements.backendStatusPill.className = 'flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300';
      return true;
    }
    throw new Error('Not 200 OK');
  } catch (err) {
    elements.backendStatusDot.className = 'w-2 h-2 rounded-full bg-rose-400';
    elements.backendStatusText.textContent = 'Backend Offline';
    elements.backendStatusPill.className = 'flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300';
    return false;
  }
}

async function testBackendConnection() {
  const testUrl = elements.healthUrlInput.value.trim();
  elements.testConnectionBtn.textContent = 'Testing...';
  try {
    const res = await fetch(testUrl, { method: 'GET', cache: 'no-cache' });
    if (res.ok) {
      alert('Connection successful! Backend responded with 200 OK.');
    } else {
      alert(`Server reached but returned HTTP status ${res.status}`);
    }
  } catch (err) {
    alert(`Could not connect to ${testUrl}. Please verify the backend server is running.`);
  } finally {
    elements.testConnectionBtn.textContent = 'Test Connection';
  }
}

function saveSettings() {
  state.apiUrl = elements.apiUrlInput.value.trim();
  state.extractUrl = elements.extractUrlInput.value.trim();
  state.healthUrl = elements.healthUrlInput.value.trim();
  localStorage.setItem('codementor_api_url', state.apiUrl);
  localStorage.setItem('codementor_extract_url', state.extractUrl);
  localStorage.setItem('codementor_health_url', state.healthUrl);
  openModal(false);
  checkBackendHealth();
}

function openModal(open) {
  elements.settingsModal.classList.toggle('hidden', !open);
}

// Boot up
document.addEventListener('DOMContentLoaded', init);
