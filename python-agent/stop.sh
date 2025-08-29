#!/bin/bash

echo "Stopping Python agent..."
pkill -f "python.*agent.py"
pkill -f "uv.*agent.py"
echo "Python agent stopped."