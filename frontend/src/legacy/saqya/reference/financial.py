from src.models.user import db
from datetime import datetime

class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    tax_amount = db.Column(db.Float, default=0.0)
    total_amount = db.Column(db.Float, nullable=False)
    
    # حالة الفاتورة
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, paid
    
    # ملفات الفاتورة
    file_path = db.Column(db.String(500), nullable=True)  # مسار ملف الفاتورة
    file_name = db.Column(db.String(200), nullable=True)  # اسم الملف الأصلي
    
    # التواريخ
    issue_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime, nullable=True)
    paid_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # ملاحظات
    notes = db.Column(db.Text, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<Invoice {self.invoice_number} - {self.status}>'

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'invoice_number': self.invoice_number,
            'amount': self.amount,
            'tax_amount': self.tax_amount,
            'total_amount': self.total_amount,
            'status': self.status,
            'file_path': self.file_path,
            'file_name': self.file_name,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_date': self.paid_date.isoformat() if self.paid_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'notes': self.notes,
            'rejection_reason': self.rejection_reason
        }

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    sponsorship_id = db.Column(db.Integer, db.ForeignKey('sponsorships.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String(50), nullable=False)  # credit_card, bank_transfer, cash, online
    
    # معلومات الدفع
    transaction_id = db.Column(db.String(100), unique=True, nullable=True)  # معرف المعاملة من بوابة الدفع
    reference_number = db.Column(db.String(100), nullable=True)  # رقم مرجعي
    
    # حالة الدفع
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed, refunded
    
    # التواريخ
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # ملاحظات
    notes = db.Column(db.Text, nullable=True)
    failure_reason = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<Payment {self.id} - {self.amount} - {self.status}>'

    def to_dict(self):
        return {
            'id': self.id,
            'sponsorship_id': self.sponsorship_id,
            'amount': self.amount,
            'method': self.method,
            'transaction_id': self.transaction_id,
            'reference_number': self.reference_number,
            'status': self.status,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'notes': self.notes,
            'failure_reason': self.failure_reason
        }

class Documentation(db.Model):
    __tablename__ = 'documentation'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # photo, video, document, receipt
    title = db.Column(db.String(200), nullable=True)
    description = db.Column(db.Text, nullable=True)
    
    # معلومات الملف
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(200), nullable=False)
    file_size = db.Column(db.Integer, nullable=True)  # حجم الملف بالبايت
    mime_type = db.Column(db.String(100), nullable=True)
    
    # معلومات الموقع (للصور والفيديوهات الميدانية)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    location_name = db.Column(db.String(200), nullable=True)
    
    # معلومات الرفع
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    uploader = db.relationship('User', backref='uploaded_documents')

    def __repr__(self):
        return f'<Documentation {self.id} - {self.type} - {self.file_name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'type': self.type,
            'title': self.title,
            'description': self.description,
            'file_path': self.file_path,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'location_name': self.location_name,
            'uploaded_by': self.uploaded_by,
            'uploader_name': self.uploader.name if self.uploader else None,
            'upload_date': self.upload_date.isoformat() if self.upload_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

