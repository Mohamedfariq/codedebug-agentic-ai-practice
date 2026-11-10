# CodeMentor AI - Frontend

A responsive, multi-mode frontend interface for **CodeMentor AI**, supporting both **LeetCode** problems and traditional **Competitive Programming** (CP) problems.

---

## 🌟 Key Features

### 1. Two Input Options
- **Option 1: Paste Problem Link (LeetCode & Online Judges)**:
  - Paste any LeetCode problem URL (e.g. `https://leetcode.com/problems/climbing-stairs-ii/` or `two-sum`).
  - Automatically extracts:
    - **Problem Statement & Constraints**
    - **Sample Input** (e.g. `n = 4, costs = [1,2,3,4]`)
    - **Sample Expected Output** (e.g. `13`)
    - **Python Starter Code Template** (pre-fills `class Solution: ...`)
  - The user only needs to paste or type their solution code!
  - Includes quick pills to test popular LeetCode problems with 1 click.
- **Option 2: Manual Pasting**:
  - Full manual input fields for Problem Statement, Sample Input, Sample Output, and Submitted Code.
  - Pre-configured problem presets (Min vs Max bug, Case sensitivity bug, Two Sum index bug).

### 2. Full LeetCode & Competitive Programming Support
- **LeetCode Environment Support**:
  - Evaluates `class Solution:` methods without `NameError: name 'List' is not defined` or missing typing imports.
  - Pre-imports standard typing symbols (`List`, `Dict`, `Tuple`, `Optional`, `TreeNode`, `ListNode`) and libraries (`math`, `collections`, `heapq`, `bisect`).
  - Instantiates `Solution()` and invokes the solution method with the sample arguments.
  - Normalizes outputs (e.g. `[0, 1]` vs `[0,1]`, `true` vs `True`).
- **Standard CP Mode**:
  - Automatically supports stdin (`sys.stdin` / `input()`) and stdout.

### 3. Comprehensive Multi-Agent Analysis Dashboard
- **Top Summary Badges**: Execution status (`SUCCESS` / `ERROR`), Sample match (`PASSED` / `MISMATCH`), and Failed Test Case count.
- **Overview Tab**: Execution return value / stdout, runtime error diagnosis, and quick summary.
- **Logical Analysis Tab**: Rendered Markdown explaining bug root causes, why it failed, and how to fix it.
- **Failed Testcases Tab**: Visual cards comparing Input, Expected Output (Reference), and Actual Output with AI explanations.
- **3 Solutions Tab**: Formats **Brute Force**, **Better Approach**, and **Optimal Approach** in matching code style (`class Solution:` or standard I/O) with syntax highlighting and copy buttons.
- **Raw JSON Tab**: Full `final_report` API payload viewer.

---

## 🚀 How to Run

### Method 1: Unified Server (FastAPI + Frontend)
From the root workspace directory:
```powershell
.\venv\Scripts\python -m uvicorn main:app --app-dir backend --port 8000
```
Open your browser at:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

### Method 2: Standalone Static Server (Port 3000)
```powershell
.\venv\Scripts\python frontend/server.py
```
Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**
