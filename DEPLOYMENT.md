# Deployment Guide

This guide explains how to deploy the Texas Hold'em Trainer web application to various hosting platforms.

## Prerequisites

- Node.js 20 or higher
- npm or yarn package manager
- Git repository (for automated deployments)

## Build the Application

Before deploying, you can test the production build locally:

```bash
# Activate nodeenv (if using)
.\nodeenv\Scripts\activate.bat  # Windows
source nodeenv/bin/activate     # Linux/Mac

# Build for production
npm run build:web

# Preview the production build
npm run preview
```

The build output will be in the `dist/` directory.

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel provides the easiest deployment experience with automatic builds and deployments.

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to link your project

4. For production deployment:
   ```bash
   vercel --prod
   ```

**Configuration**: The `vercel.json` file is already configured.

### Option 2: Netlify

Netlify offers similar features to Vercel with a great free tier.

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Deploy:
   ```bash
   netlify deploy
   ```

3. For production deployment:
   ```bash
   netlify deploy --prod
   ```

**Configuration**: The `netlify.toml` file is already configured.

### Option 3: GitHub Pages

Deploy directly from your GitHub repository.

1. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Add to `package.json`:
   ```json
   {
     "scripts": {
       "deploy": "npm run build:web && gh-pages -d dist"
     }
   }
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

### Option 4: AWS S3 + CloudFront

For AWS deployment with CDN:

1. Build the application:
   ```bash
   npm run build:web
   ```

2. Upload to S3:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name --delete
   ```

3. Invalidate CloudFront cache:
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```

### Option 5: Docker

Deploy using Docker containers:

1. Build Docker image:
   ```bash
   docker build -t texas-holdem-trainer .
   ```

2. Run container:
   ```bash
   docker run -p 3000:3000 texas-holdem-trainer
   ```

## Environment Variables

Currently, the application doesn't require environment variables. If you add any in the future:

- Create a `.env` file for local development
- Add environment variables in your hosting platform's dashboard
- Never commit `.env` files to version control

## Performance Optimization

The application is already optimized for production:

- ✅ Code splitting (React vendor, game engine chunks)
- ✅ Minification with Terser
- ✅ Tree shaking
- ✅ Console.log removal in production
- ✅ Gzip compression (handled by hosting platforms)

Total bundle size: ~60KB gzipped

## Custom Domain

To use a custom domain:

1. **Vercel**: Add domain in project settings
2. **Netlify**: Add domain in site settings
3. **AWS**: Configure Route 53 or your DNS provider

## Monitoring

Consider adding:

- Google Analytics for user tracking
- Sentry for error monitoring
- Lighthouse CI for performance monitoring

## Troubleshooting

### Build fails
- Ensure Node.js version is 20 or higher
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run build`

### Application doesn't load
- Check browser console for errors
- Verify all assets are loading correctly
- Check routing configuration for SPA

### Performance issues
- Run Lighthouse audit
- Check bundle size: `npm run build:web`
- Verify CDN is serving assets

## Support

For issues or questions, please open an issue on the GitHub repository.
