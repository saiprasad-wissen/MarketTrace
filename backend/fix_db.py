import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()

async def alter():
    engine = create_async_engine(os.getenv("DATABASE_URL"))
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE investigations ADD COLUMN IF NOT EXISTS user_id VARCHAR;"))
        print("Column user_id added successfully.")

if __name__ == "__main__":
    asyncio.run(alter())
