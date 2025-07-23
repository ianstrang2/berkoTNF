## SQL Query Handling
- **I am allowed to edit the project's official `.sql` files** located in the `/sql/` directory, as these are part of the main codebase you deploy.
- **I will NEVER create new, temporary, or exploratory `.sql` files.**
- For any one-off or diagnostic queries, I will **ALWAYS provide the SQL code in a markdown block** for you to run manually. I will not use tools to execute these.
- I will only use database tools for essential, pre-approved operations like migrations, and only when you have not specified that you handle them yourself.

## Database Operations
- **You will handle all database migrations** (e.g., `prisma migrate`). I will not attempt to run them.
- I will provide any necessary `ALTER TABLE` or other structural SQL statements in markdown blocks for you to execute.
- For diagnostic queries, you will execute the query and provide the results, which I will then use for analysis.
- I am permitted to call the database functions (RPCs) that are part of the application's intended functionality. 