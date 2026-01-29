
import os
from dotenv import load_dotenv
load_dotenv()
from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # Check proper environment
    if os.environ.get("FLASK_ENV") == "development":
        app.run(host="0.0.0.0", port=port, debug=True)
    else:
        # Default for local run if no env set is dev usually, but let's stick to safe defaults
        app.run(host="0.0.0.0", port=port, debug=False)
