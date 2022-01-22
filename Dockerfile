FROM node:14-alpine as npm
WORKDIR /ws
COPY package.json package-lock.json /ws/
RUN npm i --ignore-scripts --production

FROM npm as fe
RUN find node_modules -path '*/esbuild/install.js' | xargs -rt -n 1 node
RUN npm run ngcc
COPY src /ws/src
COPY angular.json .browserslistrc tsconfig.json tsconfig.app.json /ws/
RUN npm run copy-files -- --mode production
RUN npm run build:fe

FROM npm as be
COPY server.mjs webpack.config.js /ws/
RUN npm run build:be

FROM node:14-alpine as final
COPY --from=be /ws/dist /dist
COPY --from=fe /ws/dist /dist
EXPOSE 8000
CMD ["node", "/dist/server-bundle.js"]
