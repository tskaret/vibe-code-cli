#!/usr/bin/env python3
"""
List available Hugging Face models with VRAM requirements
"""

import json
import sys
import torch
import subprocess
import re
from huggingface_hub import HfApi, list_models
from transformers import AutoConfig

def get_available_vram():
    """Get available VRAM in GB"""
    try:
        if torch.cuda.is_available():
            # Get VRAM info using nvidia-ml-py or nvidia-smi
            try:
                import pynvml
                pynvml.nvmlInit()
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)  # First GPU
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                return mem_info.total / (1024**3)  # Convert to GB
            except ImportError:
                # Fallback to nvidia-smi
                result = subprocess.run(
                    ['nvidia-smi', '--query-gpu=memory.total', '--format=csv,noheader,nounits'],
                    capture_output=True, text=True
                )
                if result.returncode == 0:
                    return float(result.stdout.strip()) / 1024  # Convert MB to GB
                return 8.0  # Default fallback
        else:
            return 0.0  # CPU-only
    except Exception:
        return 8.0  # Default fallback

def estimate_model_vram_gb(num_parameters_b):
    """Estimate VRAM requirements in GB based on parameters"""
    if num_parameters_b is None:
        return None
    
    # Rough estimation: 2 bytes per parameter (fp16) + overhead
    # Add ~20% overhead for activations and other memory usage
    base_memory = num_parameters_b * 2  # GB for fp16
    total_memory = base_memory * 1.2  # Add overhead
    return round(total_memory, 1)

def extract_model_size(model_name):
    """Extract model size from model name (e.g., '7B', '13B', '20B')"""
    size_match = re.search(r'(\d+(?:\.\d+)?)\s*[Bb]', model_name)
    if size_match:
        return float(size_match.group(1))
    return None

def get_color_for_model(model_vram_gb, available_vram_gb):
    """Determine color code based on VRAM requirements"""
    if model_vram_gb is None:
        return "white"  # Unknown size
    
    if model_vram_gb <= available_vram_gb:
        return "green"
    elif model_vram_gb <= available_vram_gb * 1.5:
        return "yellow"
    else:
        return "red"

def get_popular_text_generation_models():
    """Get a curated list of popular text generation models"""
    popular_models = [
        # GPT models
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
        
        # Llama models
        "meta-llama/Llama-3.2-1B",
        "meta-llama/Llama-3.2-3B", 
        "meta-llama/Llama-3.1-8B",
        "meta-llama/Llama-3.1-70B",
        
        # Mistral models
        "mistralai/Mistral-7B-v0.1",
        "mistralai/Mixtral-8x7B-v0.1",
        "mistralai/Mistral-Nemo-Base-2407",
        
        # Code-specific models
        "microsoft/DialoGPT-medium",
        "microsoft/CodeBERT-base",
        "Salesforce/codegen-350M-mono",
        "Salesforce/codegen-2B-mono",
        "Salesforce/codegen-6B-mono",
        "bigcode/starcoder2-3b",
        "bigcode/starcoder2-7b",
        "bigcode/starcoder2-15b",
        
        # Other popular models
        "google/flan-t5-small",
        "google/flan-t5-base", 
        "google/flan-t5-large",
        "google/flan-t5-xl",
        "google/flan-t5-xxl",
        "EleutherAI/gpt-j-6B",
        "EleutherAI/gpt-neox-20b",
        "tiiuae/falcon-7b",
        "tiiuae/falcon-40b",
    ]
    
    return popular_models

def main():
    try:
        available_vram = get_available_vram()
        models_info = []
        
        # Get popular models
        model_names = get_popular_text_generation_models()
        
        print(f"Scanning {len(model_names)} popular models...", file=sys.stderr)
        
        for i, model_name in enumerate(model_names):
            try:
                print(f"Checking {model_name} ({i+1}/{len(model_names)})...", file=sys.stderr)
                
                # Try to get model config to extract size info
                try:
                    config = AutoConfig.from_pretrained(model_name, trust_remote_code=True)
                    # Extract parameter count from config if available
                    num_params = getattr(config, 'num_parameters', None)
                    if num_params:
                        model_size_b = num_params / 1e9  # Convert to billions
                    else:
                        # Fall back to extracting from name
                        model_size_b = extract_model_size(model_name)
                except Exception:
                    model_size_b = extract_model_size(model_name)
                
                # Estimate VRAM requirements
                vram_gb = estimate_model_vram_gb(model_size_b) if model_size_b else None
                
                # Determine color
                color = get_color_for_model(vram_gb, available_vram)
                
                model_info = {
                    "name": model_name,
                    "size_b": model_size_b,
                    "vram_gb": vram_gb,
                    "color": color,
                    "available": True  # Assume available if we can access config
                }
                
                models_info.append(model_info)
                
            except Exception as e:
                print(f"Warning: Could not access {model_name}: {e}", file=sys.stderr)
                # Still add it to the list but mark as potentially unavailable
                model_size_b = extract_model_size(model_name)
                vram_gb = estimate_model_vram_gb(model_size_b) if model_size_b else None
                color = get_color_for_model(vram_gb, available_vram)
                
                model_info = {
                    "name": model_name,
                    "size_b": model_size_b,
                    "vram_gb": vram_gb,
                    "color": color,
                    "available": False
                }
                models_info.append(model_info)
        
        # Sort by size (smallest first, unknowns at end)
        models_info.sort(key=lambda x: (x['size_b'] is None, x['size_b'] or 0))
        
        # Output results
        result = {
            "available_vram_gb": available_vram,
            "models": models_info
        }
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "available_vram_gb": 0,
            "models": []
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()