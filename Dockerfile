FROM node:lts-alpine as build
COPY . /ws
WORKDIR /ws
RUN npm ci
RUN npm run bundle

FROM node:lts-alpine
COPY --from=build /ws/dist /dist
EXPOSE 8000
CMD ["node", "/dist/server-bundle.js"]
