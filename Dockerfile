FROM node:14-alpine as build
WORKDIR /ws
COPY package.json package-lock.json /ws/
RUN npm ci && npm run ngcc
COPY . /ws
RUN npx copy-files-from-to --mode production
RUN npm run bundle

FROM node:14-alpine
COPY --from=build /ws/dist /dist
EXPOSE 8000
ENV DB_LOCATION=/tmp
CMD ["node", "/dist/server-bundle.js"]
