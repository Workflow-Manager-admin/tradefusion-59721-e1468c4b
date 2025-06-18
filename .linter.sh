#!/bin/bash
cd /home/kavia/workspace/code-generation/tradefusion-59721-e1468c4b/tradefusion_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

