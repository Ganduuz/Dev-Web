FROM node:18-alpine

WORKDIR /app

# installer dépendances
COPY package*.json ./
RUN npm install

# copier le code
COPY . .

EXPOSE 3006

CMD ["npm", "start"]