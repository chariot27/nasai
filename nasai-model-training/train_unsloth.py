from unsloth import FastLanguageModel
import torch
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# Configuration
model_name = "unsloth/Qwen2.5-Coder-32B-Instruct" # Base model (High Precision)
max_seq_length = 8192 # Increased sequence length for complex planning
dataset_path = "nasai_training_data.jsonl"

def format_chat_template(examples):
    # This function would apply the specific chat template (e.g., ChatML)
    # expected by Qwen/Llama for the 'messages' column in our jsonl.
    # For simplicity, we assume the trainer handles standard 'messages' formats.
    return examples

def main():
    print(f"Loading {model_name}...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name = model_name,
        max_seq_length = max_seq_length,
        dtype = None,
        load_in_4bit = True, # QLoRA setup for 12GB+ GPUs
    )

    # Add LoRA adapters
    model = FastLanguageModel.get_peft_model(
        model,
        r = 16, 
        target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha = 16,
        lora_dropout = 0,
        bias = "none",
        use_gradient_checkpointing = "unsloth",
    )

    print("Loading dataset...")
    dataset = load_dataset("json", data_files=dataset_path, split="train")

    trainer = SFTTrainer(
        model = model,
        tokenizer = tokenizer,
        train_dataset = dataset,
        dataset_text_field = "messages",
        max_seq_length = max_seq_length,
        dataset_num_proc = 2,
        packing = False, # Packing makes training faster for short sequences
        args = TrainingArguments(
            per_device_train_batch_size = 1, # Lowered to fit 32B in VRAM
            gradient_accumulation_steps = 8, # Increased to maintain effective batch size
            warmup_steps = 10,
            max_steps = 100,
            learning_rate = 2e-5, # Lower learning rate for 32B
            fp16 = not torch.cuda.is_bf16_supported(),
            bf16 = torch.cuda.is_bf16_supported(),
            logging_steps = 1,
            optim = "adamw_8bit",
            weight_decay = 0.01,
            lr_scheduler_type = "linear",
            seed = 3407,
            output_dir = "outputs",
        ),
    )

    print("Starting training...")
    trainer.train()

    print("Saving model adapters...")
    model.save_pretrained("nasai_lora_adapters")
    tokenizer.save_pretrained("nasai_lora_adapters")

if __name__ == "__main__":
    main()
