# Use the official Node.js 23.4.0 image as the base
FROM node:23.4.0

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json into the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files (including the src folder) into the container
COPY . .

# Expose the port your Node.js app will run on
EXPOSE 8000

# Command to run your server code (index.js)
CMD ["node", "index.js"]
