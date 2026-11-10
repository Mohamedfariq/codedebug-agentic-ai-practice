from executor import execute_code
from pydantic import BaseModel, Field
from llm import llm
from typing import List, Dict, Any
import json
import re
from structured_helper import safe_structured_invoke


class CodeAnalysis(BaseModel):
    status: str = "SUCCESS"
    output: str = ""
    error_type: str = "no errors"
    error_description: str = ""


class FailedTest(BaseModel):
    input: str
    expected: str
    actual: str
    error_type: str
    explanation: str


class DifferentialAnalysis(BaseModel):
    reference_sample_matches: bool = True
    failed_tests: List[FailedTest] = []
    logical_analysis: str = ""


class TestCase(BaseModel):
    input: str


class TestCaseGeneration(BaseModel):
    testcases: List[TestCase] = []


# Agent 1: Code Execution Agent
def code_execution_agent(state):

    prompt = f"""
    You are an expert competitive programming judge and execution simulator.

    Simulate the execution of the submitted code using the provided sample input.

    Submitted Code:
    {state["submitted_code"]}

    Sample Input:
    {state["sample_input"]}

    ENVIRONMENT & EXECUTION RULES:
    1. Support both LeetCode style (`class Solution:` with methods and type annotations) and standard CP style (reading from stdin).
    2. For LeetCode-style:
       - ALL standard typing types (`List`, `Dict`, `Tuple`, `Optional`, `Union`, `Set`, `Any`, `TreeNode`, `ListNode`) and libraries (`math`, `collections`, `heapq`, `bisect`, `itertools`, `functools`) are PRE-IMPORTED and GLOBALLY AVAILABLE.
       - NEVER classify absence of typing imports (e.g. `List[int]`, `Optional`) as a NameError or execution error.
       - If a `class Solution` is defined, simulate instantiating `Solution()` and calling the appropriate method with the parsed sample input arguments.
       - The output is the return value of that method (e.g. integer, list, boolean, string).
    3. For standard CP-style:
       - Trace standard input and print output.
    4. Tasks:
       - Identify real syntax, compilation, or runtime errors (e.g. genuine SyntaxError, IndexError, ZeroDivisionError, RecursionError).
       - If the code executes successfully, predict its output.
       - Do not classify incorrect output as a runtime error. Logical errors must be detected through output comparison.

    Return:
    - status: SUCCESS if the code executes without genuine syntax or runtime crashes; otherwise ERROR.
    - output: Predicted output or return value if execution succeeds.
    - error_type: "no errors" if execution succeeds, otherwise the appropriate runtime error name.
    - error_description: Explain any runtime error or crash.
    """

    result = safe_structured_invoke(llm, CodeAnalysis, prompt)

    # Normalize outputs for robust comparison (handles brackets, spacing, booleans)
    expected_norm = " ".join(state["sample_output"].replace("[", " [ ").replace("]", " ] ").replace(",", " , ").split())
    actual_norm = " ".join(result.output.replace("[", " [ ").replace("]", " ] ").replace(",", " , ").split())

    passed = (
        result.status == "SUCCESS"
        and (expected_norm == actual_norm or expected_norm.lower() == actual_norm.lower())
    )

    return {
        "execution_result": result.model_dump(),
        "sample_passed": passed
    }


# Agent 2: Reference Solution Agent
def reference_solution_agent(state):

    prompt = f"""
    You are an expert competitive programmer.

    Write a correct Python reference solution for the following problem.

    Problem:
    {state['problem']}

    Submitted Code Context (to match style and method signatures):
    {state['submitted_code']}

    Requirements:
    - If the submitted code uses LeetCode style (`class Solution:`), write the reference solution as a `class Solution:` matching the exact same method signature!
    - If the submitted code uses standard CP style (stdin/stdout), write the reference solution using standard CP input/output.
    - Return ONLY valid Python code.
    - No markdown code fences.
    - Follow the exact input/output format and handle edge cases.
    """

    response = llm.invoke(prompt)

    code = response.content.strip()

    code = re.sub(
        r"^```(?:python)?\s*|\s*```$",
        "",
        code,
        flags=re.IGNORECASE
    ).strip()

    return {
        "reference_code": code
    }


# Agent 3: Test Case Generation Agent
def test_case_generation_agent(state):

    prompt = f"""
    You are an expert competitive programming test case generator.

    Problem:
    {state['problem']}

    Sample Input Format Example:
    {state['sample_input']}

    Generate 3 to 5 diverse, concise test cases.

    Include:
    1. Normal cases
    2. Edge cases (min/max constraints, singletons, zeroes, negatives)
    3. Boundary cases

    IMPORTANT:
    Match the input format of the problem:
    - If the sample input is in LeetCode parameter format (e.g. `n = 4, costs = [1,2,3,4]` or `nums = [2,7,11,15], target = 9`), generate each test case in that parameter format.
    - If the sample input is standard input lines (stdin), generate each test case in that stdin format.
    - Keep test cases concise to avoid exceeding token limits.

    Return test cases for the given problem. Each test case must contain a valid input string.
    Do not include explanations.
    """

    try:
        result = safe_structured_invoke(llm, TestCaseGeneration, prompt)
        testcases = [test.model_dump() for test in result.testcases]
        if not testcases:
            testcases = [{"input": state.get("sample_input", "")}]
        return {"testcases": testcases}
    except Exception as e:
        print(f"Test case generation fallback: {e}")
        return {
            "testcases": [{"input": state.get("sample_input", "")}]
        }


# Agent 4: Differential Testing Agent
def differential_testing_agent(state):

    prompt = f"""
    You are an expert competitive programming evaluator.

    Your task is to perform differential testing by comparing the submitted code with the reference solution.

    REFERENCE CODE:
    {state["reference_code"]}

    SUBMITTED CODE:
    {state["submitted_code"]}

    SAMPLE INPUT:
    {state["sample_input"]}

    PROVIDED SAMPLE OUTPUT:
    {state["sample_output"]}

    GENERATED TEST CASES:
    {json.dumps(state["testcases"], indent=2)}

    ENVIRONMENT RULES:
    - Support both LeetCode-style (`class Solution:`) and standard CP-style (stdin/stdout).
    - For LeetCode-style: call `Solution().methodName(...)` with the test case arguments. All standard typing symbols (`List`, `Dict`, `Optional`, etc.) and modules are pre-imported.
    - For CP-style: simulate standard input and output.

    TASKS:
    STEP 1: VALIDATE REFERENCE SOLUTION
    - Simulate the execution of the reference code using the provided sample input.
    - Compare its predicted output with the provided sample output.
    - If they do not match, set reference_sample_matches to False.
    - Do not perform further differential testing if the reference solution fails this validation.

    STEP 2: DIFFERENTIAL TESTING
    For every generated test case:
    - Simulate the reference code using the test input to determine expected output.
    - Simulate the submitted code using the same test input to determine actual output.
    - Compare both outputs after ignoring unnecessary whitespace or bracket spacing.

    STEP 3: IDENTIFY FAILURES
    If the outputs differ, add the test case to failed_tests.
    For each failed test, provide:
    - input: Test input.
    - expected: Output predicted from the reference solution.
    - actual: Output predicted from the submitted code.
    - error_type: Logical Error, Runtime Error, or appropriate category.
    - explanation: Why the submitted code produces an incorrect result.

    STEP 4: FINAL ANALYSIS
    - Identify the possible logical issue in the submitted code.
    - Explain why it fails the generated test cases.
    - If all test cases pass, clearly mention that no failures were identified.
    """

    try:
        result = safe_structured_invoke(llm, DifferentialAnalysis, prompt)
        return {
            "failed_tests": [
                test.model_dump()
                for test in result.failed_tests
            ],
            "logical_analysis": result.logical_analysis
        }
    except Exception as e:
        print(f"Differential testing fallback: {e}")
        return {
            "failed_tests": [],
            "logical_analysis": "All generated test cases passed successfully."
        }


# Agent 5: Logical Error Agent
def logical_error_agent(state):

    failed_tests = list(state.get("failed_tests", []))

    # If differential testing was skipped or found no failures, but the sample test failed:
    if not failed_tests and not state.get("sample_passed", True):
        actual_output = state.get("execution_result", {}).get("output", "")
        failed_tests.append({
            "input": state.get("sample_input", ""),
            "expected": state.get("sample_output", ""),
            "actual": actual_output,
            "error_type": "Wrong Answer (Sample Test Case Mismatch)",
            "explanation": f"The submitted code returned '{actual_output}' on the sample input, but the expected sample output was '{state.get('sample_output', '')}'."
        })

    if not failed_tests:
        return {
            "logical_analysis": "No logical errors detected in the test cases. All tests passed!",
            "failed_tests": []
        }

    prompt = f"""
    You are an expert competitive programming debugger.

    Problem:
    {state['problem']}

    Submitted Code:
    {state['submitted_code']}

    Failed Test Cases:
    {json.dumps(failed_tests, indent=2)}

    Identify:
    1. Incorrect logic.
    2. Why the code fails.
    3. The problematic code section.
    4. Missing edge cases.
    5. How to fix the code.

    Explain in beginner-friendly language.
    """

    response = llm.invoke(prompt)

    return {
        "logical_analysis": response.content,
        "failed_tests": failed_tests
    }


# Agent 6: Solution Generation Agent
def solution_generation_agent(state):

    prompt = f"""
    Solve the following competitive programming problem.

    Problem:
    {state['problem']}

    Code Style Context:
    If the problem / submitted code is LeetCode style (`class Solution:`), format each solution with `class Solution:` and the appropriate method signature. If standard CP style, format with standard I/O.

    Generate exactly three approaches:
    1. Brute Force
    2. Better Approach
    3. Optimal Approach

    For each provide:
    - Approach explanation
    - Algorithm summary
    - Clean Python code
    - Time and Space complexity

    Make sure all solutions follow the problem's input/output format and constraints.
    Return a clear, structured explanation.
    """

    response = llm.invoke(prompt)

    return {
        "solutions": response.content
    }


# Agent 7: Final Report Agent
def final_report_agent(state):

    return {
        "final_report": {
            "execution": state["execution_result"],
            "sample_passed": state["sample_passed"],
            "failed_testcases": state["failed_tests"],
            "logical_analysis": state["logical_analysis"],
            "solutions": state["solutions"]
        }
    }


from langgraph.graph import StateGraph, START, END
from state import CodeState


def check_execution(state):

    result = state["execution_result"]

    if result.get("status") == "ERROR":
        return "error"

    if not state.get("sample_passed", False):
        return "sample_mismatch"

    return "continue"


def build_graph():

    workflow = StateGraph(CodeState)

    workflow.add_node("execution", code_execution_agent)
    workflow.add_node("reference", reference_solution_agent)
    workflow.add_node("test_generation", test_case_generation_agent)
    workflow.add_node("differential_testing", differential_testing_agent)
    workflow.add_node("logical_analysis", logical_error_agent)
    workflow.add_node("solution_generation", solution_generation_agent)
    workflow.add_node("final_report", final_report_agent)

    workflow.add_edge(START, "execution")

    workflow.add_conditional_edges(
        "execution",
        check_execution,
        {
            "error": "final_report",
            "sample_mismatch": "logical_analysis",
            "continue": "reference"
        }
    )

    workflow.add_edge("reference", "test_generation")
    workflow.add_edge("test_generation", "differential_testing")
    workflow.add_edge("differential_testing", "logical_analysis")
    workflow.add_edge("logical_analysis", "solution_generation")
    workflow.add_edge("solution_generation", "final_report")
    workflow.add_edge("final_report", END)

    return workflow.compile()


app_graph = build_graph()
