import json
import random

# Synthetic dataset generator for Nasai-Maestro-0.1 (ReAct Agent)
# This script generates conversational turns that teach the model how to use
# the File System and Shell tools in a secure, step-by-step manner.

SYSTEM_PROMPT = "You are nasai-maestro-0.1, an advanced AI coding assistant that operates within a terminal. You have access to tools to modify the file system and execute shell commands. Think step by step and use tools to accomplish the user's task."

def generate_edit_file_example():
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "Update the title in index.html to 'Nasai App'"},
            {"role": "assistant", "content": "I need to read index.html first to find the exact block to replace.", "tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "read_file", "arguments": "{\"path\": \"index.html\"}"}}]},
            {"role": "tool", "tool_call_id": "call_1", "name": "read_file", "content": "<!DOCTYPE html>\n<html>\n<head>\n  <title>Old App</title>\n</head>\n<body></body>\n</html>"},
            {"role": "assistant", "content": "I will now use the edit_file tool to replace the title.", "tool_calls": [{"id": "call_2", "type": "function", "function": {"name": "edit_file", "arguments": "{\"path\": \"index.html\", \"oldText\": \"<title>Old App</title>\", \"newText\": \"<title>Nasai App</title>\"}"}}]},
            {"role": "tool", "tool_call_id": "call_2", "name": "edit_file", "content": "Successfully updated file index.html."},
            {"role": "assistant", "content": "I have successfully updated the title in index.html to 'Nasai App'."}
        ]
    }

def generate_shell_example():
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "What files are in the current directory?"},
            {"role": "assistant", "content": "I will use the run_shell tool to list the directory contents.", "tool_calls": [{"id": "call_3", "type": "function", "function": {"name": "run_shell", "arguments": "{\"command\": \"ls -la\"}"}}]},
            {"role": "tool", "tool_call_id": "call_3", "name": "run_shell", "content": "total 12\ndrwxr-xr-x 2 user user 4096 Apr 18 10:00 .\n-rw-r--r-- 1 user user  120 Apr 18 10:00 package.json"},
            {"role": "assistant", "content": "The current directory contains the `package.json` file."}
        ]
    }

def generate_reflexion_example():
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "User Request: Replace 'old_func()' with 'new_func()' in main.ts\n\nTask Plan to Follow:\n1. Read main.ts\n2. Replace old_func()"},
            {"role": "assistant", "content": "I will edit the file based on my plan.", "tool_calls": [{"id": "call_4", "type": "function", "function": {"name": "edit_file", "arguments": "{\"path\": \"main.ts\", \"oldText\": \"old_func()\", \"newText\": \"new_func()\"}"}}]},
            {"role": "tool", "tool_call_id": "call_4", "name": "edit_file", "content": "Error: The oldText block was not found in main.ts."},
            {"role": "system", "content": "REFLEXION: The previous tool call failed with an error. Analyze the error carefully. Do not repeat the exact same tool call. Modify your parameters or try a different approach."},
            {"role": "assistant", "content": "The edit failed because I didn't verify the exact whitespace or context of 'old_func()' first. I should read the file before attempting an atomic replace.", "tool_calls": [{"id": "call_5", "type": "function", "function": {"name": "read_file", "arguments": "{\"path\": \"main.ts\"}"}}]},
            {"role": "tool", "tool_call_id": "call_5", "name": "read_file", "content": "function start() {\n  old_func(123);\n}"},
            {"role": "assistant", "content": "Now I see the exact context. I will perform the edit.", "tool_calls": [{"id": "call_6", "type": "function", "function": {"name": "edit_file", "arguments": "{\"path\": \"main.ts\", \"oldText\": \"  old_func(123);\", \"newText\": \"  new_func(123);\"}"}}]},
            {"role": "tool", "tool_call_id": "call_6", "name": "edit_file", "content": "Successfully updated file main.ts."},
            {"role": "assistant", "content": "I have corrected my mistake and successfully updated main.ts."}
        ]
    }

def generate_legacy_web_flaw_example():
    import random
    scenarios = [
        {"lang": "PHP", "flaw": "mysql_query($_GET['id'])", "desc": "Antigo SQLi baseado em concatenação", "fix": "PDO Prepared Statements"},
        {"lang": "Java/Struts", "flaw": "${#context['xwork.MethodAccessor.denyMethodExecution']=false}", "desc": "Injeção OGNL Histórica", "fix": "Atualização do Struts Core e sanitização de payload"},
        {"lang": "ASP VBScript", "flaw": "Server.CreateObject(\"WScript.Shell\").Exec(Request(\"cmd\"))", "desc": "RCE Legado", "fix": "Remoção do WScript.Shell e refatoração de infraestrutura"},
        {"lang": "Ruby", "flaw": "User.new(params[:user])", "desc": "Mass Assignment em Rails antigo", "fix": "Uso de Strong Parameters config"},
        {"lang": "Node.js", "flaw": "Object.assign(target, JSON.parse(req.body.data))", "desc": "Prototype Pollution moderno", "fix": "Deep Clone seguro ou Object.create(null)"}
    ]
    scenario = random.choice(scenarios)
    
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Auditoria de Segurança: Encontre a vulnerabilidade neste código {scenario['lang']}. Dica: {scenario['flaw']}"},
            {"role": "assistant", "content": "Vou ler o arquivo e identificar a falha histórica de segurança.", "tool_calls": [{"id": f"call_audit_{random.randint(100,999)}", "type": "function", "function": {"name": "read_file", "arguments": "{\"path\": \"legacy_app_file\"}"}}]},
            {"role": "tool", "tool_call_id": f"call_audit_{random.randint(100,999)}", "name": "read_file", "content": f"// Código legado contendo a falha\n{scenario['flaw']}"},
            {"role": "assistant", "content": f"A vulnerabilidade é {scenario['desc']}. Vou aplicar o patch: {scenario['fix']}.", "tool_calls": [{"id": f"call_patch_{random.randint(100,999)}", "type": "function", "function": {"name": "edit_file", "arguments": "{\"path\": \"legacy_app_file\", \"oldText\": \"...\", \"newText\": \"...\"}"}}]},
            {"role": "tool", "tool_call_id": f"call_patch_{random.randint(100,999)}", "name": "edit_file", "content": "Arquivo patcheado e vulnerabilidade mitigada."},
            {"role": "assistant", "content": f"Auditoria concluída. O 0-day/falha legada de {scenario['lang']} foi corrigido."}
        ]
    }

def main():
    dataset = []
    
    # Geração MASSIVA para forçar hiper-especialização em AppSec Poliglota / Falhas Web
    # Total ~2000 exemplos: 1500 Falhas Legadas/Poliglotas, 500 Reflexion (Hard)
    
    for _ in range(1500):
        dataset.append(generate_legacy_web_flaw_example())
        
    for _ in range(500):
        dataset.append(generate_reflexion_example()) # Hard Reflexion
        
    random.shuffle(dataset)
    
    with open("nasai_training_data.jsonl", "w", encoding="utf-8") as f:
        for item in dataset:
            f.write(json.dumps(item) + "\n")
            
    print(f"Generated {len(dataset)} examples in nasai_training_data.jsonl")

if __name__ == "__main__":
    main()
