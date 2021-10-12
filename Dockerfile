FROM node:lts-alpine as build
WORKDIR /ws
COPY package.json package-lock.json /ws/
RUN npm ci
COPY . /ws
RUN npm run bundle

FROM node:lts-alpine
COPY --from=build /ws/dist /dist
EXPOSE 8000
CMD ["node", "/dist/server-bundle.js"]
