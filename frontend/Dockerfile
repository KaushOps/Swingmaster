# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Inject API Route for Nginx reverse-proxy
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Build the app using Vite
RUN npm run build

# Stage 2: Serve the app using Nginx
FROM nginx:alpine

# Copy the custom Nginx templates and entrypoint
COPY nginx-http.tpl /etc/nginx/conf.d/nginx-http.tpl
COPY nginx-https.tpl /etc/nginx/conf.d/nginx-https.tpl
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# Make entrypoint executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy the built React app from the builder stage to Nginx's web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose ports
EXPOSE 80 443

# Start with our entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
