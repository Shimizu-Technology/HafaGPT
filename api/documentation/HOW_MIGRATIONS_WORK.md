# 🗄️ How Migrations Work (Alembic)

> For developers familiar with Rails migrations who want to understand Alembic.

## ⚡ Quick Reference: Rails → Alembic

| Rails Command | Alembic Equivalent | What It Does |
|---------------|-------------------|--------------|
| `rails db:create` | (done in Neon/manually) | Create the database |
| `rails db:migrate` | `uv run alembic upgrade head` | Run all pending migrations |
| `rails db:rollback` | `uv run alembic downgrade -1` | Undo last migration |
| `rails g migration AddUsers` | `uv run alembic revision --autogenerate -m "add users"` | Generate a new migration |
| `rails db:migrate:status` | `uv run alembic current` | Check current migration version |
| `rails db:seed` | (no equivalent - write a script) | Seed data |

---

## How Alembic Differs from Rails

| Concept | Rails | Alembic |
|---------|-------|---------|
| **ORM** | ActiveRecord | SQLAlchemy |
| **Migration files** | `db/migrate/` | `alembic/versions/` |
| **Config** | `database.yml` | `alembic.ini` + `alembic/env.py` |
| **Models define schema?** | Yes (migrations generated from model changes) | Partial (uses `--autogenerate` flag) |
| **Migration naming** | Timestamp prefix | Random hash prefix |

---

## Common Tasks

### Run All Migrations

```bash
cd HafaGPT-API
uv run alembic upgrade head
```

This is like `rails db:migrate` - runs all pending migrations to get to the latest version.

### Check Current Status

```bash
uv run alembic current
```

Shows which migration you're currently on (like `rails db:migrate:status`).

### Rollback Last Migration

```bash
uv run alembic downgrade -1
```

Undo the most recent migration (like `rails db:rollback`).

### Rollback to Specific Version

```bash
uv run alembic downgrade abc123
```

Rollback to a specific migration (use the hash from the filename).

### Create a New Migration

```bash
# Auto-generate based on model changes (like Rails)
uv run alembic revision --autogenerate -m "add quiz_results table"

# Or create an empty migration to write manually
uv run alembic revision -m "add custom index"
```

---

## Migration File Structure

When you create a migration, Alembic creates a file in `alembic/versions/`:

```
alembic/versions/
├── abc123_add_users_table.py
├── def456_add_quiz_results.py
└── ghi789_add_game_scores.py
```

### Example Migration File

```python
# alembic/versions/abc123_add_users_table.py

"""add users table

Revision ID: abc123
Revises: (previous migration hash)
Create Date: 2025-01-15 10:30:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'abc123'
down_revision = 'previous_hash'  # Points to previous migration
branch_labels = None
depends_on = None


def upgrade():
    """Run the migration (like Rails' `change` or `up`)"""
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    """Undo the migration (like Rails' `down`)"""
    op.drop_table('users')
```

### Rails vs Alembic Syntax

| Operation | Rails | Alembic |
|-----------|-------|---------|
| Create table | `create_table :users` | `op.create_table('users', ...)` |
| Add column | `add_column :users, :name, :string` | `op.add_column('users', sa.Column('name', sa.String()))` |
| Remove column | `remove_column :users, :name` | `op.drop_column('users', 'name')` |
| Add index | `add_index :users, :email` | `op.create_index('ix_users_email', 'users', ['email'])` |
| Rename column | `rename_column :users, :old, :new` | `op.alter_column('users', 'old', new_column_name='new')` |

---

## Autogenerate Migrations

Alembic can auto-generate migrations by comparing your SQLAlchemy models to the database:

```bash
uv run alembic revision --autogenerate -m "add new column"
```

**How it works:**
1. Alembic reads your model definitions (in `api/models.py` or similar)
2. Compares them to the current database schema
3. Generates a migration with the differences

**⚠️ Always review auto-generated migrations!** Alembic sometimes:
- Misses certain changes (like column renames)
- Generates unnecessary operations
- Gets the order wrong

---

## Project Structure

```
HafaGPT-API/
├── alembic/
│   ├── env.py          # Configuration (reads DATABASE_URL)
│   ├── script.py.mako  # Template for new migrations
│   └── versions/       # Migration files live here
│       ├── abc123_initial.py
│       └── def456_add_quiz_results.py
├── alembic.ini         # Alembic config file
└── api/
    └── models.py       # SQLAlchemy models (optional)
```

---

## Tips for Rails Developers

### 1. No `db:create` - Database Created Separately

In Rails, `db:create` creates your database. With Alembic + Neon:
- **Neon:** Database created in the web dashboard
- **Local:** Use `createdb hafagpt_dev` (psql command)

### 2. No Built-in Seeding

Rails has `db:seed` and `seeds.rb`. Alembic doesn't have this. Options:
- Write a Python script: `scripts/seed_data.py`
- Use migrations for required data

### 3. Migrations Track via `alembic_version` Table

Instead of Rails' `schema_migrations` table, Alembic uses `alembic_version`:

```sql
SELECT * FROM alembic_version;
-- Returns: abc123 (current migration hash)
```

### 4. Run with `uv run`

Since we use `uv` for package management:

```bash
# Always prefix with uv run
uv run alembic upgrade head
uv run alembic downgrade -1
```

---

## Troubleshooting

### "Target database is not up to date"

Your database is behind. Run migrations:
```bash
uv run alembic upgrade head
```

### "Can't locate revision"

Migration file missing or hash mismatch. Check `alembic/versions/` folder.

### "FATAL: database does not exist"

Database not created. For local:
```bash
createdb hafagpt_dev
```

### Migration Failed Halfway

If a migration fails partway through:
1. Fix the issue manually in the database
2. Or rollback and fix the migration file
3. Then run again: `uv run alembic upgrade head`

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│  Alembic Quick Reference (for Rails devs)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Run migrations:     uv run alembic upgrade head            │
│  Rollback one:       uv run alembic downgrade -1            │
│  Check status:       uv run alembic current                 │
│  New migration:      uv run alembic revision --autogenerate │
│                      -m "description"                       │
│                                                             │
│  Files location:     alembic/versions/                      │
│  Config:             alembic.ini + alembic/env.py           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**That's it!** Alembic is like Rails migrations, just with different syntax. The concepts are the same: versioned database changes with up/down methods.
