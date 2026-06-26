from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserSerializer, RegisterSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """
    Register a new user
    POST /api/accounts/auth/register/
    
    Expected payload (from frontend):
    {
        "email": "user@example.com",
        "password": "strongpass123",
        "name": "Full Name",
        "gender": "ذكر" or "أنثى",
        "age": 25,
        "city": "Riyadh",
        "phone": "512345678",
        "qualification": "bachelor",
        "available_days": ["الأحد", "الاثنين"],
        "skills": ["skill1", "skill2"]
    }
    
    Response:
    {
        "message": "تم إنشاء الحساب بنجاح",
        "user": {
            "id": 1,
            "email": "user@example.com",
            "username": "user@example.com",
            "profile": {...}
        },
        "access": "jwt_access_token",
        "refresh": "jwt_refresh_token"
    }
    """
    # Debug: Log received data
    print(f"DEBUG - Registration age received: {request.data.get('age')}, type: {type(request.data.get('age'))}")

    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        print(f"DEBUG - After validation, age: {serializer.validated_data.get('age')}")
        user = serializer.save()
        print(f"DEBUG - After save, profile age: {user.profile.age}")

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        # Return user data + tokens
        user_serializer = UserSerializer(user)
        
        return Response({
            "message": "تم إنشاء الحساب بنجاح",
            "user": user_serializer.data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Get current authenticated user data
    GET /api/accounts/me/
    
    Headers:
        Authorization: Bearer <access_token>
    
    Response:
    {
        "id": 1,
        "email": "user@example.com",
        "username": "user@example.com",
        "profile": {
            "role": "user",
            "name": "Full Name",
            "phone": "512345678",
            "city": "Riyadh",
            "gender": "ذكر",
            "age": 25,
            "qualification": "bachelor",
            "skills": ["skill1"],
            "available_days": ["الأحد"]
        }
    }
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    Update user profile
    PUT/PATCH /api/accounts/profile/
    
    Headers:
        Authorization: Bearer <access_token>
    
    Payload: Any profile fields to update
    {
        "name": "New Name",
        "city": "New City",
        "skills": ["new", "skills"]
    }
    """
    profile = request.user.profile
    
    # Update only provided fields
    for field in ['name', 'phone', 'city', 'gender', 'age', 'qualification', 'skills', 'available_days']:
        if field in request.data:
            setattr(profile, field, request.data[field])
    
    profile.save()
    
    serializer = UserSerializer(request.user)
    return Response({
        "message": "تم تحديث الملف الشخصي بنجاح",
        "user": serializer.data
    })