from langgraph.graph import StateGraph, START, END

from state import CodeState

from nodes import (
    code_execution_agent,
    reference_solution_agent,
    test_case_generation_agent,
    differential_testing_agent,
    logical_error_agent,
    solution_generation_agent,
    final_report_agent
)


def check_execution(state):

    result = state["execution_result"]

    if result.get("status") == "ERROR":
        return "error"

    if not state["sample_passed"]:
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