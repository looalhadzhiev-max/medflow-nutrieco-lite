# MedFlow NutriEco Lite

## 1. Project Overview

**MedFlow NutriEco Lite** is a multi-page web application developed as a university course project.

The system supports nutritionists and administrators in managing patients, tracking health indicators (BMI and WHtR), and storing laboratory results securely.

The project demonstrates:

- Multi-Page Application (MPA) architecture (non-SPA)
- Authentication and role-based authorization
- Relational database design
- File storage integration
- Responsive user interface
- Production deployment

---

## 2. System Objectives

The main objectives of the system are:

1. Provide secure user authentication.
2. Implement role-based access control.
3. Allow structured management of patients and health data.
4. Automatically compute health indices (BMI and WHtR).
5. Enable secure storage of laboratory files.
6. Ensure responsive design across devices.
7. Deploy a working production version.

---

## 3. User Roles and Permissions

The system defines two roles:

### 3.1 Administrator
- Can view all users.
- Can view and manage all patients.
- Can reassign patients between users.
- Has access to the admin panel.
- Can view global dashboard statistics.

### 3.2 Standard User (Nutritionist)
- Can manage only assigned patients.
- Can create and update patient records.
- Can add health measurements.
- Can upload laboratory files.
- Can view dashboard statistics limited to their own patients.

Authorization is enforced through Supabase Row Level Security (RLS) policies.

---

## 4. Application Structure (Multi-Page Architecture)

The application follows a **Multi-Page Application (MPA)** architecture.

Each screen is implemented as a separate HTML file:

- `index.html` – Home page
- `login.html` – User authentication
- `register.html` – User registration
- `dashboard.html` – Statistics overview
- `patients.html` – Patient list
- `patient-details.html` – Individual patient profile
- `admin.html` – User management

Navigation is handled via standard HTTP page transitions (no SPA routing).

Shared layout components (navigation bar, structure, branding) are dynamically rendered using JavaScript modules.

---

## 5. Core Functionalities

### 5.1 Authentication
- Email and password login
- Secure session management
- JWT-based authentication (Supabase Auth)

### 5.2 Patient Management
- Create new patient records
- Store contact information and notes
- Assign patients to specific users
- Restrict visibility based on role

### 5.3 Health Measurements

Users can record:

- Weight (kg)
- Height (cm)
- Waist circumference (cm)

The system automatically calculates:

**BMI (Body Mass Index)**  
BMI = weight / (height in meters²)

**BMI category classification**

**WHtR (Waist-to-Height Ratio)**  
WHtR = waist / height

The dashboard visualizes:

- Total patients
- Total measurements
- Total uploaded files
- BMI distribution
- WHtR risk levels
- Recent activity

---

## 6. File Management

- Upload laboratory results (PDF / image formats)
- Store file metadata in the database
- Store actual files in Supabase Storage
- Restrict access using Row Level Security policies

---

## 7. Database Design

The system uses PostgreSQL via Supabase.

### Main Tables

- `profiles`
- `patients`
- `patient_measurements`
- `patient_files`

### Relationships

- One user → many patients
- One patient → many measurements
- One patient → many files

Row Level Security ensures that:
- Standard users access only their own patients.
- Administrators can access all data.

---

## 8. Technology Stack

### Frontend
- HTML5
- CSS3
- Bootstrap 5
- Bootstrap Icons
- Vanilla JavaScript (ES Modules)
- Vite (Build tool)

### Backend & Services
- Supabase
  - PostgreSQL database
  - Authentication (JWT-based)
  - Row Level Security (RLS)
  - File Storage

### Hosting
- Netlify (Production deployment)

---

## 9. Security Implementation

- JWT-based authentication
- Role-based authorization
- Row Level Security policies
- Environment variables for API credentials
- Secure file access configuration

---

## 10. Responsive Design

The application is fully responsive.

Implemented using:

- Bootstrap grid system
- Mobile-first layout
- Adaptive navigation components

Tested for:
- Desktop
- Tablet
- Mobile devices

---

