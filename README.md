# Pizza-Delivery-Multitier-Webapp
pizza delivery multi tier application

# Pizza Delivery Application - Docker Setup

This is a simple 3-tier pizza delivery web application perfect for practicing Docker without Docker Compose.

## Architecture

- **Frontend**: Static HTML/CSS/JS served by Nginx
- **Backend**: Node.js Express API server
- **Database**: MySQL database

## Project Structure

```
Pizza-Delivery-Multitier-Webapp/
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── server.js
│   └── package.json
└── database/
    └── init.sql
```

## Setup Instructions

### 1. Create Project Directories
clone this repo


## Docker Commands

### 1. Create Docker Network

```bash
docker network create pizza-network
```

### 2. Build and Run Database

```bash
# Run MySQL container
docker run -d \
  --name pizza-db \
  --network pizza-network \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=pizza_delivery \
  -v $(pwd)/database/init.sql:/docker-entrypoint-initdb.d/init.sql \
  -p 3306:3306 \
  mysql:8.0

# Wait for database to initialize (about 30 seconds)
docker logs pizza-db
```

### 3. Build and Run Backend

```bash
cd backend

# Build backend image
docker build -t pizza-backend .

# Run backend container
docker run -d \
  --name pizza-api \
  --network pizza-network \
  -e DB_HOST=pizza-db \
  -e DB_USER=root \
  -e DB_PASSWORD=password \
  -e DB_NAME=pizza_delivery \
  -p 3000:3000 \
  pizza-backend

# Check if backend is running
docker logs pizza-api
```

### 4. Build and Run Frontend

```bash
cd ../frontend

# Build frontend image
docker build -t pizza-frontend .

# Run frontend container
docker run -d \
  --name pizza-web \
  --network pizza-network \
  -p 80:80 \
  pizza-frontend
```

## Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000/api/orders
- **Health Check**: http://localhost:3000/health

## Useful Docker Commands

### Container Management

```bash
# List running containers
docker ps

# Stop containers
docker stop pizza-web pizza-api pizza-db

# Start containers
docker start pizza-db pizza-api pizza-web

# Remove containers
docker rm pizza-web pizza-api pizza-db

# View logs
docker logs pizza-web
docker logs pizza-api
docker logs pizza-db
```

### Image Management

```bash
# List images
docker images

# Remove images
docker rmi pizza-frontend pizza-backend

# Build with no cache
docker build --no-cache -t pizza-backend .
```

### Network Management

```bash
# List networks
docker network ls

# Inspect network
docker network inspect pizza-network

# Remove network (stop containers first)
docker network rm pizza-network
```

### Database Access

```bash
# Connect to MySQL container
docker exec -it pizza-db mysql -u root -p

# Show databases
SHOW DATABASES;
USE pizza_delivery;
SHOW TABLES;
SELECT * FROM orders;
```

## Testing the Application

1. **Place an Order**: 
   - Open http://localhost in your browser
   - Add pizzas to cart
   - Fill in customer details
   - Place order

2. **View Orders**: 
   - Orders will appear in the "Your Orders" section
   - Check the backend API: `curl http://localhost:3000/api/orders`

3. **Update Order Status**:
   ```bash
   curl -X PATCH http://localhost:3000/api/orders/1/status \
     -H "Content-Type: application/json" \
     -d '{"status": "preparing"}'
   ```

## Troubleshooting

### Common Issues

1. **Frontend can't connect to backend**:
   - Check if all containers are on the same network
   - Verify backend is running: `docker logs pizza-api`

2. **Backend can't connect to database**:
   - Ensure database container is running first
   - Wait for MySQL to fully initialize
   - Check environment variables

3. **Port conflicts**:
   - Change port mappings if ports 80 or 3000 are in use
   - Example: `-p 8080:80` for frontend, `-p 3001:3000` for backend

4. **Database connection errors**:
   - Wait 30-60 seconds after starting MySQL container
   - Check MySQL logs: `docker logs pizza-db`

### Container Health Checks

```bash
# Check container status
docker ps

# Test backend health
curl http://localhost:3000/health

# Test database connection
docker exec pizza-db mysqladmin -u root -p ping
```

## Environment Variables

### Backend Environment Variables

- `DB_HOST`: Database hostname (default: localhost)
- `DB_USER`: Database username (default: root)
- `DB_PASSWORD`: Database password (default: password)
- `DB_NAME`: Database name (default: pizza_delivery)
- `DB_PORT`: Database port (default: 3306)
- `PORT`: API server port (default: 3000)

## Security Notes

- The MySQL root password is hardcoded for simplicity
- In production, use Docker secrets or environment files
- The backend runs as a non-root user for security
- Frontend includes basic security headers

## Next Steps for Learning

1. **Practice Docker concepts**:
   - Volume mounting for persistent data
   - Multi-stage builds
   - Health checks
   - Resource limits

2. **Extend the application**:
   - Add authentication
   - Implement real-time order tracking
   - Add admin panel for managing orders

3. **Production readiness**:
   - Use Docker secrets for passwords
   - Implement proper logging
   - Add monitoring and metrics
   - Set up automated backups
