
import requests

url = "http://127.0.0.1:8000/analyze"

data = {
    "problem": "Find the maximum element in an array.",
    "sample_input": "5\n1 5 3 2 4\n",
    "sample_output": "5",
    "code": "n = int(input())\na = list(map(int, input().split()))\nprint(min(a))"
}

response = requests.post(url, json=data)

print("Status Code:", response.status_code)

try:
    print("Response:", response.json())
except requests.exceptions.JSONDecodeError:
    print("Server returned non-JSON response:")
    print(response.text)

