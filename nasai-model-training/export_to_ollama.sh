#!/bin/bash
# Script to convert Unsloth LoRA adapters into a runnable GGUF model for Ollama

echo "This script assumes you have llama.cpp cloned and set up."
echo "1. Merge LoRA with Base model and export to GGUF using Unsloth's built-in tools (requires python script extension)"
echo "Alternatively, inside train_unsloth.py, add: model.save_pretrained_gguf('model', tokenizer, quantization_method = 'q4_k_m')"

# Assuming the model was exported to gguf format
MODEL_FILE="nasai-maestro-0.1-Q4_K_M.gguf"

if [ -f "$MODEL_FILE" ]; then
    echo "GGUF file found. Creating Ollama Modelfile..."
    cat << EOF > Modelfile
FROM ./$MODEL_FILE

# System prompt forcing the model into Nasai identity
SYSTEM """You are nasai-maestro-0.1, an advanced AI coding assistant that operates within a terminal. You have access to tools to modify the file system and execute shell commands. Think step by step and use tools to accomplish the user's task."""

# Set lower temperature for coding precision
PARAMETER temperature 0.2
EOF

    echo "Building Ollama model..."
    ollama create nasai-maestro-0.1 -f Modelfile
    echo "Done! You can now run the model locally using your Nasai CLI."
else
    echo "Error: $MODEL_FILE not found. Please ensure the Python script saved the GGUF file."
fi
