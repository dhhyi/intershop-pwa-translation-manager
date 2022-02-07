FROM node:16-alpine as npm_dev
WORKDIR /ws
COPY package.json package-lock.json /ws/
RUN npm i --ignore-scripts --production

FROM npm_dev as fe
RUN find node_modules -path '*/esbuild/install.js' | xargs -rt -n 1 node
RUN npm run ngcc
COPY src /ws/src
COPY angular.json .browserslistrc tsconfig.json tsconfig.app.json /ws/
RUN npm run copy-files -- --mode production
RUN npm run build:fe

FROM npm_dev as be
COPY server.mjs webpack.config.js /ws/
RUN npm run build:be

FROM node:16-alpine as npm_final
WORKDIR /ws
COPY package-lock.json npm-selective-install.js /ws/
RUN node npm-selective-install -g express

FROM node:16-alpine as final
ENV NODE_PATH=/usr/local/lib/node_modules
COPY --from=npm_final /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=be /ws/dist /dist
COPY --from=fe /ws/dist /dist
EXPOSE 8000
CMD ["node", "/dist/server-bundle.js"]
