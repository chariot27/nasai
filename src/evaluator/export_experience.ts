import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportExperience() {
  const client = new Client({
    user: process.env.POSTGRES_USER || 'nasai_user',
    password: process.env.POSTGRES_PASSWORD || 'nasai_password',
    host: 'localhost',
    port: 5432,
    database: process.env.POSTGRES_DB || 'nasai_history'
  });

  try {
    await client.connect();
    console.log("Conectado ao PostgreSQL. Buscando Experience Buffer...");

    const result = await client.query('SELECT trajectory FROM experience_buffer');
    
    if (result.rowCount === 0) {
      console.log("Nenhuma experiência encontrada no buffer. Use o Nasai primeiro!");
      return;
    }

    const outputPath = path.resolve(__dirname, '../../../nasai-model-training/real_world_data.jsonl');
    const writeStream = fs.createWriteStream(outputPath, { flags: 'w' });

    for (const row of result.rows) {
      const trajectory = row.trajectory;
      // Convertendo para o formato do Unsloth SFTTrainer (exatamente como dataset_generator.py)
      const dataLine = {
        messages: trajectory
      };
      writeStream.write(JSON.stringify(dataLine) + '\n');
    }

    writeStream.end();
    console.log(`Sucesso: Exportados ${result.rowCount} casos reais de uso.`);
    console.log(`Salvo em: ${outputPath}`);
    console.log("Agora você pode rodar o train_unsloth.py incluindo este arquivo para aprendizado contínuo!");

  } catch (e) {
    console.error("Erro ao exportar:", e);
  } finally {
    await client.end();
  }
}

exportExperience();
