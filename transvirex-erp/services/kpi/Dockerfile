FROM node:18-alpine

WORKDIR /app

# copier package.json
COPY package*.json ./

# installer dépendances
RUN npm install

# copier le code
COPY . .

# exposer port
EXPOSE 3007

# lancer serveur
CMD ["npm", "start"]