
import subprocess
import tempfile
import sys
import os


def execute_code(code, input_data, timeout=3):

    with tempfile.TemporaryDirectory() as temp_dir:

        file_path = os.path.join(temp_dir, "solution.py")

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)

        try:
            result = subprocess.run(
                [sys.executable, "-I", file_path],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=temp_dir
            )

            if result.returncode != 0:

                error = result.stderr

                error_type = (
                    "Syntax Error"
                    if "SyntaxError" in error
                    else "Runtime Error"
                )

                return {
                    "status": "ERROR",
                    "error_type": error_type,
                    "message": error
                }

            return {
                "status": "SUCCESS",
                "output": result.stdout.strip()
            }

        except subprocess.TimeoutExpired:

            return {
                "status": "ERROR",
                "error_type": "Time Limit Exceeded",
                "message": "Execution exceeded time limit"
            }
