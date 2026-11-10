from typing import TypedDict, List, Dict, Any


class CodeState(TypedDict):

    # User input
    problem: str
    sample_input: str
    sample_output: str
    submitted_code: str

    # Execution results
    execution_result: Dict[str, Any]
    sample_passed: bool

    # Reference solution
    reference_code: str

    # Generated tests
    testcases: List[Dict[str, Any]]

    # Differential testing
    failed_tests: List[Dict[str, Any]]

    # AI analysis
    logical_analysis: str

    # Three solutions
    solutions: str

    # Final report
    final_report: Dict[str, Any]