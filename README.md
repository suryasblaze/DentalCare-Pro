# DentalCare Pro - Dental Practice Management System

A modern, full-featured dental practice management system built with React, Supabase, and TypeScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## Features

### 🏥 Practice Management
- Dashboard with key metrics and analytics
- Staff management and scheduling
- Clinic settings and configuration
- Real-time updates and notifications

### 👥 Patient Management
- Comprehensive patient profiles
- Medical history tracking
- Document management
- Digital consent forms
- Insurance information

### 📅 Appointment Scheduling
- Interactive calendar interface
- Multi-provider scheduling
- Appointment types and durations
- Real-time availability checking
- Automated reminders

### 🦷 Treatment Planning
- Visual treatment plan builder
- Cost estimation
- Treatment progress tracking
- Digital documentation
- AI-assisted treatment suggestions

### 💰 Financial Management
- Treatment cost tracking
- Insurance coverage calculation
- Payment processing
- Financial reporting

## Technology Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Shadcn/ui Components
- Lucide Icons
- React Router
- React Hook Form
- Zod Validation

### Backend
- Supabase
- PostgreSQL Database
- Row Level Security
- Real-time Subscriptions
- Edge Functions
- Storage for Files

### Development
- Vite
- ESLint
- PostCSS
- TypeScript
- Git

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dentalcare-pro.git
cd dentalcare-pro
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

### Database Setup

1. Connect to Supabase:
   - Click the "Connect to Supabase" button in the top right
   - Follow the authentication process

2. The application will automatically:
   - Create required tables
   - Set up relationships
   - Configure RLS policies
   - Create necessary indexes

## Project Structure

```
src/
├── components/         # Reusable UI components
│   └── ui/            # Base UI components
├── features/          # Feature-based modules
│   ├── appointments/
│   ├── patients/
│   ├── treatment-plans/
│   └── settings/
├── lib/              # Utilities and services
│   ├── hooks/        # Custom React hooks
│   ├── utils/        # Helper functions
│   └── api.ts        # API client
├── pages/            # Route pages
└── types/            # TypeScript definitions
```

## Features in Detail

### Patient Management
- Complete patient profiles
- Medical history tracking
- Document uploads
- Treatment history
- Appointment history
- Insurance information
- Emergency contacts

### Appointment System
- Real-time calendar
- Multiple views (day, week, month)
- Color-coded appointments
- Conflict prevention
- Quick scheduling
- Appointment reminders

### Treatment Plans
- Visual treatment builder
- Cost estimation
- Progress tracking
- Treatment notes
- AI-assisted planning
- Document attachments

### Staff Management
- Role-based access
- Schedule management
- Specialization tracking
- Performance monitoring

## Security Features

- Row Level Security (RLS)
- Secure authentication
- Data encryption
- HIPAA compliance considerations
- Audit trails
- Backup systems

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@dentalcarepro.com or open an issue in the repository.

## Acknowledgments

- [Supabase](https://supabase.io/) for the backend infrastructure
- [Shadcn/ui](https://ui.shadcn.com/) for the component library
- [Lucide](https://lucide.dev/) for the icons
- All contributors who have helped with the project