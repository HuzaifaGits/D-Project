import os, sys

# Always store the database file in the user's home directory
basedir = os.path.expanduser("~")

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "you-will-never-guess"
    # Use a fixed path in the user's home directory
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or "sqlite:///" + os.path.join(basedir, "sales.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
