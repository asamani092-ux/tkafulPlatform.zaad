from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # admin, supplier, representative, donor
    status = db.Column(db.String(20), default='active')  # active, inactive, suspended
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    sponsorships = db.relationship('Sponsorship', backref='donor', lazy=True, foreign_keys='Sponsorship.donor_id')
    supplier_orders = db.relationship('Order', backref='supplier', lazy=True, foreign_keys='Order.supplier_id')
    representative_orders = db.relationship('Order', backref='representative', lazy=True, foreign_keys='Order.representative_id')

    def set_password(self, password):
        """تشفير كلمة المرور"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """التحقق من كلمة المرور"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.name} ({self.role})>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Supplier(db.Model):
    __tablename__ = 'suppliers'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    business_name = db.Column(db.String(200), nullable=False)
    specialization = db.Column(db.String(100), nullable=True)  # نوع التخصص (مواد غذائية، ملابس، إلخ)
    address = db.Column(db.Text, nullable=True)
    rating = db.Column(db.Float, default=0.0)
    total_orders = db.Column(db.Integer, default=0)
    completed_orders = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقة مع المستخدم
    user = db.relationship('User', backref='supplier_profile')

    def __repr__(self):
        return f'<Supplier {self.business_name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'business_name': self.business_name,
            'specialization': self.specialization,
            'address': self.address,
            'rating': self.rating,
            'total_orders': self.total_orders,
            'completed_orders': self.completed_orders,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Representative(db.Model):
    __tablename__ = 'representatives'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    area = db.Column(db.String(100), nullable=True)  # المنطقة المسؤول عنها
    active_orders = db.Column(db.Integer, default=0)
    total_completed = db.Column(db.Integer, default=0)
    rating = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقة مع المستخدم
    user = db.relationship('User', backref='representative_profile')

    def __repr__(self):
        return f'<Representative {self.user.name if self.user else "Unknown"}>'

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'area': self.area,
            'active_orders': self.active_orders,
            'total_completed': self.total_completed,
            'rating': self.rating,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

