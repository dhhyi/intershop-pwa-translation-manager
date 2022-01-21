FROM node:14-alpine as build
WORKDIR /ws
COPY package.json package-lock.json /ws/
RUN npm ci --ignore-scripts
RUN find node_modules -path '*/esbuild/install.js' | xargs -rt -n 1 node
RUN npm run ngcc
COPY . /ws
RUN npx copy-files-from-to --mode production
RUN npm run bundle

FROM node:14-alpine
COPY --from=build /ws/dist /dist
EXPOSE 8000
ENV DB_LOCATION=/tmp
CMD ["node", "/dist/server-bundle.js"]
