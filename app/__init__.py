from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    db.init_app(app)
    migrate.init_app(app, db)
    
    with app.app_context():
        # Import models so that the table definitions are registered with SQLAlchemy
        from app import models  
        # Create all tables if they don't exist
        db.create_all()
    
    from app.routes import main as main_blueprint
    app.register_blueprint(main_blueprint)
    
    from app.api import api_bp
    app.register_blueprint(api_bp)
    
    return app
