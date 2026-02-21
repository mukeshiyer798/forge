# Stage 0, "build-stage", based on Node.js to build and compile the frontend
FROM node:20-alpine AS build-stage

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* /app/

RUN npm ci || npm install

COPY frontend /app/

ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 1, based on Nginx, to have only the compiled app, ready for production
FROM nginx:alpine

COPY --from=build-stage /app/dist/ /usr/share/nginx/html

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
