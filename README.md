# Takaful Platform

A full-stack web application for community solidarity and social impact initiatives.

## Project Structure

```
takaful-platform/
├── frontend/          # React + Vite + TypeScript + Tailwind CSS
├── backend/           # Django backend (to be implemented)
├── .gitignore
└── README.md
```

## Frontend Setup

The frontend is built with React, Vite, TypeScript, and Tailwind CSS.

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation & Running

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit: `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Features

- **Arabic RTL Support** - Full right-to-left layout support
- **Responsive Design** - Mobile-first responsive design
- **Modern UI Components** - Reusable component library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework

### Pages

- **Home** (`/`) - Landing page with platform overview
- **Projects** (`/projects`) - Browse available projects
- **Services** (`/services`) - Available services and programs
- **Volunteers** (`/volunteers`) - Volunteer opportunities
- **About** (`/about`) - About the platform
- **Suggest** (`/suggest`) - Submit new initiative suggestions
- **Sign In** (`/signin`) - User authentication
- **Sign Up** (`/signup`) - User registration

## Backend Setup

The backend will be implemented with Django (currently empty).

### Prerequisites
- Python 3.8 or higher
- pip

### Installation & Running (when implemented)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run migrations:
   ```bash
   python manage.py migrate
   ```

5. Start the development server:
   ```bash
   python manage.py runserver
   ```

## Development

### Frontend Development

The frontend uses a clean, organized structure:

```
frontend/src/
├── components/
│   ├── forms/         # Form components
│   ├── layout/        # Layout components (Navbar, Footer)
│   ├── pages/         # Page components
│   └── ui/            # Reusable UI components
├── data/              # Mock data and constants
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
└── types/             # TypeScript type definitions
```

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling
- Maintain RTL support for Arabic content
- Keep components small and focused

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

