from app import db
from datetime import datetime

class EventData(db.Model):
    __tablename__ = 'event_data'
    id = db.Column(db.Integer, primary_key=True)

    # Basic Event Info
    event_name = db.Column(db.String(200), nullable=False)
    venue_name = db.Column(db.String(200), nullable=False)
    operating_hours = db.Column(db.String(100), nullable=True)

    # Only two date fields for the event range
    event_date_from = db.Column(db.DateTime, nullable=True)
    event_date_to = db.Column(db.DateTime, nullable=True)

    # Sales / Product Info
    products_sold = db.Column(db.Text, nullable=True)  # JSON string
    sales_volume = db.Column(db.Float, nullable=True)
    price_per_unit = db.Column(db.Float, nullable=True)
    total_revenue = db.Column(db.Float, nullable=True)

    # Additional Fields with defaults
    sale_hour = db.Column(db.Integer, nullable=False, server_default='0')
    payment_method = db.Column(db.String(50), nullable=False, server_default="'Cash'")

    def __repr__(self):
        return f"<EventData {self.event_name} from {self.event_date_from} to {self.event_date_to}>"
