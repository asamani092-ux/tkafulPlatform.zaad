from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "role",
            "name",
            "phone",
            "city",
            "gender",
            "age",
            "qualification",
            "skills",
            "available_days",
            "created_at",
        ]


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "username", "profile"]


class RegisterSerializer(serializers.Serializer):
    """
    Serializer for user registration - matches frontend payload exactly
    """
    # User fields
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    
    # Profile fields - matching frontend exactly
    name = serializers.CharField(required=True, max_length=150)
    gender = serializers.ChoiceField(choices=["ذكر", "أنثى"], required=True)
    age = serializers.IntegerField(required=True, min_value=18, max_value=65)
    city = serializers.CharField(required=True, max_length=100)
    phone = serializers.CharField(required=True, max_length=30)
    qualification = serializers.CharField(required=True, max_length=100)
    available_days = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    skills = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )

    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("البريد الإلكتروني مسجل مسبقاً")
        return value.lower()

    def validate_phone(self, value):
        """Validate Saudi phone number format"""
        # Remove any non-digits
        digits = ''.join(filter(str.isdigit, value))
        
        # Must be 9 digits starting with 5
        if len(digits) != 9 or not digits.startswith('5'):
            raise serializers.ValidationError("رقم الجوال يجب أن يبدأ بـ 5 ويحتوي على 9 أرقام")
        
        return digits

    def create(self, validated_data):
        """Create user and associated profile"""
        # Extract profile data
        profile_data = {
            'name': validated_data.pop('name'),
            'gender': validated_data.pop('gender'),
            'age': validated_data.pop('age'),
            'city': validated_data.pop('city'),
            'phone': validated_data.pop('phone'),
            'qualification': validated_data.pop('qualification'),
            'available_days': validated_data.pop('available_days', []),
            'skills': validated_data.pop('skills', []),
        }
        
        # Create user (username = email for simplicity)
        email = validated_data['email']
        user = User.objects.create_user(
            username=email,  # Use email as username
            email=email,
            password=validated_data['password']
        )
        
        # Update the auto-created profile (from signals.py)
        profile = user.profile
        for key, value in profile_data.items():
            setattr(profile, key, value)
        profile.save()

        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that allows login with email instead of username
    Frontend sends email as 'username' field, this serializer handles the conversion
    """
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        # Get the credentials (frontend sends email as 'username')
        credentials = {
            'username': attrs.get('username'),
            'password': attrs.get('password')
        }

        # Try to find user by email
        username_or_email = credentials.get('username')
        if username_or_email and '@' in username_or_email:
            try:
                user = User.objects.get(email=username_or_email)
                # Replace email with actual username
                credentials['username'] = user.username
                attrs['username'] = user.username
            except User.DoesNotExist:
                pass

        return super().validate(attrs)