# Push to GitHub Instructions

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `teachpilot`
3. Description: "The Catherine Hudson Bespoke Revision Platform - Study & Exam Management App"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Push to GitHub

Run these commands in your terminal:

```bash
cd "c:\Users\steph\teachpilot master"
git remote add origin https://github.com/YOUR_USERNAME/teachpilot.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Alternative: Using GitHub CLI (if installed)

```bash
gh repo create teachpilot --public --source=. --remote=origin --push
```



