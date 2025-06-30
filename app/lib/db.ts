import { sql as vercelSql } from '@vercel/postgres';

// Determiniamo la connection string una sola volta.
// L'operatore `??` (Nullish Coalescing) è perfetto per questo.
// Prova la variabile di Vercel, altrimenti usa quella locale.
const connectionString = process.env.DATABASE_POSTGRES_URL ?? process.env.POSTGRES_URL;

// Esportiamo la funzione `sql` ma con la connection string passata esplicitamente.
// La libreria @vercel/postgres è progettata per accettare questo override.
// Se la connection string non viene trovata, lanciamo un errore chiaro e immediato.
if (!connectionString) {
  throw new Error("La variabile d'ambiente per la connessione al database non è stata trovata (DATABASE_POSTGRES_URL o POSTGRES_URL).");
}

// Qui stiamo creando una nuova istanza del client sql che usa la nostra connection string
// Questo è un pattern più robusto rispetto a affidarsi alla ricerca implicita della variabile d'ambiente.
export const sql = vercelSql.bind({ connectionString });

// In alternativa, se il .bind non fosse supportato o non funzionasse come previsto,
// si potrebbe creare una funzione wrapper, ma il .bind è più pulito.
// Esempio di wrapper (non usare se il bind funziona):
// export function sql(strings: TemplateStringsArray, ...values: any[]) {
//   return vercelSql({ connectionString })(strings, ...values);
// }