# GitHub Pages Deployment

This web app is configured to automatically deploy to GitHub Pages.

## Setup Instructions

### 1. Enable GitHub Pages

Go to your repository settings:

1. Navigate to **Settings** → **Pages**
2. Under **Source**, select:
   - Source: **GitHub Actions**
3. Save the settings

### 2. Automatic Deployment

The app will automatically deploy when:
- You push changes to the branch `claude/document-yellowsubtitles-codebase-01BrRWpnLC8BN3hRtZ1W6pDL`
- Changes are made to files in the `web-app/` directory
- Or manually trigger via Actions tab → "Deploy Web App to GitHub Pages" → Run workflow

### 3. Access Your App

After deployment completes (takes ~2-3 minutes), your app will be available at:

**URL**: `https://[your-username].github.io/VideoSubFinder/`

For this repository: `https://diaconuccalin.github.io/VideoSubFinder/`

## Build Process

The GitHub Action workflow does the following:

1. **Checkout code** - Gets the latest code from the branch
2. **Setup Node.js 18** - Installs Node.js runtime
3. **Install dependencies** - Runs `npm install` in the `web-app/` directory
4. **Build** - Runs `npm run build` to create optimized production bundle
5. **Deploy** - Uploads the `dist/` folder to GitHub Pages

## Monitoring Deployment

Check deployment status:
1. Go to **Actions** tab in your repository
2. Look for "Deploy Web App to GitHub Pages" workflow
3. Click on the latest run to see detailed logs

## Troubleshooting

### Deployment Failed

If the GitHub Action fails:
1. Check the Actions tab for error logs
2. Common issues:
   - Missing permissions (check repository settings)
   - Node/npm version mismatch
   - Build errors in the code

### App Not Loading

If the app shows a blank page:
1. Check browser console for errors
2. Verify the base path in `vite.config.ts` matches your repository name
3. Check that GitHub Pages is enabled in Settings

### Force Redeploy

To manually trigger a deployment:
1. Go to **Actions** tab
2. Click "Deploy Web App to GitHub Pages"
3. Click "Run workflow"
4. Select your branch
5. Click "Run workflow" button

## Local Testing

To test the production build locally:

```bash
cd web-app
npm install
npm run build
npm run preview
```

This will start a local server with the production build at http://localhost:4173
