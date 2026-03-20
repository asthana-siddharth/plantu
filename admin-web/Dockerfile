FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_ADMIN_API_URL=http://127.0.0.1:5001
ARG VITE_ADMIN_TOKEN=admin123
ENV VITE_ADMIN_API_URL=${VITE_ADMIN_API_URL}
ENV VITE_ADMIN_TOKEN=${VITE_ADMIN_TOKEN}

RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
