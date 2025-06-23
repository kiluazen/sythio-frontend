# Deployment Guide

## Vercel Deployment

This Vue.js frontend is configured for easy deployment on Vercel.

### Steps to Deploy:

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account
   - Click "New Project"
   - Import your repository: `https://github.com/kiluazen/sythio-frontend.git`

3. **Configure Environment Variables** in Vercel:
   - Go to your project settings
   - Add environment variables:
     ```
     VITE_API_BASE_URL=https://your-backend-api.com/api
     ```

4. **Deploy**:
   - Vercel will automatically detect it's a Vite project
   - The `vercel.json` configuration will handle routing for SPA
   - Build command: `npm run build`
   - Output directory: `dist`

### Environment Variables

- `VITE_API_BASE_URL`: The base URL for your backend API
  - Development: `http://localhost:8000/api`
  - Production: `https://your-backend-domain.com/api`

### Configuration Files

- `vercel.json`: Vercel deployment configuration
- `vite.config.ts`: Vite build configuration
- `package.json`: Build scripts and dependencies

### Production Checklist

- [ ] Backend API deployed and accessible
- [ ] CORS configured for your frontend domain
- [ ] Environment variables set in Vercel
- [ ] Build successful
- [ ] Routing works (SPA configuration)
- [ ] API calls working in production 