# Purple Fix

**Purple Fix** is a streamlined mobile-first application designed for Northwestern University students to simplify the process of reporting campus facility maintenance issues. By replacing fragmented reporting systems with a direct, media-rich workflow, it ensures that campus repairs are handled efficiently.

---

## 📋 Table of Contents
* [Overview](#overview)
* [Features](#features)
* [System Architecture](#system-architecture)
* [Tech Stack](#tech-stack)
* [Future Roadmap](#future-roadmap)
* [Getting Started](#getting-started)

---

## 📖 Overview
The current facility reporting flow at Northwestern is often complex and hard to navigate, leaving many issues unreported. **Purple Fix** provides a unified interface for students to capture photos, pinpoint locations, and describe maintenance needs (via voice or text) in seconds.

## ✨ Features
* **📷 Instant Media Capture:** Snap a live photo of the issue or upload an existing image from your library.
* **📍 Automatic Geolocation:** Uses device GPS to automatically fetch and attach the precise location of the maintenance report.
* **🎙️ Voice-to-Text Integration:** Describe the issue quickly using voice typing or traditional text input.
* **📊 Status Tracking:** View a personalized dashboard to track the progress of your submitted reports in real-time.

## 🛠️ Tech Stack
* **Frontend:** Deployed via **Azure Static Web Apps**.
* **Database:** **Supabase (PostgreSQL)** for managing issue records and metadata.
* **Storage:** **Supabase Storage Buckets** for secure hosting of report images.

## 🏗️ Future Roadmap
* **Indoor Positioning:** Implementing floor estimation and specific facility mapping (e.g., identifying specific bathrooms or cafeterias in multi-use buildings).
* **AI Diagnostics:** Integration of a **CNN (Convolutional Neural Network)** to automatically categorize issues and suggest descriptions based on the uploaded photo.

---

## How to Access:
Easiest to access via mobile or via any web browser at:

[PurpleFix](https://yellow-moss-0fd27dd10.6.azurestaticapps.net/)

---

## 🤝 Contributing
Contributions are welcome! If you're a student or developer looking to improve campus infrastructure, feel free to fork this repo and submit a pull request.

