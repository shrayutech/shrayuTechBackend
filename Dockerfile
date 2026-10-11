# Base image
FROM node:22-alpine

ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Bundle app source (owned by the unprivileged user so the logger can write src/logs)
COPY --chown=node:node . .

# Run without root privileges
USER node

# Expose the API port
EXPOSE 5000

# Start the application
CMD [ "npm", "start" ]
