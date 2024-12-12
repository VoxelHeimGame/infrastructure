# VoxelHeim Infrastructure 🚀

This repository contains the infrastructure setup for the VoxelHeim MMORPG project, including configurations for development, Public Test Universe (PTU), and live environments.

---

## 📂 Project Structure

- **`docker/`**: Docker-related files for local development.
- **`kubernetes/`**: Kubernetes configurations for various environments.
- **`flyway/`**: Database migration scripts.
- **`scripts/`**: Utility scripts for setup, deployment, and data management.
- **`env/`**: Environment-specific configuration files.

---

## 🌍 Environment Setup

### 🛠️ Environment Files
We use distinct `.env` files for each stage:

- `.env.dev`: Development environment variables.
- `.env.ptu`: Public Test Universe environment variables.
- `.env.live`: Live (production) environment variables.

These files are located in the `env/` directory and are required by the setup and deployment scripts.

---

## 🚀 Setup and Deployment

### 🧑‍💻 Development

#### 🐋 Option 1: Using Docker Compose
```bash
npm run setup:dev
npm run deploy:dev
```

#### ☸️ Option 2: Using Minikube (local Kubernetes)
```bash
npm run setup:dev:k8s
npm run deploy:dev:k8s
```

### 🌌 PTU and Live Environments

#### 🌌 PTU Deployment
```bash
npm run setup:ptu
npm run deploy:ptu
```

#### 🔴 Live Deployment
```bash
npm run setup:live
npm run deploy:live
```

---

## 🗃️ Database Management

### 📄 Creating a Database Dump
To create a database dump:
```bash
pg_dump -U your_username -d your_database > dump_file.sql
```

### 🛡️ Anonymizing Data
To anonymize sensitive data:
```bash
npm run anonymize-db -- path/to/your/dump_file.sql
```
This creates a file with the `_anonymized` suffix.

### 📥 Importing Anonymized Data
To import the anonymized data:
```bash
psql -U your_username -d your_database < path/to/your/anonymized_dump_file.sql
```

---

## 📜 Flyway Database Migrations

Migration scripts are located in the `flyway/` directory, organized by service (auth, world, player, inventory).

To run migrations:
1. Set the appropriate environment variables.
2. Run the relevant setup or deploy script.

---

## 📊 Monitoring and Logging

For Kubernetes environments (PTU and Live), we use:

- **📈 Prometheus**: Metrics collection.
- **📊 Grafana**: Visualization.
- **📂 ELK Stack** (Elasticsearch, Logstash, Kibana): Log management.

Access is restricted and requires authentication.

---

## 🔒 Security Considerations

- Avoid committing sensitive information or environment files to the repository.
- Use environment variables for sensitive data.
- Rotate secrets and access keys regularly.
- Ensure proper access controls for all environments.

---

## 🛠️ Troubleshooting

1. Check the service logs.
2. Verify environment variables.
3. Ensure all required services are running.
4. Inspect Kubernetes events (for Kubernetes environments).

For unresolved issues, contact the infrastructure team.

---

## 📚 Examples

### 📝 `.env.dev` File
```plaintext
DB_HOST=localhost
DB_PORT=5432
DB_NAME=voxelheim_dev
DB_USER=dev_user
DB_PASSWORD=dev_password
AUTH_SECRET=dev_secret_key
API_URL=http://localhost:3000
```

### ⚙️ `kubernetes/dev/auth-service.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: auth-service:dev
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: dev-env
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: auth-service
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3001
```

