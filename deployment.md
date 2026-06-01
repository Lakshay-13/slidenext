# Cloud Deployment Strategy: Shared SlideNext & Editor

This document outlines the architecture for deploying the interactive SlideNext to the cloud, allowing users to upload, edit, view, and share presentations using unique web links.

## 1. Upload Format Standardization (Zip Package Approach)
To allow absolute layout flexibility, developers upload their presentation folders as a ZIP package. To make this process automatic and robust, the application enforces the following structure inside the ZIP:

```text
presentation.zip
├── index.html               # The entrypoint slide structure
├── presentation.json        # Metadata config (ID, Title, description, tags, icon)
├── app.js                   # Custom scripts, GSAP, canvas timelines
└── styles.css               # Presentation specific styles
```

### Metadata Configuration (`presentation.json`)
The uploader parses this file on the backend to register the presentation in the database:
```json
{
  "id": "neural-nets-presentation",
  "title": "Neural Networks Deep Dive",
  "subtitle": "Understanding multi-layer perceptrons",
  "description": "An interactive slide deck focusing on feedforward systems.",
  "icon": "psychology",
  "tags": ["AI", "Neural Networks", "Deep Learning"]
}
```

---

## 2. Cloud Architecture

### Frontend
*   **Framework**: Next.js or React.
*   **Routes**:
    *   `/`: Dashboard showing all shared presentations grouped by user/categories.
    *   `/view/:id`: Render page containing a full-screen iframe of the static presentation. The parent edit bar is hidden.
    *   `/edit/:id`: Render page with the iframe wrapper, plus a top toolbar containing Undo, Redo, Save, and Version History controls.

### Backend APIs
*   **Database**: PostgreSQL or MongoDB (to track uploads, presentation metadata, user accounts, and version histories).
*   **Object Storage**: AWS S3 or Google Cloud Storage.
*   **Endpoints**:
    *   `POST /api/upload`: Receives ZIP, extracts it, uploads the static files to an S3 bucket under a unique prefix (`s3://bucket/presentations/:id/`), and saves metadata to the DB.
    *   `GET /api/presentations`: Fetches a list of all presentations and their category structures.
    *   `POST /api/save`: Receives edited HTML from the editor, saves it as a new version object in S3, updates the current main `index.html` file in S3, and logs the change in the database version history table.

---

## 3. Sandboxing & Cross-Origin Editing in Cloud
Unlike the local Docker setup where everything runs on `localhost` (same-origin), in the cloud, loading user-uploaded HTML inside an iframe introduces security risks (like XSS).

*   **Solution**: Serve static presentations from a dedicated domain (e.g., `https://slides.myhub.com/presentations/:id/index.html`) while the editing dashboard runs on `https://app.myhub.com`.
*   **Communication**: Since direct DOM access is blocked across different domains, the parent editor sends commands (e.g., `ACTIVATE_EDIT_MODE`, `UNDO`, `REDO`, `GET_DOM_HTML`) to the iframe using the secure `window.postMessage` API. A lightweight client script is automatically injected into the uploaded presentations by the backend proxy during upload to listen to these messages and execute DOM operations.

---

## 4. DB Schema: Versioning & Rollback
To support undo/redo and save versions, the database stores changes in a history table:

```sql
CREATE TABLE presentation_versions (
    id SERIAL PRIMARY KEY,
    presentation_id VARCHAR(255) NOT NULL,
    version_number INT NOT NULL,
    s3_url VARCHAR(512) NOT NULL, -- Pointing to the index.html file version in S3
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);
```
To roll back, the backend simply copies the backup file at `s3_url` and overwrites the main `index.html` in S3.
