#!/usr/bin/env python3
"""
GPT-OSS 20B Local Inference Script
Provides chat completions compatible with OpenAI API format
"""

import json
import sys
import argparse
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import warnings
warnings.filterwarnings("ignore")

class GPTOSSInference:
    def __init__(self, model_id="openai/gpt-oss-20b"):
        self.model_id = model_id
        self.pipe = None
        self.tokenizer = None
        self.current_model = None
        
    def ensure_model_loaded(self, model_id):
        """Load model only if it's different from current model"""
        if self.current_model != model_id:
            self.load_model(model_id)
            self.current_model = model_id
    
    def load_model(self, model_id=None):
        """Load the specified model and tokenizer"""
        if model_id is None:
            model_id = self.model_id
        
        try:
            print(f"Loading {model_id}...", file=sys.stderr)
            
            # Load with pipeline for simplicity
            self.pipe = pipeline(
                "text-generation",
                model=model_id,
                torch_dtype="auto",
                device_map="auto",
                trust_remote_code=True
            )
            
            # Load tokenizer separately for token counting
            self.tokenizer = AutoTokenizer.from_pretrained(model_id)
            self.model_id = model_id
            
            print("Model loaded successfully!", file=sys.stderr)
            
        except Exception as e:
            print(f"Error loading model: {e}", file=sys.stderr)
            sys.exit(1)
    
    def generate_response(self, messages, max_tokens=8000, temperature=1.0, model=None):
        """Generate response using the loaded model"""
        try:
            # Ensure correct model is loaded
            if model:
                self.ensure_model_loaded(model)
            # Prepare the conversation
            conversation = []
            for msg in messages:
                if msg["role"] == "system":
                    conversation.append({"role": "system", "content": msg["content"]})
                elif msg["role"] == "user":
                    conversation.append({"role": "user", "content": msg["content"]})
                elif msg["role"] == "assistant":
                    conversation.append({"role": "assistant", "content": msg["content"]})
            
            # Generate response
            outputs = self.pipe(
                conversation,
                max_new_tokens=min(max_tokens, 4096),  # Limit to reasonable size
                temperature=temperature,
                do_sample=temperature > 0.0,
                pad_token_id=self.tokenizer.eos_token_id,
                return_full_text=False
            )
            
            # Extract the generated text
            response_text = outputs[0]["generated_text"]
            if isinstance(response_text, list):
                response_text = response_text[-1]["content"] if response_text else ""
            
            # Count tokens (approximate)
            input_tokens = len(self.tokenizer.encode(" ".join([m["content"] for m in messages])))
            output_tokens = len(self.tokenizer.encode(response_text))
            
            # Return in OpenAI API format
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": response_text
                    },
                    "finish_reason": "stop"
                }],
                "usage": {
                    "prompt_tokens": input_tokens,
                    "completion_tokens": output_tokens,
                    "total_tokens": input_tokens + output_tokens
                }
            }
            
        except Exception as e:
            print(f"Error generating response: {e}", file=sys.stderr)
            return {
                "error": str(e),
                "choices": [{
                    "message": {
                        "role": "assistant", 
                        "content": f"Error: {str(e)}"
                    },
                    "finish_reason": "error"
                }]
            }

def main():
    parser = argparse.ArgumentParser(description="GPT-OSS 20B Local Inference")
    parser.add_argument("--model", default="openai/gpt-oss-20b", help="Model ID")
    parser.add_argument("--input", help="JSON input file (stdin if not provided)")
    args = parser.parse_args()
    
    # Initialize inference engine
    inference = GPTOSSInference(args.model)
    
    try:
        # Read input
        if args.input:
            with open(args.input, 'r') as f:
                request_data = json.load(f)
        else:
            request_data = json.load(sys.stdin)
        
        # Extract parameters
        messages = request_data.get("messages", [])
        max_tokens = request_data.get("max_tokens", 8000)
        temperature = request_data.get("temperature", 1.0)
        model = request_data.get("model", None)
        
        # Generate response
        response = inference.generate_response(messages, max_tokens, temperature, model)
        
        # Output response
        print(json.dumps(response, indent=2))
        
    except Exception as e:
        error_response = {
            "error": str(e),
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": f"Error processing request: {str(e)}"
                },
                "finish_reason": "error"
            }]
        }
        print(json.dumps(error_response, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()