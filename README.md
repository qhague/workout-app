# IRON LOG

A mobile-friendly workout tracker with a Flask backend and a single-page frontend. Log sets, build templates, browse history on a calendar, and sync everything to your account.

## Features

- **User accounts** — Register and log in with hashed passwords
- **Live workouts** — Track sets with weight, reps, and/or time; built-in workout timer; resume an in-progress session after logout
- **Templates** — Save reusable workout plans and start from them with one tap
- **Exercise library** — Customize exercises and which fields each one tracks
- **Calendar** — See workout history by day
- **Progress charts** — Visualize trends over time (Chart.js)
- **Cloud sync** — Workout data syncs to SQLite on the server with debounced auto-save
- **CSV export** — Download workouts, templates, and your exercise library for Excel

## Tech stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Backend  | Python, Flask, Flask-SQLAlchemy     |
| Database | SQLite (`ironlog.db`)               |
| Frontend | Vanilla HTML/CSS/JS, Chart.js       |
| Auth     | Werkzeug password hashing           |

## Project structure

```
workout-app/
├── app.py              # Flask API and server
├── templates/
│   └── index.html      # Frontend SPA
├── ironlog.db          # SQLite database (created at runtime, gitignored)
└── version1/           # Earlier prototype
```

## Getting started

### Prerequisites

- Python 3.10+

### Install dependencies

```bash
pip install flask flask-cors flask-sqlalchemy
```

### Run locally

```bash
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser. Create an account on the login screen, then start logging workouts.

The database file `ironlog.db` is created automatically in the project root on first run.

## API endpoints

| Method | Route          | Description                                      |
| ------ | -------------- | ------------------------------------------------ |
| GET    | `/`            | Serve the frontend                               |
| POST   | `/register`    | Create a new user                                |
| POST   | `/login`       | Authenticate and load user data                  |
| POST   | `/sync_data`   | Save workouts, templates, exercises, active workout |
| POST   | `/export_data` | Download user data as CSV                        |

## Deployment

The frontend detects localhost vs production and adjusts API URLs accordingly. Deploy `app.py` and `templates/` to a Python host (e.g. PythonAnywhere), ensure dependencies are installed, and serve the app with your host's WSGI setup.

## License

Personal project — use and modify as you like.
