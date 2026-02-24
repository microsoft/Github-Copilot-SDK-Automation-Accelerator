# AKS Monitor Agent — Python

Starter template for AKS cluster monitoring in Python.

## Quick Start

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python aks_monitor_agent.py
```

## Notes

The primary implementation is in [Node.js](../nodejs/). This Python template:
- Can delegate to the Node.js agent via subprocess
- Implements equivalent diagnostic logic in Python
- Can be extended with Azure SDK for Python (`azure-mgmt-containerservice`)
