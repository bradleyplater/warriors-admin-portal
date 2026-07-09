FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY lib ./lib
COPY seed ./seed
CMD ["npm", "run", "db:seed"]
