from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # SightEngine
    sightengine_api_user: str = ""
    sightengine_api_secret: str = ""

    # LLM (Groq / OpenAI-compatible provider)
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_api_key: str = ""
    groq_api_key: str = ""
    llm_model_fast: str = "openai/gpt-oss-20b"
    llm_model_reasoning: str = "openai/gpt-oss-20b"
    openai_api_key: str = ""

    @property
    def effective_llm_api_key(self) -> str:
        return self.groq_api_key or self.llm_api_key or self.openai_api_key

    # Search
    tavily_api_key: str = ""

    # InsForge
    insforge_url: str = ""
    insforge_api_key: str = ""

    # App
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    debug: bool = True

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()