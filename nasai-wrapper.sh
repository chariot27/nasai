#!/usr/bin/env bash
# Nasai Maestro 9.0 — wrapper global
# Este script garante que o nasai.ts rode com o runtime correto
# independentemente do diretório de trabalho atual.

# Resolve o diretório real do script (mesmo se for um symlink)
SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SOURCE" ]; do
  DIR=$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )
  SOURCE=$(readlink "$SOURCE")
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
NASAI_DIR=$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )

exec npx --prefix "$NASAI_DIR" tsx "$NASAI_DIR/nasai.ts" "$@"
