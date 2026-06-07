import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:abc123@localhost:5432/markettrace"
PROD_DATABASE_URL = "postgresql+asyncpg://postgres.eyusqygppncyqlxmikmh:50avvqFumAwPSMrb@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"

async def clean_and_migrate(url, name):
    engine = create_async_engine(url)
    async with engine.begin() as conn:
        try:
            print(f"Cleaning {name} database...")
            await conn.execute(text("TRUNCATE TABLE users, profiles, investigations, app_settings, token_usage CASCADE;"))
        except Exception as e:
            print(f"Truncate error on {name}:", e)
            
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id) NOT NULL;"))
        except Exception as e:
            print("Profiles alter:", e)
            
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id) NOT NULL;"))
        except Exception as e:
            print("Token_usage alter:", e)
            
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey CASCADE;"))
            await conn.execute(text("ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id) NOT NULL;"))
            await conn.execute(text("ALTER TABLE app_settings ADD PRIMARY KEY (user_id, key);"))
        except Exception as e:
            print("App_settings alter:", e)
            
    print(f"Successfully migrated {name} DB")

async def main():
    await clean_and_migrate(DATABASE_URL, "LOCAL")
    await clean_and_migrate(PROD_DATABASE_URL, "PROD")

if __name__ == "__main__":
    asyncio.run(main())
