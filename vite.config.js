import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        patients: resolve(__dirname, 'patients.html'),
        patientDetails: resolve(__dirname, 'patient-details.html'),
        admin: resolve(__dirname, 'admin.html'),
      }
    }
  }
})