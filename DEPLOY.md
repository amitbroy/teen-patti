# 🚀 Deploy Teen Patti to GitHub Pages

Follow these steps exactly — it takes about 5 minutes.

---

## Step 1 — Firebase Console (do this first)

You need two things enabled in your Firebase project.

### 1a. Enable Anonymous Auth
1. Go to https://console.firebase.google.com
2. Select your project **couple-calendar-20e17**
3. Left sidebar → **Authentication** → **Sign-in method**
4. Click **Anonymous** → toggle **Enable** → Save

### 1b. Set Realtime Database Rules
1. Left sidebar → **Realtime Database** → **Rules** tab
2. Replace everything with this and click **Publish**:

```json
{
  "rules": {
    "tp_users": {
      "$username": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "tp_rooms": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### 1c. Add your GitHub Pages domain to Firebase Auth
1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain**
3. Add: `{your-github-username}.github.io`

---

## Step 2 — Create GitHub Repository

1. Go to https://github.com/new
2. Name it something like `teen-patti`
3. Set to **Public** (required for free GitHub Pages)
4. **Don't** tick "Add README" — leave it empty
5. Click **Create repository**

---

## Step 3 — Push the code

Open a terminal in the project folder and run:

```bash
git init
git add .
git commit -m "Initial commit — Teen Patti"
git branch -M main
git remote add origin https://github.com/{YOUR_USERNAME}/{YOUR_REPO}.git
git push -u origin main
```

Replace `{YOUR_USERNAME}` and `{YOUR_REPO}` with your actual values.

---

## Step 4 — Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** (top tab)
3. Left sidebar → **Pages**
4. Under **Source** → select **GitHub Actions**
5. Done — the workflow runs automatically on every push

---

## Step 5 — Wait ~60 seconds

1. Go to the **Actions** tab in your GitHub repo
2. You'll see a workflow called **Deploy to GitHub Pages** running
3. Once it's green ✅, your URL is live at:

```
https://{your-github-username}.github.io/{your-repo-name}/
```

Share this URL with friends — they can register and play immediately!

---

## Making changes later

Edit any file, then:

```bash
git add .
git commit -m "your change description"
git push
```

GitHub Actions auto-deploys within ~30 seconds.

---

## Troubleshooting

**Blank page / console errors about Firebase:**
- Make sure Anonymous Auth is enabled (Step 1a)
- Make sure your domain is in Firebase authorized domains (Step 1c)

**"Permission denied" Firebase errors:**
- Check the Realtime Database rules are published (Step 1b)

**Game starts but players can't see each other:**
- This is normal if you're testing with one browser — open a second browser window (or incognito) and join with a different account
