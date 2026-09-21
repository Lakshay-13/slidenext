FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN apk add --no-cache \
      ca-certificates \
      chromium \
      freetype \
      harfbuzz \
      nss \
      poppler-utils \
      ttf-freefont \
  && npm install --omit=dev

# Copy the rest of the application source code
COPY . .

# Expose port
EXPOSE 11004

# Run server
CMD [ "node", "server.js" ]
