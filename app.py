import os
from flask import Flask, render_template, request

app = Flask(__name__)

@app.route("/")
def index():
    message = request.args.get("message", "HAPPY BIRTHDAY! to You")
    theme = request.args.get("theme", "neon")
    return render_template("index.html", message=message, theme=theme)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
