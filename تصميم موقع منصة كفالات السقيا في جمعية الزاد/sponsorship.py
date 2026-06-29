from src.models.user import db
from datetime import datetime

class Sponsorship(db.Model):
    __tablename__ = 'sponsorships'
    
    id = db.Column(db.Integer, primary_key=True)
    donor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # نوع الكفالة (طعام، ملابس، أدوية، إلخ)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(200), nullable=True)  # الموقع المستهدف
    beneficiaries_count = db.Column(db.Integer, default=1)  # عدد المستفيدين
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, in_progress, completed, cancelled
    priority = db.Column(db.String(10), default='normal')  # urgent, high, normal, low
    target_date = db.Column(db.DateTime, nullable=True)  # التاريخ المستهدف للتنفيذ
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # ملاحظات إضافية
    admin_notes = db.Column(db.Text, nullable=True)  # ملاحظات المشرف
    rejection_reason = db.Column(db.Text, nullable=True)  # سبب الرفض إن وجد
    
    # العلاقات
    orders = db.relationship('Order', backref='sponsorship', lazy=True, cascade='all, delete-orphan')
    payments = db.relationship('Payment', backref='sponsorship', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Sponsorship {self.id} - {self.type} - {self.status}>'

    def to_dict(self):
        return {
            'id': self.id,
            'donor_id': self.donor_id,
            'donor_name': self.donor.name if self.donor else None,
            'amount': self.amount,
            'type': self.type,
            'description': self.description,
            'location': self.location,
            'beneficiaries_count': self.beneficiaries_count,
            'status': self.status,
            'priority': self.priority,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'admin_notes': self.admin_notes,
            'rejection_reason': self.rejection_reason
        }

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    sponsorship_id = db.Column(db.Integer, db.ForeignKey('sponsorships.id'), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    representative_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # تفاصيل الطلب
    items = db.Column(db.Text, nullable=True)  # قائمة المواد المطلوبة (JSON)
    estimated_cost = db.Column(db.Float, nullable=True)
    actual_cost = db.Column(db.Float, nullable=True)
    
    # حالة الطلب
    status = db.Column(db.String(20), default='pending')  # pending, assigned, preparing, ready, delivered, completed, cancelled
    
    # التواريخ المهمة
    assigned_at = db.Column(db.DateTime, nullable=True)  # تاريخ تكليف المورد
    preparation_started_at = db.Column(db.DateTime, nullable=True)  # بداية التحضير
    ready_at = db.Column(db.DateTime, nullable=True)  # جاهز للتسليم
    delivered_at = db.Column(db.DateTime, nullable=True)  # تم التسليم
    completed_at = db.Column(db.DateTime, nullable=True)  # اكتمال التنفيذ
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # ملاحظات
    supplier_notes = db.Column(db.Text, nullable=True)
    representative_notes = db.Column(db.Text, nullable=True)
    admin_notes = db.Column(db.Text, nullable=True)
    
    # العلاقات
    invoices = db.relationship('Invoice', backref='order', lazy=True, cascade='all, delete-orphan')
    documentation = db.relationship('Documentation', backref='order', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Order {self.id} - Sponsorship {self.sponsorship_id} - {self.status}>'

    def to_dict(self):
        return {
            'id': self.id,
            'sponsorship_id': self.sponsorship_id,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'representative_id': self.representative_id,
            'representative_name': self.representative.name if self.representative else None,
            'items': self.items,
            'estimated_cost': self.estimated_cost,
            'actual_cost': self.actual_cost,
            'status': self.status,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'preparation_started_at': self.preparation_started_at.isoformat() if self.preparation_started_at else None,
            'ready_at': self.ready_at.isoformat() if self.ready_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'supplier_notes': self.supplier_notes,
            'representative_notes': self.representative_notes,
            'admin_notes': self.admin_notes
        }

