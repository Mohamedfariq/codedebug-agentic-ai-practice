from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import traceback
import os

from graph import app_graph

app = FastAPI(
    title="CodeMentor AI",
    description="Multi-Agent Code Debugging System"
)

# Enable CORS for browser frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CodeRequest(BaseModel):
    problem: str
    sample_input: str
    sample_output: str
    code: str


class ExtractRequest(BaseModel):
    url: str


@app.get("/health")
def health():
    return {"status": "ok", "app": "CodeMentor AI"}


@app.post("/extract-problem")
def extract_problem_endpoint(request: ExtractRequest):
    try:
        from extractor import extract_problem
        res = extract_problem(request.url)
        return res
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@app.post("/analyze")
def analyze(request: CodeRequest):

    try:
        initial_state = {
            "problem": request.problem,
            "sample_input": request.sample_input,
            "sample_output": request.sample_output,
            "submitted_code": request.code,
            "execution_result": {},
            "sample_passed": False,
            "reference_code": "",
            "testcases": [],
            "failed_tests": [],
            "logical_analysis": "",
            "solutions": "",
            "final_report": {}
        }

        print("Starting CodeMentor AI...")

        result = app_graph.invoke(initial_state)

        print("Workflow completed!")

        return result["final_report"]

    except Exception as e:

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# Mount frontend static files and root route if frontend directory exists
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

