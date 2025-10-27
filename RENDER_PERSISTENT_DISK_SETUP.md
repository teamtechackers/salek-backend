# Render.com Persistent Disk Setup Guide

## Render.com par Images Ko Persistent Rakhne Ke Liye

### Problem
Render.com par by default filesystem ephemeral hota hai. Server restart ya redeploy hone par images aur files delete ho jati hain.

### Solution
Render Persistent Disk use karein jo server restarts aur deploys ke baad bhi images retain karta hai.

---

## Setup Steps:

### 1. Render Dashboard Mein Jayein
- https://dashboard.render.com par login karein
- Apni service (salek-backend-v1) select karein

### 2. Disks Tab Select Karein
- Service dashboard mein **"Disks"** tab par click karein
- Agar koi disk nahi hai, to "Add Disk" button click karein

### 3. Disk Add Karein
```
Mount Path: /opt/render/project/src/persistent_uploads
Size: 10 GB (ya apni need ke mutabiq)
```

### 4. Important Settings:
- ✅ **Mount Path:** `/opt/render/project/src/persistent_uploads`
- ✅ **Size:** Kam se kam 5-10 GB (images ke liye)
- ⚠️ **Note:** Agar aapki service multiple instances par scale hoti hai, to persistent disk work nahi karega

### 5. Deploy Karein
- Disk add hone ke baad Render automatically redeploy karega
- Redeploy complete hone ka wait karein

---

## Code Changes Already Done:

### ✅ `src/app.js` - Static File Serving
- Code automatically Render persistent disk ko detect karta hai
- Agar Render disk mounted hai, to `/opt/render/project/src/persistent_uploads` use karta hai
- Warna local `../persistent_uploads` use karta hai

### ✅ `src/middleware/upload_middleware.js` - File Uploads
- Profile images Render persistent disk par save hoti hain
- Server restart ke baad bhi images available rahengi

### ✅ `.gitignore` - Git Configuration
- Persistent uploads folder git se ignore ho raha hai

---

## Testing:

### 1. Check Logs:
Deploy ke baad logs check karein:
```
📁 Persistent uploads path: /opt/render/project/src/persistent_uploads
🌐 Running on Render: true
```

### 2. Test Image Upload:
- Profile image upload karein via API
- Check karein ke image save ho rahi hai

### 3. Test After Restart:
- Render service ko manually restart karein
- Image URL ko check karein - abhi bhi kaam karna chahiye

---

## Important Notes:

1. **Render Disk Size:**
   - Size increase kar sakte hain (decrease nahi)
   - Minimum 5 GB recommended for images

2. **Single Instance Only:**
   - Persistent disk sirf single instance par work karta hai
   - Multiple instances par persistent disk use nahi kar sakte

3. **Zero-Downtime Deploys:**
   - Persistent disk use karne se zero-downtime deploys disable ho jayenge
   - Har deploy par brief downtime hoga

4. **Backup:**
   - Recommended: Ek aur backup strategy bhi use karein
   - S3, Cloudinary, ya external storage consider karein

---

## Alternative Solutions:

Agar persistent disk use nahi karna chahte, to alternatives:

1. **AWS S3** - Cloud storage
2. **Cloudinary** - Image hosting service
3. **DigitalOcean Spaces** - S3-compatible storage
4. **Backblaze B2** - Cheap cloud storage

Yeh services external storage provide karti hain aur server restart se independent hoti hain.

---

## Troubleshooting:

### Images Hamesha Missing Ho Jaati Hain
- ✅ Persistent disk properly mounted hai verify karein
- ✅ Mount path correct hai check karein
- ✅ Service logs mein persistent disk path dikhana chahiye

### Upload Errors
- ✅ Disk permissions check karein
- ✅ Disk kaafi space hai verify karein
- ✅ Service logs mein errors check karein

### Disk Full Ho Gaya
- Dashboard se disk size increase karein
- Purani images delete karein

---

## Summary:

1. Render dashboard mein jakar persistent disk add karein
2. Mount path: `/opt/render/project/src/persistent_uploads`
3. Size: 10 GB
4. Wait for redeploy
5. Test image upload

**Code already updated hai** - sirf Render dashboard se disk add karna hai!

